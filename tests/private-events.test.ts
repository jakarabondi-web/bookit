import { describe, expect, it } from "vitest";
import { BookingStatus, EventType, EventVisibility, InviteStatus } from "@/domain/enums";
import { kes } from "@/domain/money";
import { defaultPrivatePage } from "@/domain/private-event";
import { addDays } from "@/server/lib/clock";
import { actor, freshContainer, seedCapacityEvent } from "./helpers";
import type { Container } from "@/server/container";

/**
 * The promise a private event makes: it is not listed anywhere, it has no
 * public page, and the invitation token is the only key. These tests exist to
 * stop that promise being broken by accident later.
 */

async function privateEventFixture(
  visibility: EventVisibility = EventVisibility.INVITE_CODE_REQUIRED,
) {
  const container = freshContainer();
  const event = await seedCapacityEvent(container, {
    capacity: 200,
    type: EventType.PRIVATE_INVITATION,
    eventId: "evt_private",
  });
  await container.uow.repos.events.update(event.id, { visibility });
  await container.uow.repos.venues.create({
    id: "ven_test",
    name: "Family Homestead",
    city: "Kiambu",
    area: "Githunguri",
    addressLine: "Githunguri, Kiambu",
    capacity: 300,
    latitude: null,
    longitude: null,
    sections: [],
  });
  await container.uow.repos.organizers.create({
    id: "org_test",
    name: "Wanjiku Family",
    slug: "wanjiku-family",
    type: "INDIVIDUAL",
    about: "",
    logoUrl: null,
    verification: "PENDING",
    trustTier: "NEW",
    supportEmail: "family@example.co.ke",
    supportPhone: "+254700000009",
    members: [],
    createdAt: new Date().toISOString(),
  });

  const host = actor({ organizerId: "org_test", mfaSatisfied: true });

  const { token } = await container.bookings.issueInvite(host, {
    eventId: event.id,
    inviteeName: "Peter Kimani",
    email: "peter@example.co.ke",
    maxGuests: 3,
    expiresAt: addDays(new Date().toISOString(), 20),
  });

  return { container, event, host, token };
}

describe("private events are not discoverable", () => {
  it("never appears in any homepage rail", async () => {
    const { container, event } = await privateEventFixture();

    const rails = await Promise.all([
      container.catalog.featured(50),
      container.catalog.thisWeekend(50),
      container.catalog.freeEvents(50),
      container.catalog.socialAndBookable(50),
      container.catalog.trendingIn("Kiambu", 50),
      container.catalog.byCategory("COMMUNITY", 50),
    ]);

    for (const rail of rails) {
      expect(rail.map((entry) => entry.event.id)).not.toContain(event.id);
    }
  });

  it("never appears in a search, even a matching one", async () => {
    const { container, event } = await privateEventFixture();

    const byText = await container.catalog.search({ search: "Capacity Event", limit: 50 });
    const byCity = await container.catalog.search({ city: "Kiambu", limit: 50 });
    const byType = await container.catalog.search({
      types: [EventType.PRIVATE_INVITATION],
      limit: 50,
    });

    for (const result of [byText, byCity, byType]) {
      expect(result.items.map((entry) => entry.event.id)).not.toContain(event.id);
    }
  });

  it("is not returned even when a caller asks for non-public events", async () => {
    const { container, event } = await privateEventFixture();

    // The repository only honours `includeNonPublic` for an organizer-scoped
    // query, so a discovery surface cannot widen its own visibility.
    const leaky = await container.uow.repos.events.query({
      includeNonPublic: true,
      limit: 50,
    });
    expect(leaky.items.map((entry) => entry.id)).not.toContain(event.id);

    // Scoped to the owning organizer, it is visible — that is the only way.
    const owned = await container.uow.repos.events.query({
      organizerId: "org_test",
      includeNonPublic: true,
      limit: 50,
    });
    expect(owned.items.map((entry) => entry.id)).toContain(event.id);
  });

  it("has no public event page, even with the exact slug", async () => {
    const { container, event } = await privateEventFixture();
    expect(await container.catalog.getBySlug(event.slug)).toBeNull();
  });

  it("still exposes an unlisted event by slug — that is what unlisted means", async () => {
    const { container, event } = await privateEventFixture(EventVisibility.UNLISTED);
    const detail = await container.catalog.getBySlug(event.slug);
    expect(detail?.event.id).toBe(event.id);
  });

  it("is excluded from city counts shown on the homepage", async () => {
    const { container } = await privateEventFixture();
    const counts = await container.catalog.cityCounts(["Kiambu"]);
    expect(counts[0]?.count).toBe(0);
  });
});

describe("invitation access", () => {
  it("resolves the microsite from a valid token", async () => {
    const { container, event, token } = await privateEventFixture();

    const context = await container.privateEvents.resolveInvite(token);
    expect(context).not.toBeNull();
    expect(context?.event.id).toBe(event.id);
    expect(context?.invite.inviteeName).toBe("Peter Kimani");
  });

  it("returns nothing for an unknown token", async () => {
    const { container } = await privateEventFixture();
    expect(await container.privateEvents.resolveInvite("not-a-real-token")).toBeNull();
  });

  it("returns nothing once an invitation is revoked", async () => {
    const { container, host, token } = await privateEventFixture();
    const context = await container.privateEvents.resolveInvite(token);
    await container.bookings.revokeInvite(host, context!.invite.id);

    expect(await container.privateEvents.resolveInvite(token)).toBeNull();
  });

  it("marks the invitation viewed the first time it is opened", async () => {
    const { container, token } = await privateEventFixture();

    const first = await container.privateEvents.resolveInvite(token);
    expect(first?.invite.status).toBe(InviteStatus.ISSUED);

    const second = await container.privateEvents.resolveInvite(token);
    expect(second?.invite.status).toBe(InviteStatus.VIEWED);
  });

  it("refuses to resolve a token against a public event", async () => {
    const { container, event, token } = await privateEventFixture();
    await container.uow.repos.events.update(event.id, {
      visibility: EventVisibility.PUBLIC,
    });
    expect(await container.privateEvents.resolveInvite(token)).toBeNull();
  });
});

describe("responding to an invitation", () => {
  it("accepts and creates a booking for the invited guest", async () => {
    const { container, token } = await privateEventFixture();

    const result = await container.privateEvents.respondToInvite(token, {
      attending: true,
      guestCount: 2,
      mealChoice: "Fish",
      message: "Would not miss it.",
    });

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(result.booking?.guestCount).toBe(2);
    expect(result.booking?.primaryGuestName).toBe("Peter Kimani");
  });

  it("refuses more guests than the invitation allows", async () => {
    const { container, token } = await privateEventFixture();

    await expect(
      container.privateEvents.respondToInvite(token, { attending: true, guestCount: 9 }),
    ).rejects.toThrow(/covers up to 3 guests/i);
  });

  it("records a decline without consuming capacity", async () => {
    const { container, event, token } = await privateEventFixture();

    const result = await container.privateEvents.respondToInvite(token, {
      attending: false,
      guestCount: 0,
    });

    expect(result.status).toBe("DECLINED");
    expect(await container.uow.repos.bookings.countConfirmedGuests(event.id, null)).toBe(0);
  });

  it("updates the existing booking when a guest changes their answer", async () => {
    const { container, token } = await privateEventFixture();

    const first = await container.privateEvents.respondToInvite(token, {
      attending: true,
      guestCount: 1,
    });
    const second = await container.privateEvents.respondToInvite(token, {
      attending: true,
      guestCount: 3,
    });

    expect(second.booking?.id).toBe(first.booking?.id);
    expect(second.booking?.guestCount).toBe(3);

    const bookings = await container.uow.repos.bookings.listByEvent("evt_private");
    expect(bookings).toHaveLength(1);
  });

  it("holds a guest's note back until the hosts approve it", async () => {
    const { container, token } = await privateEventFixture();

    await container.privateEvents.respondToInvite(token, {
      attending: true,
      guestCount: 1,
      message: "Congratulations!",
    });

    const messages = await container.privateEvents.listMessages("evt_private");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.approved).toBe(false);

    // And it is not visible to other guests until approved.
    const context = await container.privateEvents.resolveInvite(token);
    expect(context?.messages).toHaveLength(0);
  });

  it("closes the RSVP after the deadline", async () => {
    const { container, host, token } = await privateEventFixture();
    await container.privateEvents.savePage(host, "evt_private", {
      rsvp: {
        ...defaultPrivatePage("evt_private", { title: "", startsAt: "" }).rsvp,
        deadline: addDays(new Date().toISOString(), -1),
      },
    });

    await expect(
      container.privateEvents.respondToInvite(token, { attending: true, guestCount: 1 }),
    ).rejects.toThrow(/closed/i);
  });
});

describe("gift registry", () => {
  async function withGifts(container: Container, host: ReturnType<typeof actor>) {
    await container.privateEvents.savePage(host, "evt_private", {
      giftRegistryEnabled: true,
    });
    await container.privateEvents.saveGift(host, "evt_private", {
      id: "gft_1",
      kind: "ITEM",
      title: "Dining set",
      description: null,
      imageUrl: null,
      externalUrl: null,
      price: kes(65000),
      quantityWanted: 1,
      quantityClaimed: 0,
      contributed: null,
      payToNumber: null,
      sortOrder: 0,
      archived: false,
    });
    await container.privateEvents.saveGift(host, "evt_private", {
      id: "gft_cash",
      kind: "CASH_FUND",
      title: "Honeymoon fund",
      description: null,
      imageUrl: null,
      externalUrl: null,
      price: kes(200000),
      quantityWanted: 1,
      quantityClaimed: 0,
      contributed: kes(0),
      payToNumber: "Till 12345",
      sortOrder: 1,
      archived: false,
    });
  }

  it("lets a guest claim an item", async () => {
    const { container, host, token } = await privateEventFixture();
    await withGifts(container, host);

    const claim = await container.privateEvents.claimGift(token, { giftId: "gft_1" });
    expect(claim.quantity).toBe(1);

    const gift = await container.uow.repos.privateEvents.findGift("gft_1");
    expect(gift?.quantityClaimed).toBe(1);
  });

  it("stops two guests claiming the same last item", async () => {
    const { container, host, token } = await privateEventFixture();
    await withGifts(container, host);

    const second = await container.bookings.issueInvite(host, {
      eventId: "evt_private",
      inviteeName: "Aisha Mohamed",
      email: "aisha@example.co.ke",
      maxGuests: 1,
      expiresAt: addDays(new Date().toISOString(), 20),
    });

    await container.privateEvents.claimGift(token, { giftId: "gft_1" });

    await expect(
      container.privateEvents.claimGift(second.token, { giftId: "gft_1" }),
    ).rejects.toThrow(/already claimed/i);
  });

  it("adds up contributions to a cash fund", async () => {
    const { container, host, token } = await privateEventFixture();
    await withGifts(container, host);

    await container.privateEvents.claimGift(token, {
      giftId: "gft_cash",
      amount: kes(5000),
    });

    const gift = await container.uow.repos.privateEvents.findGift("gft_cash");
    expect(gift?.contributed?.amount).toBe(kes(5000).amount);
  });

  it("refuses a gift claim without a valid invitation", async () => {
    const { container, host } = await privateEventFixture();
    await withGifts(container, host);

    await expect(
      container.privateEvents.claimGift("forged-token", { giftId: "gft_1" }),
    ).rejects.toThrow(/not recognised/i);
  });
});

describe("host tools", () => {
  it("refuses to open the studio for another organizer's event", async () => {
    const { container } = await privateEventFixture();

    await expect(
      container.privateEvents.getPageForHost(
        actor({ organizerId: "org_someone_else" }),
        "evt_private",
      ),
    ).rejects.toThrow(/another organizer/i);
  });

  it("refuses private tools on a public event", async () => {
    const { container, host, event } = await privateEventFixture();
    await container.uow.repos.events.update(event.id, {
      visibility: EventVisibility.PUBLIC,
    });

    await expect(
      container.privateEvents.getPageForHost(host, event.id),
    ).rejects.toThrow(/public event/i);
  });

  it("issues one distinct link per guest and never repeats it", async () => {
    const { container, host } = await privateEventFixture();

    const issued = await container.privateEvents.issueInvitations(
      host,
      "evt_private",
      [
        { name: "Aisha Mohamed", email: "aisha@example.co.ke", maxGuests: 2 },
        { name: "Joseph Barasa", phone: "+254700000123", maxGuests: 1 },
      ],
      { expiresAt: addDays(new Date().toISOString(), 30) },
    );

    expect(issued).toHaveLength(2);
    expect(new Set(issued.map((entry) => entry.link)).size).toBe(2);

    // Each link resolves to its own invitation, with its own allowance.
    for (const entry of issued) {
      const token = entry.link.split("/i/")[1]!;
      const context = await container.privateEvents.resolveInvite(token);
      expect(context?.invite.inviteeName).toBe(entry.name);
    }
  });

  it("targets a broadcast at the segment the host chose", async () => {
    const { container, host, token } = await privateEventFixture();
    await container.privateEvents.respondToInvite(token, { attending: true, guestCount: 1 });

    const confirmed = await container.privateEvents.sendBroadcast(host, "evt_private", {
      channel: "SMS",
      audience: "CONFIRMED",
      subject: "The bus",
      body: "Leaves at 8:30 AM sharp.",
    });
    expect(confirmed.recipientCount).toBe(1);

    const declined = await container.privateEvents.sendBroadcast(host, "evt_private", {
      channel: "EMAIL",
      audience: "DECLINED",
      subject: "Sorry to miss you",
      body: "We will send photographs.",
    });
    expect(declined.recipientCount).toBe(0);
  });

  it("refuses to broadcast for an event the actor does not own", async () => {
    const { container } = await privateEventFixture();

    await expect(
      container.privateEvents.sendBroadcast(actor({ organizerId: "org_other" }), "evt_private", {
        channel: "SMS",
        audience: "ALL",
        subject: "Hello",
        body: "Hello",
      }),
    ).rejects.toThrow(/another organizer/i);
  });
});
