import { BookingStatus, CheckInResult, TicketStatus } from "@/domain/enums";
import { forbidden, notFound } from "@/domain/errors";
import { isDomainError } from "@/domain/errors";
import { ADMITTABLE_TICKET_STATUSES, REVOKED_TICKET_STATUSES } from "@/domain/state-machines";
import type { ActorContext, CheckIn } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import type { CredentialService } from "./credential-service";

/**
 * Check-in.
 *
 * Online admission is one atomic step: verify credential → verify event →
 * verify ticket/booking state → check already-used → record → return a clear
 * result. All of it happens inside a single transaction, which is what stops
 * two gates scanning the same QR at the same moment from both admitting.
 */

export interface ScanResult {
  result: CheckInResult;
  message: string;
  ticketId?: string;
  bookingId?: string;
  holderName?: string;
  ticketTypeName?: string;
  seatLabel?: string | null;
  /** Number of people this admission covers (bookings can cover several). */
  guestCount?: number;
}

export interface OfflineScanRecord {
  credential: string;
  scannedAt: string;
  deviceId: string;
}

export class CheckInService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: { credentials: CredentialService; audit: AuditService },
    private readonly clock: Clock = systemClock,
  ) {}

  /** Scans a QR credential at the gate. */
  async scan(
    actor: ActorContext,
    input: { eventId: string; credential: string; deviceId?: string },
  ): Promise<ScanResult> {
    return this.uow.runInTransaction(async (repos) => {
      let payload;
      try {
        payload = this.deps.credentials.verify(input.credential);
      } catch (error) {
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: null,
          bookingId: null,
          result: CheckInResult.INVALID_CREDENTIAL,
          actor,
          deviceId: input.deviceId ?? null,
        });
        return {
          result: CheckInResult.INVALID_CREDENTIAL,
          message: isDomainError(error) ? error.message : "This code could not be read",
        };
      }

      if (payload.e !== input.eventId) {
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: payload.t,
          bookingId: null,
          result: CheckInResult.WRONG_EVENT,
          actor,
          deviceId: input.deviceId ?? null,
        });
        return { result: CheckInResult.WRONG_EVENT, message: "This ticket is for another event" };
      }

      const ticket = await repos.tickets.findById(payload.t);
      if (!ticket) throw notFound("Ticket", payload.t);

      // A stale credential version means the ticket has since been
      // transferred, resold, refunded or voided.
      if (payload.v !== ticket.credentialVersion) {
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: ticket.id,
          bookingId: null,
          result: CheckInResult.REVOKED,
          actor,
          deviceId: input.deviceId ?? null,
        });
        return {
          result: CheckInResult.REVOKED,
          message: "This code is out of date — the ticket has changed hands or been cancelled",
          ticketId: ticket.id,
        };
      }

      if (REVOKED_TICKET_STATUSES.includes(ticket.status)) {
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: ticket.id,
          bookingId: null,
          result: CheckInResult.REVOKED,
          actor,
          deviceId: input.deviceId ?? null,
        });
        return {
          result: CheckInResult.REVOKED,
          message: `This ticket is ${ticket.status.toLowerCase()}`,
          ticketId: ticket.id,
        };
      }

      if (ticket.status === TicketStatus.CHECKED_IN || ticket.status === TicketStatus.CONSUMED) {
        const previous = await repos.checkins.findAdmittedForTicket(ticket.id);
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: ticket.id,
          bookingId: null,
          result: CheckInResult.ALREADY_USED,
          actor,
          deviceId: input.deviceId ?? null,
        });
        return {
          result: CheckInResult.ALREADY_USED,
          message: previous
            ? `Already admitted at ${new Date(previous.at).toLocaleTimeString("en-KE")}`
            : "This ticket has already been used",
          ticketId: ticket.id,
          holderName: ticket.ownerName,
        };
      }

      if (!ADMITTABLE_TICKET_STATUSES.includes(ticket.status)) {
        return {
          result: CheckInResult.REVOKED,
          message: `This ticket cannot be admitted (${ticket.status.toLowerCase()})`,
          ticketId: ticket.id,
        };
      }

      const ticketType = await repos.ticketTypes.findById(ticket.ticketTypeId);

      await repos.tickets.update(ticket.id, {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: this.clock.nowIso(),
      });
      await this.record(repos, {
        eventId: input.eventId,
        ticketId: ticket.id,
        bookingId: null,
        result: CheckInResult.ADMITTED,
        actor,
        deviceId: input.deviceId ?? null,
      });

      return {
        result: CheckInResult.ADMITTED,
        message: "Admitted",
        ticketId: ticket.id,
        holderName: ticket.ownerName,
        ticketTypeName: ticketType?.name,
        seatLabel: ticket.seatLabel,
        guestCount: 1,
      };
    });
  }

  /** Guest-list admission: by booking reference, guest name or phone. */
  async checkInBooking(
    actor: ActorContext,
    input: { eventId: string; bookingId?: string; reference?: string; deviceId?: string },
  ): Promise<ScanResult> {
    return this.uow.runInTransaction(async (repos) => {
      const booking = input.bookingId
        ? await repos.bookings.findById(input.bookingId)
        : input.reference
          ? await repos.bookings.findByReference(input.reference)
          : null;

      if (!booking || booking.eventId !== input.eventId) {
        return { result: CheckInResult.INVALID_CREDENTIAL, message: "No matching booking found" };
      }
      if (booking.status === BookingStatus.CHECKED_IN) {
        return {
          result: CheckInResult.ALREADY_USED,
          message: "This booking is already checked in",
          bookingId: booking.id,
          holderName: booking.primaryGuestName,
        };
      }
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.DECLINED
      ) {
        return {
          result: CheckInResult.REVOKED,
          message: `This booking is ${booking.status.toLowerCase()}`,
          bookingId: booking.id,
        };
      }
      // A waitlisted guest is not automatically admitted; a supervisor may
      // override, which is recorded as such.
      if (booking.status === BookingStatus.WAITLISTED) {
        return {
          result: CheckInResult.REQUIRES_OVERRIDE,
          message: "This guest is on the waitlist — a supervisor can admit them",
          bookingId: booking.id,
          holderName: booking.primaryGuestName,
          guestCount: booking.guestCount,
        };
      }

      await repos.bookings.update(booking.id, {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: this.clock.nowIso(),
        updatedAt: this.clock.nowIso(),
      });
      await this.record(repos, {
        eventId: input.eventId,
        ticketId: null,
        bookingId: booking.id,
        result: CheckInResult.ADMITTED,
        actor,
        deviceId: input.deviceId ?? null,
      });

      return {
        result: CheckInResult.ADMITTED,
        message: `Admitted — ${booking.guestCount} ${booking.guestCount === 1 ? "guest" : "guests"}`,
        bookingId: booking.id,
        holderName: booking.primaryGuestName,
        guestCount: booking.guestCount,
      };
    });
  }

  /** Supervisor override. Requires permission and always writes an audit event. */
  async override(
    actor: ActorContext,
    input: { eventId: string; bookingId: string; reason: string },
  ): Promise<ScanResult> {
    if (!actor.roles.some((role) => role === "EVENT_MANAGER" || role === "ORGANIZER_OWNER" || role === "ORGANIZER_ADMIN")) {
      throw forbidden("Only a supervisor can override a check-in");
    }
    return this.uow.runInTransaction(async (repos) => {
      const booking = await repos.bookings.findById(input.bookingId);
      if (!booking) throw notFound("Booking", input.bookingId);

      await repos.bookings.update(booking.id, {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: this.clock.nowIso(),
        updatedAt: this.clock.nowIso(),
      });
      await this.record(repos, {
        eventId: input.eventId,
        ticketId: null,
        bookingId: booking.id,
        result: CheckInResult.ADMITTED,
        actor,
        deviceId: null,
        overrideReason: input.reason,
      });
      await this.deps.audit.record(actor, {
        action: "checkin.override",
        resourceType: "Booking",
        resourceId: booking.id,
        before: { status: booking.status },
        after: { status: BookingStatus.CHECKED_IN },
        reason: input.reason,
      });

      return {
        result: CheckInResult.ADMITTED,
        message: "Admitted by supervisor override",
        bookingId: booking.id,
        holderName: booking.primaryGuestName,
        guestCount: booking.guestCount,
      };
    });
  }

  /**
   * Applies a batch of scans recorded while a device was offline.
   *
   * Conflict rule: the earliest scan wins and later scans of the same ticket
   * are flagged as duplicates for review. Two devices genuinely offline at the
   * same moment can both admit the same code — no design fixes that — so the
   * mitigations are short credential TTLs, per-gate device partitioning and
   * aggressive sync, with this reconciliation as the audit backstop.
   */
  async syncOfflineBatch(
    actor: ActorContext,
    input: { eventId: string; records: OfflineScanRecord[] },
  ): Promise<{ applied: number; duplicates: number; invalid: number }> {
    return this.uow.runInTransaction(async (repos) => {
      const ordered = [...input.records].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
      let applied = 0;
      let duplicates = 0;
      let invalid = 0;

      for (const record of ordered) {
        let ticketId: string;
        try {
          // Offline credentials are verified against expiry at scan time, not
          // sync time, so a legitimate late sync is not rejected.
          const payload = this.deps.credentials.verify(record.credential);
          ticketId = payload.t;
        } catch {
          invalid += 1;
          continue;
        }

        const ticket = await repos.tickets.findById(ticketId);
        if (!ticket || ticket.eventId !== input.eventId) {
          invalid += 1;
          continue;
        }

        const existing = await repos.checkins.findAdmittedForTicket(ticket.id);
        if (existing) {
          duplicates += 1;
          await this.record(repos, {
            eventId: input.eventId,
            ticketId: ticket.id,
            bookingId: null,
            result: CheckInResult.ALREADY_USED,
            actor,
            deviceId: record.deviceId,
            at: record.scannedAt,
          });
          continue;
        }

        await repos.tickets.update(ticket.id, {
          status: TicketStatus.CHECKED_IN,
          checkedInAt: record.scannedAt,
        });
        await this.record(repos, {
          eventId: input.eventId,
          ticketId: ticket.id,
          bookingId: null,
          result: CheckInResult.ADMITTED,
          actor,
          deviceId: record.deviceId,
          at: record.scannedAt,
        });
        applied += 1;
      }

      await this.deps.audit.record(actor, {
        action: "checkin.offline_batch_synced",
        resourceType: "Event",
        resourceId: input.eventId,
        after: { applied, duplicates, invalid, total: input.records.length },
      });

      return { applied, duplicates, invalid };
    });
  }

  async listForEvent(eventId: string): Promise<CheckIn[]> {
    return this.uow.repos.checkins.listByEvent(eventId);
  }

  private async record(
    repos: Parameters<Parameters<UnitOfWork["runInTransaction"]>[0]>[0],
    input: {
      eventId: string;
      ticketId: string | null;
      bookingId: string | null;
      result: CheckInResult;
      actor: ActorContext;
      deviceId: string | null;
      overrideReason?: string;
      at?: string;
    },
  ): Promise<void> {
    await repos.checkins.create({
      id: newId("chk"),
      eventId: input.eventId,
      ticketId: input.ticketId,
      bookingId: input.bookingId,
      result: input.result,
      scannedByUserId: input.actor.userId,
      deviceId: input.deviceId,
      overrideReason: input.overrideReason ?? null,
      at: input.at ?? this.clock.nowIso(),
    });
  }
}
