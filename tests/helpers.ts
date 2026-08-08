import { EventStatus, EventType, EventVisibility, InventoryState } from "@/domain/enums";
import { kes } from "@/domain/money";
import type { ActorContext, Event, InventoryUnit, TicketType } from "@/domain/types";
import { createContainer, type Container } from "@/server/container";

/**
 * Test fixtures.
 *
 * Every test builds its own container with the demo seed switched off, so tests
 * never depend on seed data and never interfere with each other.
 */

export function freshContainer(): Container {
  return createContainer({ seed: false });
}

export const actor = (overrides: Partial<ActorContext> = {}): ActorContext => ({
  userId: "usr_test",
  roles: ["CONSUMER"],
  organizerId: null,
  ip: "127.0.0.1",
  sessionId: "sess_test",
  mfaSatisfied: false,
  deviceId: "dev_test",
  ...overrides,
});

export interface EventFixture {
  event: Event;
  ticketType: TicketType;
}

/** Creates an organizer, venue, event, ticket type and `quantity` inventory units. */
export async function seedTicketedEvent(
  container: Container,
  options: {
    quantity: number;
    priceMajor?: number;
    maxPerAccount?: number;
    resaleEnabled?: boolean;
    resaleMaxMarkupBps?: number;
    eventId?: string;
  },
): Promise<EventFixture> {
  const repos = container.uow.repos;
  const eventId = options.eventId ?? "evt_test";
  const now = new Date();
  const iso = (days: number) =>
    new Date(now.getTime() + days * 86_400_000).toISOString();

  await repos.users.create({
    id: "usr_test",
    email: "buyer@example.co.ke",
    emailVerifiedAt: iso(-10),
    phone: "+254700000001",
    phoneVerifiedAt: iso(-10),
    fullName: "Test Buyer",
    avatarUrl: null,
    city: "Nairobi",
    roles: ["CONSUMER"],
    mfaEnabled: false,
    createdAt: iso(-10),
  });

  await repos.users.create({
    id: "usr_other",
    email: "other@example.co.ke",
    emailVerifiedAt: iso(-10),
    phone: "+254700000002",
    phoneVerifiedAt: iso(-10),
    fullName: "Other Person",
    avatarUrl: null,
    city: "Nairobi",
    roles: ["CONSUMER"],
    mfaEnabled: false,
    createdAt: iso(-10),
  });

  if (!(await repos.organizers.findById("org_test"))) {
    await repos.organizers.create({
      id: "org_test",
      name: "Test Organizer",
      slug: "test-organizer",
      type: "BUSINESS",
      about: "",
      logoUrl: null,
      verification: "VERIFIED",
      trustTier: "NEW",
      supportEmail: "support@test.co.ke",
      supportPhone: "+254700000009",
      members: [],
      createdAt: iso(-100),
    });
    await repos.venues.create({
      id: "ven_test",
      name: "Test Venue",
      city: "Nairobi",
      area: "CBD",
      addressLine: "Nairobi",
      capacity: 1000,
      latitude: null,
      longitude: null,
      sections: [],
    });
  }

  const event: Event = {
    id: eventId,
    slug: `${eventId}-slug`,
    title: "Test Event",
    subtitle: null,
    description: "A test event.",
    type: EventType.PAID_TICKET,
    status: EventStatus.ON_SALE,
    visibility: EventVisibility.PUBLIC,
    category: "CONCERTS",
    tags: [],
    organizerId: "org_test",
    venueId: "ven_test",
    startsAt: iso(30),
    endsAt: iso(31),
    heroImage: "/assets/images/hero-concert.jpg",
    cardImage: "/assets/images/hero-concert.jpg",
    capacity: null,
    policies: {
      refundPolicy: "Refundable up to 7 days before.",
      transferAllowed: true,
      resaleEnabled: options.resaleEnabled ?? false,
      resaleMaxMarkupBps: options.resaleMaxMarkupBps ?? 0,
      resaleOpensAt: null,
      resaleClosesAt: null,
      maxListingsPerAccount: 2,
      sellerPayoutDelayHours: 48,
      maxTicketsPerAccount: options.maxPerAccount ?? 6,
      ageRestriction: null,
      entryRules: [],
    },
    agenda: [],
    recurrence: null,
    featured: false,
    createdAt: iso(-20),
  };
  await repos.events.create(event);

  const ticketType: TicketType = {
    id: `tt_${eventId}`,
    eventId,
    name: "General Admission",
    description: null,
    price: kes(options.priceMajor ?? 1000),
    quantity: options.quantity,
    minPerOrder: 1,
    maxPerOrder: 10,
    salesStartAt: iso(-10),
    salesEndAt: iso(29),
    sectionId: null,
    sortOrder: 0,
  };
  await repos.ticketTypes.create(ticketType);

  const units: InventoryUnit[] = Array.from({ length: options.quantity }, (_, index) => ({
    id: `inv_${eventId}_${index}`,
    ticketTypeId: ticketType.id,
    eventId,
    state: InventoryState.AVAILABLE,
    holdId: null,
    ticketId: null,
    seatLabel: null,
  }));
  await repos.inventory.createUnits(units);

  return { event, ticketType };
}

/** Builds a booking-style event with a fixed capacity. */
export async function seedCapacityEvent(
  container: Container,
  options: { capacity: number; type?: EventType; eventId?: string },
): Promise<Event> {
  const eventId = options.eventId ?? "evt_rsvp";
  const now = new Date();
  const iso = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

  const event: Event = {
    id: eventId,
    slug: `${eventId}-slug`,
    title: "Capacity Event",
    subtitle: null,
    description: "An RSVP event.",
    type: options.type ?? EventType.FREE_RSVP,
    status: EventStatus.ON_SALE,
    visibility: EventVisibility.PUBLIC,
    category: "COMMUNITY",
    tags: [],
    organizerId: "org_test",
    venueId: "ven_test",
    startsAt: iso(14),
    endsAt: iso(14),
    heroImage: "/assets/images/event-conference.jpg",
    cardImage: "/assets/images/event-conference.jpg",
    capacity: options.capacity,
    policies: {
      refundPolicy: "Free event.",
      transferAllowed: false,
      resaleEnabled: false,
      resaleMaxMarkupBps: 0,
      resaleOpensAt: null,
      resaleClosesAt: null,
      maxListingsPerAccount: 0,
      sellerPayoutDelayHours: 0,
      maxTicketsPerAccount: 10,
      ageRestriction: null,
      entryRules: [],
    },
    agenda: [],
    recurrence: null,
    featured: false,
    createdAt: iso(-5),
  };

  await container.uow.repos.events.create(event);
  return event;
}
