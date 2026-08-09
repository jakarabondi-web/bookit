import { EventType, EventVisibility, TicketStatus } from "@/domain/enums";
import { notFound } from "@/domain/errors";
import { money, percentageOf, type Money } from "@/domain/money";
import type {
  Booking,
  Event,
  EventOccurrence,
  EventSummary,
  Organizer,
  ResaleListing,
  Ticket,
  TicketTransfer,
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

  /**
   * The next events to start, soonest first — the home page's "tonight" rail.
   * Time-sorted rather than date-fenced so the rail never renders empty on a
   * quiet Tuesday.
   */
  async startingSoon(limit = 8): Promise<EventSummary[]> {
    const { items } = await this.uow.repos.events.query({
      from: new Date().toISOString(),
      limit,
    });
    return this.summariseMany(items);
  }

  /**
   * A venue's public page: the venue itself plus the events it is hosting.
   * Goes through `events.query`, so an invite-only wedding at this venue can
   * never surface here — a venue page is a discovery surface.
   */
  async venueDetail(
    venueId: string,
  ): Promise<{ venue: Venue; upcoming: EventSummary[]; past: EventSummary[] } | null> {
    const venue = await this.uow.repos.venues.findById(venueId);
    if (!venue) return null;

    const { items } = await this.uow.repos.events.query({ venueId, limit: 100 });
    const now = new Date().toISOString();
    const summaries = await this.summariseMany(items);

    return {
      venue,
      upcoming: summaries.filter((entry) => entry.event.endsAt >= now),
      past: summaries
        .filter((entry) => entry.event.endsAt < now)
        .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt)),
    };
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

  async ticketsForUser(userId: string): Promise<TicketRow[]> {
    const tickets = await this.uow.repos.tickets.listByOwner(userId);
    const now = new Date().toISOString();
    const out: TicketRow[] = [];

    for (const ticket of tickets) {
      const event = await this.uow.repos.events.findById(ticket.eventId);
      if (!event) continue;
      const venue = await this.uow.repos.venues.findById(event.venueId);
      if (!venue) continue;
      const ticketType = await this.uow.repos.ticketTypes.findById(ticket.ticketTypeId);

      // The UI needs the same limits the services enforce, so it can state
      // the resale cap up front instead of letting someone type a price that
      // is going to be rejected.
      const policy = event.policies;
      const maxResalePrice = money(
        ticket.facePrice.amount + percentageOf(ticket.facePrice, policy.resaleMaxMarkupBps).amount,
        ticket.facePrice.currency,
      );
      const resaleOpen =
        policy.resaleEnabled &&
        (!policy.resaleOpensAt || now >= policy.resaleOpensAt) &&
        (!policy.resaleClosesAt || now <= policy.resaleClosesAt);

      const transfers = await this.uow.repos.transfers.listByTicket(ticket.id);
      const pendingTransfer =
        transfers.find((transfer) => transfer.status === "PENDING") ?? null;
      const activeListing = await this.uow.repos.listings.findActiveByTicket(ticket.id);

      out.push({
        ticket,
        event,
        venue,
        ticketType,
        pendingTransfer,
        activeListing,
        maxResalePrice,
        resaleOpen,
      });
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

  /**
   * The USIKU overview: tonight's show (if any), per-event health, and the
   * two headline series compared week-over-week. Complements
   * `organizerDashboard`, which stays as the all-time totals feed.
   */
  async organizerOverview(organizerId: string): Promise<OrganizerOverview> {
    const repos = this.uow.repos;
    const { items: events } = await repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekAgo = new Date(now.getTime() - 7 * dayMs).toISOString();
    const twoWeeksAgo = new Date(now.getTime() - 14 * dayMs).toISOString();
    const endOfToday = new Date(now.getTime());
    endOfToday.setHours(23, 59, 59, 999);

    let revenue7d = 0;
    let revenuePrev7d = 0;
    let tickets7d = 0;
    let ticketsPrev7d = 0;
    /** Gross revenue per day, oldest first — the KPI sparkline. */
    const revenueByDay = new Array<number>(7).fill(0);

    const health: EventHealth[] = [];

    for (const event of events) {
      if (event.status === "CANCELLED") continue;

      let sold7dForEvent = 0;
      let soldPrev7dForEvent = 0;
      for (const order of await repos.orders.listByEvent(event.id)) {
        if (order.status !== "FULFILLED" && order.status !== "PAID") continue;
        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        if (order.createdAt >= weekAgo) {
          revenue7d += order.total.amount;
          tickets7d += units;
          sold7dForEvent += units;
          const dayIndex = Math.min(
            6,
            Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / dayMs),
          );
          revenueByDay[6 - dayIndex]! += order.total.amount;
        } else if (order.createdAt >= twoWeeksAgo) {
          revenuePrev7d += order.total.amount;
          ticketsPrev7d += units;
          soldPrev7dForEvent += units;
        }
      }

      if (event.endsAt < nowIso) continue;

      const ticketTypes = await repos.ticketTypes.listByEvent(event.id);
      let sold = 0;
      let capacity: number | null = null;
      if (ticketTypes.length > 0) {
        capacity = 0;
        for (const type of ticketTypes) {
          const available = await repos.inventory.countAvailable(type.id);
          capacity += type.quantity;
          sold += type.quantity - available;
        }
      } else if (event.capacity !== null) {
        capacity = event.capacity;
        sold = await repos.bookings.countConfirmedGuests(event.id, null);
      }

      const scanned = (await repos.checkins.listByEvent(event.id)).filter(
        (checkIn) => checkIn.result === "ADMITTED",
      ).length;

      health.push({
        event,
        venue: (await repos.venues.findById(event.venueId))!,
        sold,
        capacity,
        sold7d: sold7dForEvent,
        soldPrev7d: soldPrev7dForEvent,
        scanned,
        live: event.startsAt <= nowIso && event.endsAt >= nowIso,
        startsToday: event.startsAt >= nowIso && event.startsAt <= endOfToday.toISOString(),
      });
    }

    health.sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
    const tonight = health.find((entry) => entry.live) ?? health.find((entry) => entry.startsToday) ?? null;

    return {
      tonight,
      health: health.filter((entry) => entry !== tonight),
      revenue7d: money(revenue7d, "KES"),
      revenuePrev7d: money(revenuePrev7d, "KES"),
      tickets7d,
      ticketsPrev7d,
      revenueByDay,
    };
  }

  /**
   * Thirty days of sales, shaped for charts: a daily series, a same-length
   * comparison window, and revenue broken down by event, category and city.
   * Everything derives from orders so the charts, the ledger and the money
   * panels can never disagree.
   */
  async organizerAnalytics(organizerId: string): Promise<OrganizerAnalytics> {
    const repos = this.uow.repos;
    const { items: events } = await repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const windowStart = new Date(now.getTime() - 30 * dayMs).toISOString();
    const prevStart = new Date(now.getTime() - 60 * dayMs).toISOString();

    const series: DailyPoint[] = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now.getTime() - (29 - index) * dayMs);
      return { date: date.toISOString().slice(0, 10), revenue: 0, tickets: 0 };
    });

    let revenue30d = 0;
    let revenuePrev30d = 0;
    let tickets30d = 0;
    let ticketsPrev30d = 0;
    let orders30d = 0;
    let refunded30d = 0;

    const byEvent = new Map<string, { title: string; revenue: number; tickets: number }>();
    const byCategory = new Map<string, number>();
    const byCity = new Map<string, number>();

    for (const event of events) {
      const venue = await repos.venues.findById(event.venueId);
      for (const order of await repos.orders.listByEvent(event.id)) {
        const isSale = order.status === "FULFILLED" || order.status === "PAID";
        const inWindow = order.createdAt >= windowStart;
        if (order.status === "REFUNDED" && inWindow) {
          orders30d += 1;
          refunded30d += 1;
          continue;
        }
        if (!isSale) continue;

        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        if (inWindow) {
          orders30d += 1;
          revenue30d += order.total.amount;
          tickets30d += units;

          const dayIndex =
            29 - Math.min(29, Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / dayMs));
          const point = series[dayIndex];
          if (point) {
            point.revenue += order.total.amount;
            point.tickets += units;
          }

          const entry = byEvent.get(event.id) ?? { title: event.title, revenue: 0, tickets: 0 };
          entry.revenue += order.total.amount;
          entry.tickets += units;
          byEvent.set(event.id, entry);
          byCategory.set(event.category, (byCategory.get(event.category) ?? 0) + order.total.amount);
          if (venue) byCity.set(venue.city, (byCity.get(venue.city) ?? 0) + order.total.amount);
        } else if (order.createdAt >= prevStart) {
          revenuePrev30d += order.total.amount;
          ticketsPrev30d += units;
        }
      }
    }

    return {
      series,
      revenue30d: money(revenue30d, "KES"),
      revenuePrev30d: money(revenuePrev30d, "KES"),
      tickets30d,
      ticketsPrev30d,
      orders30d,
      refunded30d,
      byEvent: [...byEvent.values()].sort((a, b) => b.revenue - a.revenue),
      byCategory: [...byCategory.entries()]
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      byCity: [...byCity.entries()]
        .map(([city, revenue]) => ({ city, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
    };
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

/** One row in the overview's event-health list. */
export interface EventHealth {
  event: Event;
  venue: Venue;
  /** Units sold (ticketed) or guests confirmed (capacity events). */
  sold: number;
  capacity: number | null;
  /** Units sold in the last 7 days / the 7 days before that. */
  sold7d: number;
  soldPrev7d: number;
  /** Admitted gate scans. */
  scanned: number;
  live: boolean;
  startsToday: boolean;
}

export interface OrganizerOverview {
  /** The show whose gate matters right now — live, else starting today. */
  tonight: EventHealth | null;
  /** Remaining upcoming events, soonest first. */
  health: EventHealth[];
  revenue7d: Money;
  revenuePrev7d: Money;
  tickets7d: number;
  ticketsPrev7d: number;
  /** Gross revenue per day, oldest first. */
  revenueByDay: number[];
}

/**
 * A ticket in the account area, with the transfer/resale context the UI needs
 * to show honest controls: the resale price ceiling, whether the resale window
 * is open, and any in-flight transfer or listing that blocks a new one.
 */
export interface TicketRow {
  ticket: Ticket;
  event: Event;
  venue: Venue;
  ticketType: TicketType | null;
  /** Set while a transfer is awaiting the recipient — the ticket is suspended. */
  pendingTransfer: TicketTransfer | null;
  activeListing: ResaleListing | null;
  /** Face value plus the organizer's markup cap. */
  maxResalePrice: Money;
  /** False when resale is disabled, or outside the organizer's window. */
  resaleOpen: boolean;
}

export interface DailyPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  revenue: number;
  tickets: number;
}

export interface OrganizerAnalytics {
  /** Last 30 days, oldest first. */
  series: DailyPoint[];
  revenue30d: Money;
  revenuePrev30d: Money;
  tickets30d: number;
  ticketsPrev30d: number;
  orders30d: number;
  refunded30d: number;
  byEvent: Array<{ title: string; revenue: number; tickets: number }>;
  byCategory: Array<{ category: string; revenue: number }>;
  byCity: Array<{ city: string; revenue: number }>;
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
