import { describe, expect, it } from "vitest";
import { BookingStatus, EventType, InviteStatus } from "@/domain/enums";
import { addDays } from "@/server/lib/clock";
import { actor, freshContainer, seedCapacityEvent } from "./helpers";

describe("bookings and RSVPs", () => {
  it("confirms an RSVP while there is capacity", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 3 });

    const booking = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Wanjiru Kariuki",
      email: "wanjiru@example.co.ke",
      guestCount: 1,
    });

    expect(booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it("waitlists guests once capacity is reached, counting guests not bookings", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 3 });

    // One booking for three people fills the event.
    const first = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Otieno Ochieng",
      email: "otieno@example.co.ke",
      guestCount: 3,
    });
    expect(first.status).toBe(BookingStatus.CONFIRMED);

    const second = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Fatuma Hassan",
      email: "fatuma@example.co.ke",
      guestCount: 1,
    });
    expect(second.status).toBe(BookingStatus.WAITLISTED);
  });

  it("promotes the longest-waiting guest when a place frees up", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 1 });

    const confirmed = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "First Guest",
      email: "first@example.co.ke",
      guestCount: 1,
    });
    const waitlisted = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Second Guest",
      email: "second@example.co.ke",
      guestCount: 1,
    });

    expect(waitlisted.status).toBe(BookingStatus.WAITLISTED);

    await container.bookings.updateStatus(
      actor(),
      confirmed.id,
      BookingStatus.CANCELLED,
      "Cannot attend",
    );

    const promoted = await container.uow.repos.bookings.findById(waitlisted.id);
    expect(promoted?.status).toBe(BookingStatus.CONFIRMED);
  });

  it("starts reservations as pending so the organizer can confirm", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, {
      capacity: 40,
      type: EventType.BOOKING,
      eventId: "evt_boardroom_test",
    });

    const booking = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Grace Wanjiku",
      phone: "+254700000003",
      guestCount: 12,
    });

    expect(booking.status).toBe(BookingStatus.PENDING);
  });

  it("refuses a booking with no way to contact the guest", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 10 });

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Anonymous",
        guestCount: 1,
      }),
    ).rejects.toThrow(/email address or a phone number/i);
  });

  it("refuses to book a ticketed event through the booking path", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, {
      capacity: 10,
      type: EventType.PAID_TICKET,
      eventId: "evt_paid_test",
    });

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Ticket Buyer",
        email: "buyer@example.co.ke",
        guestCount: 1,
      }),
    ).rejects.toThrow(/issues tickets/i);
  });
});

describe("cancelling a booking", () => {
  it("lets the guest who made the booking cancel it themselves", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 10 });

    const booking = await container.bookings.createBooking(actor({ userId: "usr_guest" }), {
      eventId: event.id,
      primaryGuestName: "Wanjiru Kariuki",
      email: "wanjiru@example.co.ke",
      guestCount: 1,
    });

    const cancelled = await container.bookings.cancelBooking(
      actor({ userId: "usr_guest" }),
      booking.id,
      "Change of plans",
    );

    expect(cancelled.status).toBe(BookingStatus.CANCELLED);
  });

  it("refuses to let a stranger cancel someone else's booking", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 10 });

    const booking = await container.bookings.createBooking(actor({ userId: "usr_guest" }), {
      eventId: event.id,
      primaryGuestName: "Wanjiru Kariuki",
      email: "wanjiru@example.co.ke",
      guestCount: 1,
    });

    await expect(
      container.bookings.cancelBooking(actor({ userId: "usr_stranger" }), booking.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const unchanged = await container.uow.repos.bookings.findById(booking.id);
    expect(unchanged?.status).toBe(BookingStatus.CONFIRMED);
  });

  it("lets organizer staff cancel a booking on a guest's behalf", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 10 });

    const booking = await container.bookings.createBooking(actor({ userId: "usr_guest" }), {
      eventId: event.id,
      primaryGuestName: "Wanjiru Kariuki",
      email: "wanjiru@example.co.ke",
      guestCount: 1,
    });

    const cancelled = await container.bookings.cancelBooking(
      actor({ userId: "usr_staff", organizerId: "org_test" }),
      booking.id,
    );

    expect(cancelled.status).toBe(BookingStatus.CANCELLED);
  });

  it("refuses to cancel a booking that is already cancelled", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 10 });

    const booking = await container.bookings.createBooking(actor({ userId: "usr_guest" }), {
      eventId: event.id,
      primaryGuestName: "Wanjiru Kariuki",
      email: "wanjiru@example.co.ke",
      guestCount: 1,
    });
    await container.bookings.cancelBooking(actor({ userId: "usr_guest" }), booking.id);

    await expect(
      container.bookings.cancelBooking(actor({ userId: "usr_guest" }), booking.id),
    ).rejects.toThrow();
  });

  it("frees the seat for the waitlist when a confirmed guest cancels", async () => {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, { capacity: 1 });

    const confirmed = await container.bookings.createBooking(actor({ userId: "usr_first" }), {
      eventId: event.id,
      primaryGuestName: "First Guest",
      email: "first@example.co.ke",
      guestCount: 1,
    });
    const waitlisted = await container.bookings.createBooking(actor({ userId: "usr_second" }), {
      eventId: event.id,
      primaryGuestName: "Second Guest",
      email: "second@example.co.ke",
      guestCount: 1,
    });
    expect(waitlisted.status).toBe(BookingStatus.WAITLISTED);

    await container.bookings.cancelBooking(actor({ userId: "usr_first" }), confirmed.id);

    const promoted = await container.uow.repos.bookings.findById(waitlisted.id);
    expect(promoted?.status).toBe(BookingStatus.CONFIRMED);
  });
});

describe("private invitations", () => {
  async function inviteFixture() {
    const container = freshContainer();
    const event = await seedCapacityEvent(container, {
      capacity: 200,
      type: EventType.PRIVATE_INVITATION,
      eventId: "evt_ruracio_test",
    });

    const { invite, token } = await container.bookings.issueInvite(actor(), {
      eventId: event.id,
      inviteeName: "Peter Kimani",
      email: "peter@example.co.ke",
      maxGuests: 3,
      expiresAt: addDays(new Date().toISOString(), 10),
    });

    return { container, event, invite, token };
  }

  it("stores only a hash of the token, never the token itself", async () => {
    const { invite, token } = await inviteFixture();
    expect(invite.tokenHash).not.toBe(token);
    expect(invite.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts a valid invitation and marks it used", async () => {
    const { container, event, invite, token } = await inviteFixture();

    const booking = await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Peter Kimani",
      email: "peter@example.co.ke",
      guestCount: 2,
      inviteToken: token,
    });

    expect(booking.status).toBe(BookingStatus.CONFIRMED);

    const used = await container.uow.repos.invites.findById(invite.id);
    expect(used?.status).toBe(InviteStatus.ACCEPTED);
    expect(used?.bookingId).toBe(booking.id);
  });

  it("refuses a second use of the same invitation", async () => {
    const { container, event, token } = await inviteFixture();

    await container.bookings.createBooking(actor({ userId: null }), {
      eventId: event.id,
      primaryGuestName: "Peter Kimani",
      email: "peter@example.co.ke",
      guestCount: 1,
      inviteToken: token,
    });

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Someone Else",
        email: "else@example.co.ke",
        guestCount: 1,
        inviteToken: token,
      }),
    ).rejects.toThrow(/already been used/i);
  });

  it("enforces the guest allowance on the invitation", async () => {
    const { container, event, token } = await inviteFixture();

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Peter Kimani",
        email: "peter@example.co.ke",
        guestCount: 5,
        inviteToken: token,
      }),
    ).rejects.toThrow(/covers up to 3 guests/i);
  });

  it("refuses an unknown or revoked invitation code", async () => {
    const { container, event, invite, token } = await inviteFixture();

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Gatecrasher",
        email: "crash@example.co.ke",
        guestCount: 1,
        inviteToken: "not-a-real-token",
      }),
    ).rejects.toThrow(/not recognised/i);

    await container.bookings.revokeInvite(actor(), invite.id);

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Peter Kimani",
        email: "peter@example.co.ke",
        guestCount: 1,
        inviteToken: token,
      }),
    ).rejects.toThrow(/withdrawn/i);
  });

  it("refuses to RSVP to an invitation-only event without a code", async () => {
    const { container, event } = await inviteFixture();

    await expect(
      container.bookings.createBooking(actor({ userId: null }), {
        eventId: event.id,
        primaryGuestName: "Uninvited",
        email: "uninvited@example.co.ke",
        guestCount: 1,
      }),
    ).rejects.toThrow(/invitation only/i);
  });
});
