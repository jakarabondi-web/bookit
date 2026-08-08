import { money, type Money } from "@/domain/money";
import type { UnitOfWork } from "../repositories/types";

/**
 * CRM — customer intelligence for organizers.
 *
 * Profiles are derived, never stored: the same person appears as a ticket
 * buyer on one event and a repeat buyer on another, and the organizer needs
 * them as one row with a lifetime behind it. Everything aggregates from the
 * order stream, which is also what the ledger posts from — so a customer's
 * "lifetime spend" here always reconciles with finance.
 *
 * Segmentation is RFM — recency, frequency, monetary — the model ticketing
 * platforms actually run on. Each axis scores 1–5 and the combination maps to
 * a named segment an organizer can act on: champions get presale codes,
 * at-risk buyers get the win-back message, one-timers get the second-event
 * nudge. The scoring functions are pure and exported for tests.
 */

/* ------------------------------------------------------------------------ */
/* Scoring                                                                    */
/* ------------------------------------------------------------------------ */

export interface RfmScore {
  /** 1–5, how recently they bought. */
  recency: number;
  /** 1–5, how often they buy. */
  frequency: number;
  /** 1–5, how much they spend. */
  monetary: number;
}

export type Segment =
  | "CHAMPION"
  | "LOYAL"
  | "BIG_SPENDER"
  | "PROMISING"
  | "NEW"
  | "AT_RISK"
  | "LAPSED";

export const SEGMENT_LABEL: Record<Segment, string> = {
  CHAMPION: "Champion",
  LOYAL: "Loyal",
  BIG_SPENDER: "Big spender",
  PROMISING: "Promising",
  NEW: "New",
  AT_RISK: "At risk",
  LAPSED: "Lapsed",
};

/** What the organizer should do with the segment — shown in the UI. */
export const SEGMENT_PLAY: Record<Segment, string> = {
  CHAMPION: "Presale access and first refusal on VIP — never let them queue.",
  LOYAL: "Reward the streak: loyalty pricing or a plus-one on their next order.",
  BIG_SPENDER: "High spend, lower frequency — sell the premium tier, not more tickets.",
  PROMISING: "Two orders in — a well-timed lineup announcement converts them to loyal.",
  NEW: "First order in the last week. The next 30 days decide if they return.",
  AT_RISK: "Used to buy often, gone quiet — win-back offer before they lapse.",
  LAPSED: "No purchase in over a month. Cheap to reach, worth one good re-engagement.",
};

export function scoreRecency(daysSinceLast: number): number {
  if (daysSinceLast <= 5) return 5;
  if (daysSinceLast <= 10) return 4;
  if (daysSinceLast <= 21) return 3;
  if (daysSinceLast <= 35) return 2;
  return 1;
}

export function scoreFrequency(orders: number): number {
  if (orders >= 10) return 5;
  if (orders >= 6) return 4;
  if (orders >= 3) return 3;
  if (orders >= 2) return 2;
  return 1;
}

/** Thresholds in minor units (KES cents), tuned to ticketing basket sizes. */
export function scoreMonetary(spendMinor: number): number {
  if (spendMinor >= 20_000_000) return 5; // ≥ KES 200,000
  if (spendMinor >= 10_000_000) return 4; // ≥ KES 100,000
  if (spendMinor >= 4_000_000) return 3; // ≥ KES 40,000
  if (spendMinor >= 1_500_000) return 2; // ≥ KES 15,000
  return 1;
}

export function segmentFor(score: RfmScore): Segment {
  const { recency, frequency, monetary } = score;
  if (recency >= 4 && frequency >= 4) return "CHAMPION";
  if (recency >= 3 && frequency >= 3) return "LOYAL";
  if (monetary >= 5 && recency >= 2) return "BIG_SPENDER";
  if (frequency === 1 && recency >= 4) return "NEW";
  if (recency >= 3) return "PROMISING";
  if (frequency >= 3) return "AT_RISK";
  return "LAPSED";
}

/* ------------------------------------------------------------------------ */
/* Profiles                                                                   */
/* ------------------------------------------------------------------------ */

export interface CustomerProfile {
  /** URL-safe id — base64url of the lowercased email. */
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orders: number;
  tickets: number;
  refunds: number;
  /** Lifetime gross across paid orders. */
  spend: Money;
  /** Distinct events they have bought into. */
  eventsBought: number;
  firstOrderAt: string;
  lastOrderAt: string;
  rfm: RfmScore;
  segment: Segment;
}

export interface CustomerTimelineEntry {
  at: string;
  kind: "ORDER" | "REFUND";
  eventTitle: string;
  reference: string;
  quantity: number;
  amount: Money;
}

export interface CrmSummary {
  customers: number;
  /** Share of customers with more than one paid order. */
  repeatRate: number;
  avgLifetimeSpend: Money;
  newLast30: number;
  segments: Array<{ segment: Segment; count: number }>;
}

export function customerId(email: string): string {
  return Buffer.from(email.toLowerCase()).toString("base64url");
}

export const ALL_SEGMENTS: Segment[] = [
  "CHAMPION",
  "LOYAL",
  "BIG_SPENDER",
  "PROMISING",
  "NEW",
  "AT_RISK",
  "LAPSED",
];

export function isSegment(value: string): value is Segment {
  return (ALL_SEGMENTS as string[]).includes(value);
}

export class CrmService {
  constructor(private readonly uow: UnitOfWork) {}

  async customers(organizerId: string): Promise<CustomerProfile[]> {
    const repos = this.uow.repos;
    const { items: events } = await repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });

    interface Accumulator {
      name: string;
      email: string;
      phone: string | null;
      orders: number;
      tickets: number;
      refunds: number;
      spend: number;
      events: Set<string>;
      firstAt: string;
      lastAt: string;
    }
    const byEmail = new Map<string, Accumulator>();

    for (const event of events) {
      for (const order of await repos.orders.listByEvent(event.id)) {
        const email = order.buyerEmail.toLowerCase();
        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const isSale = order.status === "FULFILLED" || order.status === "PAID";
        const isRefund = order.status === "REFUNDED";
        if (!isSale && !isRefund) continue;

        let account = byEmail.get(email);
        if (!account) {
          account = {
            // Buyer names aren't stored on orders; the address book name is
            // the mailbox until a user account links up.
            name: order.userId
              ? ((await repos.users.findById(order.userId))?.fullName ?? email.split("@")[0]!)
              : titleCase(email.split("@")[0]!.replace(/[._\d]+/g, " ").trim()),
            email,
            phone: order.buyerPhone,
            orders: 0,
            tickets: 0,
            refunds: 0,
            spend: 0,
            events: new Set(),
            firstAt: order.createdAt,
            lastAt: order.createdAt,
          };
          byEmail.set(email, account);
        }

        if (isRefund) {
          account.refunds += 1;
        } else {
          account.orders += 1;
          account.tickets += units;
          account.spend += order.total.amount;
          account.events.add(event.id);
        }
        if (order.createdAt < account.firstAt) account.firstAt = order.createdAt;
        if (order.createdAt > account.lastAt) account.lastAt = order.createdAt;
        if (!account.phone && order.buyerPhone) account.phone = order.buyerPhone;
      }
    }

    const now = Date.now();
    const profiles: CustomerProfile[] = [];
    for (const account of byEmail.values()) {
      if (account.orders === 0) continue; // refund-only ghosts
      const daysSinceLast = Math.floor((now - new Date(account.lastAt).getTime()) / 86_400_000);
      const rfm: RfmScore = {
        recency: scoreRecency(daysSinceLast),
        frequency: scoreFrequency(account.orders),
        monetary: scoreMonetary(account.spend),
      };
      profiles.push({
        id: customerId(account.email),
        name: account.name,
        email: account.email,
        phone: account.phone,
        orders: account.orders,
        tickets: account.tickets,
        refunds: account.refunds,
        spend: money(account.spend, "KES"),
        eventsBought: account.events.size,
        firstOrderAt: account.firstAt,
        lastOrderAt: account.lastAt,
        rfm,
        segment: segmentFor(rfm),
      });
    }

    profiles.sort((a, b) => b.spend.amount - a.spend.amount);
    return profiles;
  }

  /** Customers in any of the given segments — the audience a campaign targets. */
  async customersInSegments(organizerId: string, segments: Segment[]): Promise<CustomerProfile[]> {
    const wanted = new Set(segments);
    const profiles = await this.customers(organizerId);
    return profiles.filter((profile) => wanted.has(profile.segment));
  }

  async customer(
    organizerId: string,
    id: string,
  ): Promise<{ profile: CustomerProfile; timeline: CustomerTimelineEntry[] } | null> {
    const profiles = await this.customers(organizerId);
    const profile = profiles.find((entry) => entry.id === id);
    if (!profile) return null;

    const repos = this.uow.repos;
    const { items: events } = await repos.events.query({
      organizerId,
      includeNonPublic: true,
      limit: 200,
    });

    const timeline: CustomerTimelineEntry[] = [];
    for (const event of events) {
      for (const order of await repos.orders.listByEvent(event.id)) {
        if (order.buyerEmail.toLowerCase() !== profile.email) continue;
        const isSale = order.status === "FULFILLED" || order.status === "PAID";
        const isRefund = order.status === "REFUNDED";
        if (!isSale && !isRefund) continue;
        timeline.push({
          at: order.createdAt,
          kind: isRefund ? "REFUND" : "ORDER",
          eventTitle: event.title,
          reference: order.reference,
          quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
          amount: order.total,
        });
      }
    }
    timeline.sort((a, b) => b.at.localeCompare(a.at));
    return { profile, timeline };
  }

  async summary(organizerId: string): Promise<CrmSummary> {
    const profiles = await this.customers(organizerId);
    const customers = profiles.length;
    const repeat = profiles.filter((profile) => profile.orders > 1).length;
    const spendTotal = profiles.reduce((sum, profile) => sum + profile.spend.amount, 0);
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const counts = new Map<Segment, number>();
    for (const profile of profiles) {
      counts.set(profile.segment, (counts.get(profile.segment) ?? 0) + 1);
    }

    return {
      customers,
      repeatRate: customers === 0 ? 0 : repeat / customers,
      avgLifetimeSpend: money(customers === 0 ? 0 : Math.round(spendTotal / customers), "KES"),
      newLast30: profiles.filter((profile) => profile.firstOrderAt >= cutoff).length,
      segments: [...counts.entries()]
        .map(([segment, count]) => ({ segment, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}
