import { createHash } from "node:crypto";
import { BookingStatus, InviteStatus } from "@/domain/enums";
import { DomainError, forbidden, notFound, validationError } from "@/domain/errors";
import { behaviourFor } from "@/domain/event-type-policy";
import { assertTransition, BOOKING_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, Booking, BookingGuest, PrivateInvite } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { humanCode, newId, randomToken } from "../lib/ids";
import type { Repositories, UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import type { NotificationService } from "./notification-service";

/**
 * Bookings, RSVPs and private invitations.
 *
 * A booking is deliberately not a ticket. A ruracio guest bringing four people,
 * a chama member attending a monthly meeting and a boardroom reservation share
 * nothing with a stadium seat except that someone shows up — so they get their
 * own aggregate, with guest counts, tables, meal choices and contributions.
 *
 * Guests can RSVP without an account; identity is established by a verified
 * email or phone, and the invite token proves they were invited.
 */

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateBookingInput {
  eventId: string;
  occurrenceId?: string | null;
  primaryGuestName: string;
  email?: string;
  phone?: string;
  guestCount: number;
  guestNames?: string[];
  mealChoice?: string;
  notes?: string;
  /** Raw invite token for invitation-only events. */
  inviteToken?: string;
  tableId?: string;
}

export class BookingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: { audit: AuditService; notifications: NotificationService },
    private readonly clock: Clock = systemClock,
  ) {}

  /**
   * Creates a booking or RSVP. Capacity is evaluated inside the transaction, so
   * the last seat cannot be handed to two people; overflow goes to the waitlist
   * rather than being rejected outright.
   */
  async createBooking(actor: ActorContext, input: CreateBookingInput): Promise<Booking> {
    if (input.guestCount < 1) throw validationError("Guest count must be at least 1");
    if (!input.email && !input.phone) {
      throw validationError("We need an email address or a phone number to confirm your booking");
    }

    return this.uow.runInTransaction(async (repos) => {
      const event = await repos.events.findById(input.eventId);
      if (!event) throw notFound("Event", input.eventId);
      if (event.status === "CANCELLED") {
        throw new DomainError("INVALID_STATE", "This event has been cancelled");
      }

      const behaviour = behaviourFor(event.type);
      if (!behaviour.createsBooking) {
        throw new DomainError(
          "INVALID_STATE",
          "This event issues tickets rather than taking bookings",
        );
      }

      let invite: PrivateInvite | null = null;
      if (behaviour.requiresInvite || input.inviteToken) {
        if (!input.inviteToken) {
          throw forbidden("This event is invitation only — enter your invitation code");
        }
        invite = await repos.invites.findByTokenHash(hashInviteToken(input.inviteToken));
        if (!invite || invite.eventId !== event.id) {
          throw forbidden("That invitation code was not recognised");
        }
        if (invite.status === InviteStatus.REVOKED) {
          throw forbidden("That invitation has been withdrawn");
        }
        if (invite.status === InviteStatus.ACCEPTED) {
          throw new DomainError("CONFLICT", "That invitation has already been used");
        }
        if (invite.expiresAt <= this.clock.nowIso()) {
          await repos.invites.update(invite.id, { status: InviteStatus.EXPIRED });
          throw forbidden("That invitation has expired");
        }
        if (input.guestCount > invite.maxGuests) {
          throw validationError(
            `Your invitation covers up to ${invite.maxGuests} ${invite.maxGuests === 1 ? "guest" : "guests"}`,
            { maxGuests: invite.maxGuests },
          );
        }
      }

      // Capacity check and waitlist decision, inside the transaction.
      let status: BookingStatus = BookingStatus.CONFIRMED;
      if (event.capacity !== null) {
        const taken = await repos.bookings.countConfirmedGuests(
          event.id,
          input.occurrenceId ?? null,
        );
        if (taken + input.guestCount > event.capacity) {
          status = BookingStatus.WAITLISTED;
        }
      }
      // Reservations that need organizer sign-off start pending.
      if (event.type === "BOOKING" && status === BookingStatus.CONFIRMED) {
        status = BookingStatus.PENDING;
      }

      const bookingId = newId("bkg");
      const guests: BookingGuest[] = (input.guestNames ?? []).map((name, index) => ({
        id: `${bookingId}_g${index}`,
        name,
        phone: null,
        email: null,
        mealChoice: null,
        checkedInAt: null,
      }));

      const booking = await repos.bookings.create({
        id: bookingId,
        reference: humanCode("BK"),
        eventId: event.id,
        occurrenceId: input.occurrenceId ?? null,
        primaryGuestUserId: actor.userId,
        primaryGuestName: input.primaryGuestName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        status,
        guestCount: input.guestCount,
        guests,
        tableId: input.tableId ?? null,
        mealChoice: input.mealChoice ?? null,
        contributionPledged: null,
        contributionPaid: null,
        paymentStatus: null,
        invitedBy: invite ? (event.organizerId as string) : null,
        notes: input.notes ?? null,
        checkedInAt: null,
        createdAt: this.clock.nowIso(),
        updatedAt: this.clock.nowIso(),
      });

      if (invite) {
        await repos.invites.update(invite.id, {
          status: InviteStatus.ACCEPTED,
          bookingId: booking.id,
        });
      }

      if (input.tableId) {
        const table = await repos.tables.findById(input.tableId);
        if (table) {
          await repos.tables.update(table.id, {
            assignedBookingIds: [...table.assignedBookingIds, booking.id],
          });
        }
      }

      const recipient = input.email ?? input.phone!;
      await this.deps.notifications.send({
        userId: actor.userId,
        to: recipient,
        channel: input.email ? "EMAIL" : "SMS",
        template: "booking.confirmed",
        payload: {
          reference: booking.reference,
          eventTitle: event.title,
          status: booking.status,
        },
      });

      await this.deps.audit.record(actor, {
        action: "booking.created",
        resourceType: "Booking",
        resourceId: booking.id,
        after: { status: booking.status, guestCount: booking.guestCount },
      });

      return booking;
    });
  }

  async updateStatus(
    actor: ActorContext,
    bookingId: string,
    next: BookingStatus,
    reason?: string,
  ): Promise<Booking> {
    return this.uow.runInTransaction(async (repos) => {
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking", bookingId);
      assertTransition(BOOKING_TRANSITIONS, booking.status, next, "Booking");

      const updated = await repos.bookings.update(bookingId, {
        status: next,
        updatedAt: this.clock.nowIso(),
        ...(next === BookingStatus.CHECKED_IN ? { checkedInAt: this.clock.nowIso() } : {}),
      });

      // Freeing a confirmed place promotes the longest-waiting waitlist entry.
      if (next === BookingStatus.CANCELLED || next === BookingStatus.DECLINED) {
        await this.promoteFromWaitlist(actor, booking.eventId, booking.occurrenceId);
      }

      await this.deps.audit.record(actor, {
        action: "booking.status_changed",
        resourceType: "Booking",
        resourceId: bookingId,
        before: { status: booking.status },
        after: { status: next },
        reason: reason ?? null,
      });

      return updated;
    });
  }

  /**
   * Lets the guest who made a booking withdraw it themselves — the same
   * transition organizer staff can drive from the guest list, but reachable
   * from the account area and gated on ownership rather than staff access.
   */
  async cancelBooking(actor: ActorContext, bookingId: string, reason?: string): Promise<Booking> {
    return this.uow.runInTransaction(async (repos) => {
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking", bookingId);

      const isOwner = booking.primaryGuestUserId === actor.userId;
      const isOrganizerStaff = actor.organizerId !== null;
      if (!isOwner && !isOrganizerStaff) {
        throw forbidden("You cannot cancel this booking");
      }
      // `assertTransition` treats a same-state request as a no-op rather than
      // an error, which would make cancelling an already-cancelled booking
      // silently "succeed" a second time — worth a clear message instead.
      if (booking.status === BookingStatus.CANCELLED) {
        throw new DomainError("INVALID_STATE", "This booking is already cancelled");
      }

      assertTransition(BOOKING_TRANSITIONS, booking.status, BookingStatus.CANCELLED, "Booking");

      const updated = await repos.bookings.update(bookingId, {
        status: BookingStatus.CANCELLED,
        updatedAt: this.clock.nowIso(),
      });

      await this.promoteFromWaitlist(actor, booking.eventId, booking.occurrenceId);

      const recipient = booking.email ?? booking.phone;
      if (recipient) {
        const event = await repos.events.findById(booking.eventId);
        await this.deps.notifications.send({
          userId: booking.primaryGuestUserId,
          to: recipient,
          channel: booking.email ? "EMAIL" : "SMS",
          template: "booking.cancelled",
          payload: { reference: booking.reference, eventTitle: event?.title ?? "" },
        });
      }

      await this.deps.audit.record(actor, {
        action: "booking.cancelled",
        resourceType: "Booking",
        resourceId: bookingId,
        before: { status: booking.status },
        after: { status: BookingStatus.CANCELLED },
        reason: reason ?? null,
      });

      return updated;
    });
  }

  async updateGuests(
    actor: ActorContext,
    bookingId: string,
    input: { guestCount?: number; guests?: BookingGuest[]; mealChoice?: string; notes?: string },
  ): Promise<Booking> {
    return this.uow.runInTransaction(async (repos) => {
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking", bookingId);

      const isOwner = booking.primaryGuestUserId === actor.userId;
      const isOrganizerStaff = actor.organizerId !== null;
      if (!isOwner && !isOrganizerStaff) {
        throw forbidden("You cannot edit this booking");
      }

      if (input.guestCount !== undefined && input.guestCount > booking.guestCount) {
        const event = await repos.events.findById(booking.eventId);
        if (event?.capacity !== null && event?.capacity !== undefined) {
          const taken = await repos.bookings.countConfirmedGuests(
            booking.eventId,
            booking.occurrenceId,
          );
          const delta = input.guestCount - booking.guestCount;
          if (taken + delta > event.capacity) {
            throw new DomainError("SOLD_OUT", "There is not enough capacity for extra guests");
          }
        }
      }

      const updated = await repos.bookings.update(bookingId, {
        ...(input.guestCount !== undefined ? { guestCount: input.guestCount } : {}),
        ...(input.guests ? { guests: input.guests } : {}),
        ...(input.mealChoice !== undefined ? { mealChoice: input.mealChoice } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: this.clock.nowIso(),
      });

      await this.deps.audit.record(actor, {
        action: "booking.guests_updated",
        resourceType: "Booking",
        resourceId: bookingId,
        before: { guestCount: booking.guestCount },
        after: { guestCount: updated.guestCount },
      });

      return updated;
    });
  }

  async assignTable(actor: ActorContext, bookingId: string, tableId: string): Promise<Booking> {
    return this.uow.runInTransaction(async (repos) => {
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking", bookingId);
      const table = await repos.tables.findById(tableId);
      if (!table) throw notFound("BanquetTable", tableId);
      if (table.eventId !== booking.eventId) {
        throw validationError("That table belongs to a different event");
      }

      const seatsTaken = await this.seatsTakenAtTable(repos, table.id);
      if (seatsTaken + booking.guestCount > table.seats) {
        throw new DomainError("SOLD_OUT", `${table.name} does not have room for that many guests`, {
          seats: table.seats,
          seatsTaken,
        });
      }

      if (booking.tableId && booking.tableId !== tableId) {
        const previous = await repos.tables.findById(booking.tableId);
        if (previous) {
          await repos.tables.update(previous.id, {
            assignedBookingIds: previous.assignedBookingIds.filter((id) => id !== bookingId),
          });
        }
      }

      await repos.tables.update(table.id, {
        assignedBookingIds: [...new Set([...table.assignedBookingIds, bookingId])],
      });

      const updated = await repos.bookings.update(bookingId, {
        tableId,
        updatedAt: this.clock.nowIso(),
      });

      await this.deps.audit.record(actor, {
        action: "booking.table_assigned",
        resourceType: "Booking",
        resourceId: bookingId,
        before: { tableId: booking.tableId },
        after: { tableId },
      });

      return updated;
    });
  }

  /**
   * Issues a private invite. The raw token is returned exactly once, here — it
   * is never stored, logged or recoverable afterwards.
   */
  async issueInvite(
    actor: ActorContext,
    input: {
      eventId: string;
      inviteeName: string;
      email?: string;
      phone?: string;
      maxGuests: number;
      expiresAt: string;
    },
  ): Promise<{ invite: PrivateInvite; token: string }> {
    const token = randomToken(24);
    const invite = await this.uow.repos.invites.create({
      id: newId("inv"),
      eventId: input.eventId,
      tokenHash: hashInviteToken(token),
      inviteeName: input.inviteeName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      maxGuests: input.maxGuests,
      expiresAt: input.expiresAt,
      status: InviteStatus.ISSUED,
      bookingId: null,
      createdAt: this.clock.nowIso(),
    });

    if (input.email || input.phone) {
      await this.deps.notifications.send({
        userId: null,
        to: input.email ?? input.phone!,
        channel: input.email ? "EMAIL" : "SMS",
        template: "invite.issued",
        // The token travels in the delivered message body, not in this payload.
        payload: { inviteeName: input.inviteeName, maxGuests: String(input.maxGuests) },
      });
    }

    await this.deps.audit.record(actor, {
      action: "invite.issued",
      resourceType: "PrivateInvite",
      resourceId: invite.id,
      after: { inviteeName: input.inviteeName, maxGuests: input.maxGuests },
    });

    return { invite, token };
  }

  async revokeInvite(actor: ActorContext, inviteId: string): Promise<PrivateInvite> {
    const invite = await this.uow.repos.invites.findById(inviteId);
    if (!invite) throw notFound("PrivateInvite", inviteId);
    const revoked = await this.uow.repos.invites.update(inviteId, {
      status: InviteStatus.REVOKED,
    });
    await this.deps.audit.record(actor, {
      action: "invite.revoked",
      resourceType: "PrivateInvite",
      resourceId: inviteId,
      before: { status: invite.status },
      after: { status: revoked.status },
    });
    return revoked;
  }

  /** Validates an invite token without consuming it — used by the RSVP form. */
  async previewInvite(
    eventId: string,
    token: string,
  ): Promise<{ inviteeName: string; maxGuests: number }> {
    const invite = await this.uow.repos.invites.findByTokenHash(hashInviteToken(token));
    if (!invite || invite.eventId !== eventId) {
      throw forbidden("That invitation code was not recognised");
    }
    if (invite.status === InviteStatus.REVOKED || invite.expiresAt <= this.clock.nowIso()) {
      throw forbidden("That invitation is no longer valid");
    }
    return { inviteeName: invite.inviteeName, maxGuests: invite.maxGuests };
  }

  private async seatsTakenAtTable(repos: Repositories, tableId: string): Promise<number> {
    const table = await repos.tables.findById(tableId);
    if (!table) return 0;
    let seats = 0;
    for (const bookingId of table.assignedBookingIds) {
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) continue;
      if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.DECLINED) {
        continue;
      }
      seats += booking.guestCount;
    }
    return seats;
  }

  private async promoteFromWaitlist(
    actor: ActorContext,
    eventId: string,
    occurrenceId: string | null,
  ): Promise<void> {
    const repos = this.uow.repos;
    const event = await repos.events.findById(eventId);
    if (!event || event.capacity === null) return;

    const bookings = await repos.bookings.listByEvent(eventId);
    const waitlisted = bookings
      .filter(
        (booking) =>
          booking.status === BookingStatus.WAITLISTED &&
          (occurrenceId ? booking.occurrenceId === occurrenceId : true),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const candidate of waitlisted) {
      const taken = await repos.bookings.countConfirmedGuests(eventId, occurrenceId);
      if (taken + candidate.guestCount > event.capacity) continue;
      await repos.bookings.update(candidate.id, {
        status: BookingStatus.CONFIRMED,
        updatedAt: this.clock.nowIso(),
      });
      if (candidate.email) {
        await this.deps.notifications.send({
          userId: candidate.primaryGuestUserId,
          to: candidate.email,
          channel: "EMAIL",
          template: "booking.confirmed",
          payload: { reference: candidate.reference, eventTitle: event.title, status: "CONFIRMED" },
        });
      }
      await this.deps.audit.record(actor, {
        action: "booking.promoted_from_waitlist",
        resourceType: "Booking",
        resourceId: candidate.id,
        before: { status: BookingStatus.WAITLISTED },
        after: { status: BookingStatus.CONFIRMED },
      });
    }
  }
}
