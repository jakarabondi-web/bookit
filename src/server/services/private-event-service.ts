import { BookingStatus, EventVisibility, InviteStatus } from "@/domain/enums";
import { DomainError, forbidden, notFound, validationError } from "@/domain/errors";
import { money, type Money } from "@/domain/money";
import {
  defaultPrivatePage,
  type Broadcast,
  type BroadcastAudience,
  type BroadcastChannel,
  type GiftClaim,
  type GiftItem,
  type GuestMessage,
  type PrivateEventPage,
} from "@/domain/private-event";
import type { ActorContext, Booking, Event, PrivateInvite, Venue } from "@/domain/types";
import { config } from "../config";
import { systemClock, type Clock } from "../lib/clock";
import { newId, randomToken } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import { hashInviteToken } from "./booking-service";
import type { BookingService } from "./booking-service";
import type { NotificationService } from "./notification-service";

/**
 * Private events.
 *
 * The security posture here is different from the rest of the platform: there
 * is no public surface at all. An invitation token is the only key, it is
 * stored hashed, and every read on this service starts by resolving that token.
 * Nothing takes an `eventId` from an untrusted caller.
 */

/** Everything the microsite needs, resolved from one invitation token. */
export interface InviteContext {
  invite: PrivateInvite;
  event: Event;
  venue: Venue;
  page: PrivateEventPage;
  /** The guest's own booking, once they have responded. */
  booking: Booking | null;
  gifts: GiftItem[];
  /** Gifts this guest has already claimed. */
  myClaims: GiftClaim[];
  /** Approved wall messages, when the wall is enabled. */
  messages: GuestMessage[];
  /** Confirmed guest count, when the hosts chose to show it. */
  confirmedGuests: number | null;
  /** Names of other confirmed guests, when the hosts chose to show them. */
  guestNames: string[] | null;
  rsvpClosed: boolean;
}

export interface RsvpInput {
  attending: boolean;
  guestCount: number;
  guestNames?: string[];
  mealChoice?: string;
  dietary?: string;
  message?: string;
  songRequest?: string;
  phone?: string;
  email?: string;
}

export class PrivateEventService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: {
      bookings: BookingService;
      audit: AuditService;
      notifications: NotificationService;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Guest-facing                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Resolves an invitation token into everything the microsite renders.
   *
   * Returns `null` rather than throwing for an unknown token, so the route can
   * render an ordinary 404 and not confirm whether the event exists.
   */
  async resolveInvite(token: string): Promise<InviteContext | null> {
    const repos = this.uow.repos;

    const invite = await repos.invites.findByTokenHash(hashInviteToken(token));
    if (!invite) return null;
    if (invite.status === InviteStatus.REVOKED) return null;

    const event = await repos.events.findById(invite.eventId);
    if (!event) return null;
    if (event.visibility === EventVisibility.PUBLIC) {
      // A public event has no private microsite; send them to the normal page.
      return null;
    }

    const venue = await repos.venues.findById(event.venueId);
    if (!venue) return null;

    const page =
      (await repos.privateEvents.findPage(event.id)) ??
      defaultPrivatePage(event.id, { title: event.title, startsAt: event.startsAt });

    const booking = invite.bookingId ? await repos.bookings.findById(invite.bookingId) : null;

    const gifts = page.giftRegistryEnabled
      ? (await repos.privateEvents.listGifts(event.id)).filter((gift) => !gift.archived)
      : [];
    const myClaims = await repos.privateEvents.listClaimsByInvite(invite.id);

    const messages = page.messageWallEnabled
      ? (await repos.privateEvents.listMessages(event.id)).filter((message) => message.approved)
      : [];

    let confirmedGuests: number | null = null;
    let guestNames: string[] | null = null;
    if (page.rsvp.showConfirmedCount || page.rsvp.showGuestList) {
      const bookings = await repos.bookings.listByEvent(event.id);
      const confirmed = bookings.filter(
        (entry) =>
          entry.status === BookingStatus.CONFIRMED || entry.status === BookingStatus.CHECKED_IN,
      );
      if (page.rsvp.showConfirmedCount) {
        confirmedGuests = confirmed.reduce((total, entry) => total + entry.guestCount, 0);
      }
      if (page.rsvp.showGuestList) {
        guestNames = confirmed.map((entry) => entry.primaryGuestName);
      }
    }

    // Mark the invitation as seen, once. Hosts want to know who has opened it.
    if (invite.status === InviteStatus.ISSUED) {
      await repos.invites.update(invite.id, { status: InviteStatus.VIEWED });
    }

    const rsvpClosed = Boolean(
      page.rsvp.deadline && page.rsvp.deadline < this.clock.nowIso(),
    );

    return {
      invite,
      event,
      venue,
      page,
      booking,
      gifts,
      myClaims,
      messages,
      confirmedGuests,
      guestNames,
      rsvpClosed,
    };
  }

  /**
   * Records a guest's response. Accepting creates (or updates) their booking;
   * declining marks the invitation declined without consuming capacity.
   */
  async respondToInvite(
    token: string,
    input: RsvpInput,
  ): Promise<{ booking: Booking | null; status: BookingStatus | "DECLINED" }> {
    const context = await this.resolveInvite(token);
    if (!context) throw forbidden("That invitation was not recognised");

    const { invite, event, page } = context;

    if (context.rsvpClosed) {
      throw new DomainError("INVALID_STATE", "RSVPs for this event have closed");
    }
    if (invite.expiresAt <= this.clock.nowIso()) {
      await this.uow.repos.invites.update(invite.id, { status: InviteStatus.EXPIRED });
      throw forbidden("That invitation has expired");
    }

    if (!input.attending) {
      await this.uow.repos.invites.update(invite.id, { status: InviteStatus.DECLINED });
      if (invite.bookingId) {
        await this.deps.bookings.updateStatus(
          this.systemActor(),
          invite.bookingId,
          BookingStatus.DECLINED,
          "Guest declined from the invitation page",
        );
      }
      await this.deps.audit.record(this.systemActor(), {
        action: "invite.declined",
        resourceType: "PrivateInvite",
        resourceId: invite.id,
        after: { status: InviteStatus.DECLINED },
      });
      return { booking: null, status: "DECLINED" };
    }

    if (input.guestCount < 1) throw validationError("Enter at least one guest");
    if (input.guestCount > invite.maxGuests) {
      throw validationError(
        `Your invitation covers up to ${invite.maxGuests} ${invite.maxGuests === 1 ? "guest" : "guests"}`,
        { maxGuests: invite.maxGuests },
      );
    }
    if (!page.rsvp.allowPlusOnes && input.guestCount > 1) {
      throw validationError("This invitation is for one guest only");
    }

    // Changing an existing response updates the booking rather than making a
    // second one — a guest who switches from 2 to 3 must not book twice.
    if (invite.bookingId) {
      const existing = await this.uow.repos.bookings.findById(invite.bookingId);
      if (existing) {
        const updated = await this.deps.bookings.updateGuests(
          this.systemActor({ organizerId: event.organizerId }),
          existing.id,
          {
            guestCount: input.guestCount,
            mealChoice: input.mealChoice,
            notes: this.composeNotes(input),
          },
        );
        if (
          existing.status === BookingStatus.DECLINED ||
          existing.status === BookingStatus.CANCELLED
        ) {
          await this.deps.bookings.updateStatus(
            this.systemActor(),
            existing.id,
            BookingStatus.PENDING,
            "Guest changed their response",
          );
          await this.deps.bookings.updateStatus(
            this.systemActor(),
            existing.id,
            BookingStatus.CONFIRMED,
            "Guest changed their response",
          );
        }
        await this.uow.repos.invites.update(invite.id, { status: InviteStatus.ACCEPTED });
        await this.recordGuestMessage(event.id, invite.id, updated, input);
        return { booking: updated, status: updated.status };
      }
    }

    const booking = await this.deps.bookings.createBooking(this.systemActor(), {
      eventId: event.id,
      primaryGuestName: invite.inviteeName,
      email: input.email ?? invite.email ?? undefined,
      phone: input.phone ?? invite.phone ?? undefined,
      guestCount: input.guestCount,
      guestNames: input.guestNames,
      mealChoice: input.mealChoice,
      notes: this.composeNotes(input),
      inviteToken: token,
    });

    await this.recordGuestMessage(event.id, invite.id, booking, input);

    if (booking.email) {
      await this.deps.notifications.send({
        userId: null,
        to: booking.email,
        channel: "EMAIL",
        template: "booking.confirmed",
        payload: {
          reference: booking.reference,
          eventTitle: event.title,
          status: booking.status,
        },
      });
    }

    return { booking, status: booking.status };
  }

  /** Claims a gift, or pledges towards a cash fund. */
  async claimGift(
    token: string,
    input: { giftId: string; quantity?: number; amount?: Money; message?: string; anonymous?: boolean },
  ): Promise<GiftClaim> {
    const context = await this.resolveInvite(token);
    if (!context) throw forbidden("That invitation was not recognised");

    return this.uow.runInTransaction(async (repos) => {
      const gift = await repos.privateEvents.findGift(input.giftId);
      if (!gift || gift.eventId !== context.event.id || gift.archived) {
        throw notFound("GiftItem", input.giftId);
      }

      if (gift.kind === "ITEM") {
        const quantity = input.quantity ?? 1;
        const remaining = gift.quantityWanted - gift.quantityClaimed;
        if (quantity > remaining) {
          throw new DomainError(
            "CONFLICT",
            remaining <= 0
              ? "Someone has already claimed this gift"
              : `Only ${remaining} left to claim`,
            { remaining },
          );
        }
        await repos.privateEvents.updateGift(gift.id, {
          quantityClaimed: gift.quantityClaimed + quantity,
        });
      } else {
        if (!input.amount || input.amount.amount <= 0) {
          throw validationError("Enter the amount you would like to contribute");
        }
        await repos.privateEvents.updateGift(gift.id, {
          contributed: money(
            (gift.contributed?.amount ?? 0) + input.amount.amount,
            input.amount.currency,
          ),
        });
      }

      const claim = await repos.privateEvents.createClaim({
        id: newId("gcl"),
        giftId: gift.id,
        eventId: context.event.id,
        inviteId: context.invite.id,
        claimantName: context.invite.inviteeName,
        quantity: gift.kind === "ITEM" ? (input.quantity ?? 1) : 1,
        amount: input.amount ?? null,
        message: input.message ?? null,
        anonymous: input.anonymous ?? false,
        claimedAt: this.clock.nowIso(),
      });

      await this.deps.audit.record(this.systemActor(), {
        action: "gift.claimed",
        resourceType: "GiftItem",
        resourceId: gift.id,
        after: { claimId: claim.id, quantity: claim.quantity },
      });

      return claim;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Host-facing                                                         */
  /* ------------------------------------------------------------------ */

  async getPageForHost(actor: ActorContext, eventId: string): Promise<PrivateEventPage> {
    const event = await this.assertHost(actor, eventId);
    return (
      (await this.uow.repos.privateEvents.findPage(eventId)) ??
      defaultPrivatePage(eventId, { title: event.title, startsAt: event.startsAt })
    );
  }

  async savePage(
    actor: ActorContext,
    eventId: string,
    patch: Partial<PrivateEventPage>,
  ): Promise<PrivateEventPage> {
    const event = await this.assertHost(actor, eventId);
    const current =
      (await this.uow.repos.privateEvents.findPage(eventId)) ??
      defaultPrivatePage(eventId, { title: event.title, startsAt: event.startsAt });

    const next: PrivateEventPage = {
      ...current,
      ...patch,
      eventId,
      updatedAt: this.clock.nowIso(),
    };
    const saved = await this.uow.repos.privateEvents.savePage(next);

    await this.deps.audit.record(actor, {
      action: "private_page.updated",
      resourceType: "Event",
      resourceId: eventId,
      after: {
        palette: saved.design?.paletteId ?? saved.themeId,
        font: saved.design?.fontId ?? null,
        background: saved.design?.backgroundId ?? null,
        heroLayout: saved.design?.heroLayout ?? null,
        hosts: saved.hosts.length,
      },
    });

    return saved;
  }

  /**
   * Issues invitations in bulk and returns each raw link exactly once.
   *
   * The raw token is never persisted or logged, so this response is the only
   * chance to capture it — the caller either sends it immediately or shows it
   * to the host to copy.
   */
  async issueInvitations(
    actor: ActorContext,
    eventId: string,
    guests: Array<{
      name: string;
      email?: string;
      phone?: string;
      maxGuests?: number;
    }>,
    options: { expiresAt: string; send?: boolean },
  ): Promise<Array<{ inviteId: string; name: string; link: string }>> {
    await this.assertHost(actor, eventId);

    const issued: Array<{ inviteId: string; name: string; link: string }> = [];

    for (const guest of guests) {
      const { invite, token } = await this.deps.bookings.issueInvite(actor, {
        eventId,
        inviteeName: guest.name,
        email: guest.email,
        phone: guest.phone,
        maxGuests: guest.maxGuests ?? 1,
        expiresAt: options.expiresAt,
      });

      const link = this.inviteLink(token);
      issued.push({ inviteId: invite.id, name: guest.name, link });

      if (options.send && (guest.email || guest.phone)) {
        await this.deps.notifications.send({
          userId: null,
          to: guest.email ?? guest.phone!,
          channel: guest.email ? "EMAIL" : "SMS",
          template: "invite.issued",
          // The link is the message body at delivery time; it is deliberately
          // not stored in the notification payload.
          payload: { inviteeName: guest.name, maxGuests: String(guest.maxGuests ?? 1) },
        });
      }
    }

    await this.deps.audit.record(actor, {
      action: "invites.issued",
      resourceType: "Event",
      resourceId: eventId,
      after: { count: issued.length, sent: Boolean(options.send) },
    });

    return issued;
  }

  /** Sends a message to a segment of the guest list. */
  async sendBroadcast(
    actor: ActorContext,
    eventId: string,
    input: {
      channel: BroadcastChannel;
      audience: BroadcastAudience;
      subject: string;
      body: string;
    },
  ): Promise<Broadcast> {
    await this.assertHost(actor, eventId);
    if (!input.subject.trim()) throw validationError("Give your message a subject");
    if (!input.body.trim()) throw validationError("Write something to send");

    const recipients = await this.recipientsFor(eventId, input.audience);

    for (const recipient of recipients) {
      const to = input.channel === "SMS" ? recipient.phone : recipient.email;
      if (!to) continue;
      await this.deps.notifications.send({
        userId: recipient.userId,
        to,
        channel: input.channel,
        template: "event.reminder",
        payload: { subject: input.subject, body: input.body },
      });
    }

    const broadcast = await this.uow.repos.privateEvents.createBroadcast({
      id: newId("bcs"),
      eventId,
      channel: input.channel,
      audience: input.audience,
      subject: input.subject,
      body: input.body,
      recipientCount: recipients.length,
      sentByUserId: actor.userId,
      sentAt: this.clock.nowIso(),
    });

    await this.deps.audit.record(actor, {
      action: "broadcast.sent",
      resourceType: "Event",
      resourceId: eventId,
      after: {
        channel: input.channel,
        audience: input.audience,
        recipients: recipients.length,
      },
    });

    return broadcast;
  }

  listBroadcasts(eventId: string) {
    return this.uow.repos.privateEvents.listBroadcasts(eventId);
  }

  listGifts(eventId: string) {
    return this.uow.repos.privateEvents.listGifts(eventId);
  }

  listClaims(eventId: string) {
    return this.uow.repos.privateEvents.listClaims(eventId);
  }

  listMessages(eventId: string) {
    return this.uow.repos.privateEvents.listMessages(eventId);
  }

  listInvites(eventId: string) {
    return this.uow.repos.invites.listByEvent(eventId);
  }

  async saveGift(actor: ActorContext, eventId: string, gift: Omit<GiftItem, "eventId">) {
    await this.assertHost(actor, eventId);
    return this.uow.repos.privateEvents.saveGift({ ...gift, eventId });
  }

  async approveMessage(actor: ActorContext, eventId: string, messageId: string) {
    await this.assertHost(actor, eventId);
    return this.uow.repos.privateEvents.updateMessage(messageId, { approved: true });
  }

  /* ------------------------------------------------------------------ */
  /* Internals                                                           */
  /* ------------------------------------------------------------------ */

  inviteLink(token: string): string {
    return `${config.appUrl}/i/${token}`;
  }

  /** Confirms the actor owns this event and that it is genuinely private. */
  private async assertHost(actor: ActorContext, eventId: string): Promise<Event> {
    const event = await this.uow.repos.events.findById(eventId);
    if (!event) throw notFound("Event", eventId);
    if (actor.organizerId !== event.organizerId) {
      throw forbidden("This event belongs to another organizer");
    }
    if (event.visibility === EventVisibility.PUBLIC) {
      throw new DomainError(
        "INVALID_STATE",
        "This is a public event — change its visibility to use the private invitation tools",
      );
    }
    return event;
  }

  private async recipientsFor(
    eventId: string,
    audience: BroadcastAudience,
  ): Promise<Array<{ email: string | null; phone: string | null; userId: string | null }>> {
    const bookings = await this.uow.repos.bookings.listByEvent(eventId);
    const invites = await this.uow.repos.invites.listByEvent(eventId);

    if (audience === "NOT_RESPONDED") {
      // People who hold an invitation but have not answered it.
      return invites
        .filter(
          (invite) =>
            invite.status === InviteStatus.ISSUED || invite.status === InviteStatus.VIEWED,
        )
        .map((invite) => ({ email: invite.email, phone: invite.phone, userId: null }));
    }

    const wanted: Record<Exclude<BroadcastAudience, "NOT_RESPONDED" | "ALL">, BookingStatus> = {
      CONFIRMED: BookingStatus.CONFIRMED,
      PENDING: BookingStatus.PENDING,
      DECLINED: BookingStatus.DECLINED,
      WAITLISTED: BookingStatus.WAITLISTED,
    };

    const filtered =
      audience === "ALL"
        ? bookings.filter(
            (booking) =>
              booking.status !== BookingStatus.CANCELLED &&
              booking.status !== BookingStatus.DECLINED,
          )
        : bookings.filter((booking) => booking.status === wanted[audience]);

    return filtered.map((booking) => ({
      email: booking.email,
      phone: booking.phone,
      userId: booking.primaryGuestUserId,
    }));
  }

  private composeNotes(input: RsvpInput): string | undefined {
    const parts: string[] = [];
    if (input.dietary?.trim()) parts.push(`Dietary: ${input.dietary.trim()}`);
    if (input.songRequest?.trim()) parts.push(`Song request: ${input.songRequest.trim()}`);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  }

  private async recordGuestMessage(
    eventId: string,
    inviteId: string,
    booking: Booking,
    input: RsvpInput,
  ): Promise<void> {
    if (!input.message?.trim()) return;
    await this.uow.repos.privateEvents.createMessage({
      id: newId("gms"),
      eventId,
      bookingId: booking.id,
      inviteId,
      authorName: booking.primaryGuestName,
      body: input.message.trim(),
      // Hosts moderate before anything appears on the wall.
      approved: false,
      createdAt: this.clock.nowIso(),
    });
  }

  /**
   * The actor used for guest-initiated writes. A guest holding an invitation is
   * not a signed-in user, so their actions are attributed to the invitation
   * itself rather than borrowing anyone's identity.
   */
  private systemActor(overrides: Partial<ActorContext> = {}): ActorContext {
    return {
      userId: null,
      roles: [],
      organizerId: null,
      ip: null,
      sessionId: "invite",
      mfaSatisfied: false,
      deviceId: null,
      ...overrides,
    };
  }
}

export { randomToken };
