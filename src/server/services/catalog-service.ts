import { EventType, EventVisibility, TicketStatus } from "@/domain/enums";
import { notFound } from "@/domain/errors";
import { money, type Money } from "@/domain/money";
import type {
  Booking,
  Event,
  EventOccurrence,
  EventSummary,
  Organizer,
  ResaleListing,
  Ticket,
  TicketType,
  Venue,
} from "@/domain/types";
import type { EventQuery, UnitOfWork } from "../repositories/types";

/**
 * Read model for the consumer and organizer UI.
 *
 * Server components call this directly rather than going through HTTP — there
 * is no reason to serialize a request to ourselves — while the REST API in
 * `app/api/v1` wraps the same methods for external clients.
 */

export interface EventDetail extends EventSummary {
  occurrences: EventOccurrence[];
  resaleListings: ResaleListing[];
  tablesAvailable: number | null;
}

export class CatalogService {
  constructor(private readonly uow: UnitOfWork) {}

  async summarise(event: Event): Promise<EventSummary> {
    const repos = this.uow.repos;
    const [organizer, venue, ticketTypes] = await Promise.all([
      repos.organizers.findById(event.organizerId),
      repos.venues.findById(event.venueId),
      repos.ticketTypes.listByEvent(event.id),
    ]);
    if (!organizer) throw notFound("Organizer", event.organizerId);
    if (!venue) throw notFound("Venue", event.venueId);

    let fromPrice: Money | null = null;
    let availableUnits = 0;
    for (const ticketType of ticketTypes) {
      const available = await repos.inventory.countAvailable(ticketType.id);
      availableUnits += available;
      if (available > 0 && (fromPrice === null || ticketType.price.amount < fromPrice.amount)) {
        fromPrice = ticketType.price;
      }
    }
    // Every tier gone: still show the cheapest price, marked sold out.
    if (fromPrice === null && ticketTypes.length > 0) {
      fromPrice = ticketTypes.reduce(
        (cheapest, type) => (type.price.amount < cheapest.amount ? type.price : cheapest),
        ticketTypes[0]!.price,
      );
    }

    let remainingCapacity: number | null = null;
    if (event.capacity !== null) {
      const taken = await repos.bookings.countConfirmedGuests(event.id, null);
      remainingCapacity = Math.max(0, event.capacity - taken);
    }

    const soldOut =
      ticketTypes.length > 0
        ? availableUnits === 0
        : remainingCapacity !== null && remainingCapacity === 0;

    return { event, organizer, venue, ticketTypes, fromPrice, remainingCapacity, soldOut };
  }

  async summariseMany(events: Event[]): Promise<EventSummary[]> {
    return Promise.all(events.map((event) => this.summarise(event)));
  }

  async search(query: EventQuery): Promise<{ items: EventSummary[]; nextCursor: string | null }> {
    const { items, nextCursor } = await this.uow.repos.events.query(query);
    return { items: await this.summariseMany(items), nextCursor };
  }

  /**
   * Public event detail.
   *
   * Only PUBLIC and UNLISTED events are reachable by slug. An invitation-only
   * event has no public page at all — it lives at `/i/[token]` and is resolved
   * from the invitation, so guessing a slug reveals nothing.
   */
  async getBySlug(slug: string): Promise<EventDetail | null> {
    const event = await this.uow.repos.events.findBySlug(slug);
    if (!event) return null;
    if (
      event.visibility !== EventVisibility.PUBLIC &&
      event.visibility !== EventVisibility.UNLISTED
    ) {
      return null;
    }
    const summary = await this.summarise(event);
    const [occurrences, listings, tables] = await Promise.all([
      this.uow.repos.events.listOccurrences(event.id),
      this.uow.repos.listings.listByEvent(event.id),
      this.uow.repos.tables.listByEvent(event.id),
    ]);

    let tablesAvailable: number | null = null;
    if (tables.length > 0) {
      let free = 0;
      for (const table of tables) {
        let seatsTaken = 0;
        for (const bookingId of table.assignedBookingIds) {
          const booking = await this.uow.repos.bookings.findById(bookingId);
          if (booking && booking.status !== "CANCELLED" && booking.status !== "DECLINED") {
            seatsTaken += booking.guestCount;
          }
        }
        if (seatsTaken < table.seats) free += 1;
      }
      tablesAvailable = free;
    }

    return {
      ...summary,
      occurrences,
      resaleListings: listings.filter((listing) => listing.status === "ACTIVE"),
      tablesAvailable,
    };
  }

  /* ------------------------------- Homepage ------------------------------ */

  async featured(limit = 5): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({ featuredOnly: true, limit });
    return this.summariseMany(items);
  }

  async thisWeekend(limit = 8): Promise<EventSummary[]> {
    const now = new Date();
    const day = now.getDay();
    const daysToFriday = (5 - day + 7) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() + daysToFriday);
    friday.setHours(0, 0, 0, 0);
    const monday = new Date(friday);
    monday.setDate(friday.getDate() + 3);

    const { items } = await this.uow.repos.events.query({
      from: friday.toISOString(),
      to: monday.toISOString(),
      limit,
    });
    return this.summariseMany(items);
  }

  async freeEvents(limit = 8): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({ freeOnly: true, limit });
    return this.summariseMany(items);
  }

  /**
   * Social and bookable events for the homepage.
   *
   * Deliberately does NOT set `includeNonPublic`. A ruracio, a wedding
   * reception or a family gathering is nobody else's business, and a private
   * event must never appear on a discovery surface — the repository enforces
   * that too, but the call site should be obviously correct on its own.
   */
  async socialAndBookable(limit = 8): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({
      types: [
        EventType.BANQUET,
        EventType.RECURRING_MEETING,
        EventType.BOOKING,
        EventType.PRIVATE_INVITATION,
      ],
      limit,
    });
    return this.summariseMany(items);
  }

  async byCategory(category: string, limit = 8): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({ category, limit });
    return this.summariseMany(items);
  }

  async trendingIn(city: string, limit = 8): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({ city, limit });
    return this.summariseMany(items);
  }

  async cityCounts(cities: string[]): Promise<Array<{ city: string; count: number }>> {
    const results: Array<{ city: string; count: number }> = [];
    for (const city of cities) {
      const { items } = await this.uow.repos.events.query({ city, limit: 200 });
      results.push({ city, count: items.length });
    }
    return results;
  }

  /* -------------------------------- Account ------------------------------ */

  async ticketsForUser(userId: string): Promise<
    Array<{ ticket: Ticket; event: Event; venue: Venue; ticketType: TicketType | null }>
  > {
    const tickets = await this.uow.repos.tickets.listByOwner(userId);
    const out = [];
    for (const ticket of tickets) {
      const event = await this.uow.repos.events.findById(ticket.eventId);
      if (!event) continue;
      const venue = await this.uow.repos.venues.findById(event.venueId);
      if (!venue) continue;
      const ticketType = await this.uow.repos.ticketTypes.findById(ticket.ticketTypeId);
      out.push({ ticket, event, venue, ticketType });
    }
    return out.sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  }

  async bookingsForUser(
    userId: string,
    email?: string,
  ): Promise<Array<{ booking: Booking; event: Event; venue: Venue }>> {
    const byUser = await this.uow.repos.bookings.listByUser(userId);
    const byEmail = email ? await this.uow.repos.bookings.listByEmail(email) : [];
    const unique = new Map<string, Booking>();
    for (const booking of [...byUser, ...byEmail]) unique.set(booking.id, booking);

    const out = [];
    for (const booking of unique.values()) {
      const event = await this.uow.repos.events.findById(booking.eventId);
      if (!event) continue;
      const venue = await this.uow.repos.venues.findById(event.venueId);
      if (!venue) continue;
      out.push({ booking, event, venue });
    }
    return out.sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  }

  async listingsForUser(
    userId: string,
  ): Promise<Array<{ listing: ResaleListing; event: Event; ticket: Ticket | null }>> {
    const listings = await this.uow.repos.listings.listBySeller(userId);
    const out = [];
    for (const listing of listings) {
      const event = await this.uow.repos.events.findById(listing.eventId);
      if (!event) continue;
      const ticket = await this.uow.repos.tickets.findById(listing.ticketId);
      out.push({ listing, event, ticket });
    }
    return out;
  }

  /* ------------------------------- Organizer ----------------------------- */

  async organizerEvents(organizerId: string): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });
    return this.summariseMany(items);
  }

  async organizerDashboard(organizerId: string): Promise<OrganizerDashboard> {
    const repos = this.uow.repos;
    const { items: events } = await repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });
    const now = new Date().toISOString();

    let grossRevenue = 0;
    let ticketsSold = 0;
    let bookings = 0;
    let rsvps = 0;
    let guestsConfirmed = 0;
    let checkIns = 0;
    let upcoming = 0;
    const currency = "KES" as const;

    for (const event of events) {
      if (event.startsAt >= now && event.status !== "CANCELLED") upcoming += 1;

      for (const order of await repos.orders.listByEvent(event.id)) {
        if (order.status === "FULFILLED" || order.status === "PAID") {
          grossRevenue += order.total.amount;
        }
      }

      const eventTickets = await repos.tickets.listByEvent(event.id);
      ticketsSold += eventTickets.filter(
        (ticket) =>
          ticket.status !== TicketStatus.CANCELLED && ticket.status !== TicketStatus.REFUNDED,
      ).length;

      const eventBookings = await repos.bookings.listByEvent(event.id);
      for (const booking of eventBookings) {
        if (booking.status === "CANCELLED" || booking.status === "DECLINED") continue;
        bookings += 1;
        if (event.type === EventType.FREE_RSVP) rsvps += 1;
        if (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") {
          guestsConfirmed += booking.guestCount;
        }
      }

      checkIns += (await repos.checkins.listByEvent(event.id)).filter(
        (checkIn) => checkIn.result === "ADMITTED",
      ).length;
    }

    const payouts = await repos.payouts.listByOrganizer(organizerId);
    const pendingPayout = payouts
      .filter((payout) => payout.status !== "PAID" && payout.status !== "REVERSED")
      .reduce((total, payout) => total + payout.amount.amount, 0);

    return {
      grossRevenue: money(grossRevenue, currency),
      ticketsSold,
      bookings,
      rsvps,
      guestsConfirmed,
      upcomingEvents: upcoming,
      checkIns,
      pendingPayout: money(pendingPayout, currency),
    };
  }

  async guestList(eventId: string): Promise<GuestListView> {
    const repos = this.uow.repos;
    const event = await repos.events.findById(eventId);
    if (!event) throw notFound("Event", eventId);

    const bookings = await repos.bookings.listByEvent(eventId);
    const tables = await repos.tables.listByEvent(eventId);

    const counts = {
      confirmed: 0,
      pending: 0,
      declined: 0,
      waitlist: 0,
      checkedIn: 0,
    };
    let guestsCounted = 0;

    for (const booking of bookings) {
      switch (booking.status) {
        case "CONFIRMED":
          counts.confirmed += 1;
          guestsCounted += booking.guestCount;
          break;
        case "PENDING":
          counts.pending += 1;
          guestsCounted += booking.guestCount;
          break;
        case "DECLINED":
          counts.declined += 1;
          break;
        case "WAITLISTED":
          counts.waitlist += 1;
          break;
        case "CHECKED_IN":
          counts.checkedIn += 1;
          guestsCounted += booking.guestCount;
          break;
        default:
          break;
      }
    }

    return {
      event,
      bookings,
      tables,
      confirmed: counts.confirmed,
      pending: counts.pending,
      declined: counts.declined,
      waitlist: counts.waitlist,
      checkedIn: counts.checkedIn,
      capacityRemaining:
        event.capacity === null ? null : Math.max(0, event.capacity - guestsCounted),
    };
  }

  async organizer(organizerId: string): Promise<Organizer> {
    const organizer = await this.uow.repos.organizers.findById(organizerId);
    if (!organizer) throw notFound("Organizer", organizerId);
    return organizer;
  }
}

export interface OrganizerDashboard {
  grossRevenue: Money;
  ticketsSold: number;
  bookings: number;
  rsvps: number;
  guestsConfirmed: number;
  upcomingEvents: number;
  checkIns: number;
  pendingPayout: Money;
}

export interface GuestListView {
  event: Event;
  bookings: Booking[];
  tables: Awaited<ReturnType<UnitOfWork["repos"]["tables"]["listByEvent"]>>;
  confirmed: number;
  pending: number;
  declined: number;
  waitlist: number;
  checkedIn: number;
  capacityRemaining: number | null;
}
