import type {
  AuditLog,
  BanquetTable,
  Booking,
  CheckIn,
  Contribution,
  Event,
  EventOccurrence,
  Hold,
  InventoryUnit,
  LedgerAccount,
  LedgerTransaction,
  Notification,
  Order,
  Organizer,
  Payment,
  Payout,
  PrivateInvite,
  ResaleListing,
  RiskEvent,
  Ticket,
  TicketTransfer,
  TicketType,
  User,
  Venue,
} from "@/domain/types";

export interface WebhookRecord {
  id: string;
  provider: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  signatureOk: boolean;
  quarantined: boolean;
  receivedAt: string;
  processedAt?: string;
}

export interface IdempotencyRecord {
  key: string;
  endpoint: string;
  requestHash: string;
  status: number;
  response: unknown;
  expiresAt: string;
}

/**
 * The whole in-memory dataset. Each collection is a Map keyed by id so the
 * repositories stay O(1) on the paths that matter.
 */
export interface MemoryDb {
  users: Map<string, User>;
  organizers: Map<string, Organizer>;
  venues: Map<string, Venue>;
  events: Map<string, Event>;
  occurrences: Map<string, EventOccurrence>;
  ticketTypes: Map<string, TicketType>;
  inventory: Map<string, InventoryUnit>;
  holds: Map<string, Hold>;
  orders: Map<string, Order>;
  tickets: Map<string, Ticket>;
  transfers: Map<string, TicketTransfer>;
  bookings: Map<string, Booking>;
  invites: Map<string, PrivateInvite>;
  tables: Map<string, BanquetTable>;
  payments: Map<string, Payment>;
  ledgerAccounts: Map<string, LedgerAccount>;
  ledgerTransactions: Map<string, LedgerTransaction>;
  payouts: Map<string, Payout>;
  listings: Map<string, ResaleListing>;
  contributions: Map<string, Contribution>;
  checkins: Map<string, CheckIn>;
  riskEvents: Map<string, RiskEvent>;
  auditLogs: Map<string, AuditLog>;
  notifications: Map<string, Notification>;
  webhooks: Map<string, WebhookRecord>;
  idempotency: Map<string, IdempotencyRecord>;
}

export function emptyDb(): MemoryDb {
  return {
    users: new Map(),
    organizers: new Map(),
    venues: new Map(),
    events: new Map(),
    occurrences: new Map(),
    ticketTypes: new Map(),
    inventory: new Map(),
    holds: new Map(),
    orders: new Map(),
    tickets: new Map(),
    transfers: new Map(),
    bookings: new Map(),
    invites: new Map(),
    tables: new Map(),
    payments: new Map(),
    ledgerAccounts: new Map(),
    ledgerTransactions: new Map(),
    payouts: new Map(),
    listings: new Map(),
    contributions: new Map(),
    checkins: new Map(),
    riskEvents: new Map(),
    auditLogs: new Map(),
    notifications: new Map(),
    webhooks: new Map(),
    idempotency: new Map(),
  };
}

type CollectionKey = keyof MemoryDb;

const COLLECTIONS = Object.keys(emptyDb()) as CollectionKey[];

/**
 * Snapshots every collection so a failed transaction can be rolled back.
 * Entities are treated as immutable values — repositories always write a new
 * object rather than mutating in place — so a shallow copy per row is enough.
 */
export function snapshot(db: MemoryDb): MemoryDb {
  const copy = emptyDb();
  for (const key of COLLECTIONS) {
    const source = db[key] as Map<string, unknown>;
    const target = copy[key] as Map<string, unknown>;
    for (const [id, value] of source) target.set(id, value);
  }
  return copy;
}

export function restore(db: MemoryDb, from: MemoryDb): void {
  for (const key of COLLECTIONS) {
    const target = db[key] as Map<string, unknown>;
    const source = from[key] as Map<string, unknown>;
    target.clear();
    for (const [id, value] of source) target.set(id, value);
  }
}
