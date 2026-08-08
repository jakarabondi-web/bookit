import type {
  Broadcast,
  GiftClaim,
  GiftItem,
  GuestMessage,
  PrivateEventPage,
} from "@/domain/private-event";
import type {
  AffiliateLink,
  AuditLog,
  BanquetTable,
  Booking,
  Campaign,
  CheckIn,
  Contribution,
  Event,
  EventId,
  EventOccurrence,
  Hold,
  InventoryUnit,
  LedgerAccount,
  LedgerTransaction,
  Notification,
  Order,
  OrderId,
  Organizer,
  OrganizerId,
  Payment,
  Payout,
  PrivateInvite,
  PromoCode,
  ResaleListing,
  RiskEvent,
  Ticket,
  TicketId,
  TicketTransfer,
  TicketType,
  User,
  UserId,
  Venue,
} from "@/domain/types";

/**
 * Repository contracts. The services depend only on these, so the same domain
 * logic runs against the in-memory store (tests, zero-setup dev) and against
 * PostgreSQL in production.
 *
 * `UnitOfWork` is the transactional boundary: everything a service does inside
 * `runInTransaction` either commits together or is rolled back together.
 */

export interface Repositories {
  privateEvents: PrivateEventRepository;
  users: UserRepository;
  organizers: OrganizerRepository;
  venues: VenueRepository;
  events: EventRepository;
  ticketTypes: TicketTypeRepository;
  inventory: InventoryRepository;
  orders: OrderRepository;
  tickets: TicketRepository;
  transfers: TransferRepository;
  bookings: BookingRepository;
  invites: InviteRepository;
  tables: TableRepository;
  payments: PaymentRepository;
  ledger: LedgerRepository;
  payouts: PayoutRepository;
  listings: ListingRepository;
  contributions: ContributionRepository;
  checkins: CheckInRepository;
  risk: RiskRepository;
  campaigns: CampaignRepository;
  promoCodes: PromoCodeRepository;
  affiliateLinks: AffiliateLinkRepository;
  audit: AuditRepository;
  notifications: NotificationRepository;
  webhooks: WebhookRepository;
  idempotency: IdempotencyRepository;
}

export interface UnitOfWork {
  /**
   * Runs `work` inside a serialized transaction. In Postgres this maps to a
   * `BEGIN ... COMMIT` with row locks taken by `inventory.lockAvailableUnits`;
   * in the in-memory store it maps to an exclusive async mutex.
   */
  runInTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
  repos: Repositories;
}

/** Microsite content, gift registry, broadcasts and the guest message wall. */
export interface PrivateEventRepository {
  findPage(eventId: EventId): Promise<PrivateEventPage | null>;
  savePage(page: PrivateEventPage): Promise<PrivateEventPage>;

  listGifts(eventId: EventId): Promise<GiftItem[]>;
  findGift(giftId: string): Promise<GiftItem | null>;
  saveGift(gift: GiftItem): Promise<GiftItem>;
  updateGift(giftId: string, patch: Partial<GiftItem>): Promise<GiftItem>;

  listClaims(eventId: EventId): Promise<GiftClaim[]>;
  createClaim(claim: GiftClaim): Promise<GiftClaim>;
  /** Claims already made by this invitation, so a guest can see their own. */
  listClaimsByInvite(inviteId: string): Promise<GiftClaim[]>;

  listBroadcasts(eventId: EventId): Promise<Broadcast[]>;
  createBroadcast(broadcast: Broadcast): Promise<Broadcast>;

  listMessages(eventId: EventId): Promise<GuestMessage[]>;
  createMessage(message: GuestMessage): Promise<GuestMessage>;
  updateMessage(id: string, patch: Partial<GuestMessage>): Promise<GuestMessage>;
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  create(user: User): Promise<User>;
  update(id: UserId, patch: Partial<User>): Promise<User>;
}

export interface OrganizerRepository {
  findById(id: OrganizerId): Promise<Organizer | null>;
  findBySlug(slug: string): Promise<Organizer | null>;
  list(): Promise<Organizer[]>;
  create(organizer: Organizer): Promise<Organizer>;
  update(id: OrganizerId, patch: Partial<Organizer>): Promise<Organizer>;
}

export interface VenueRepository {
  findById(id: string): Promise<Venue | null>;
  list(): Promise<Venue[]>;
  create(venue: Venue): Promise<Venue>;
}

export interface EventQuery {
  search?: string;
  city?: string;
  category?: string;
  types?: string[];
  /** Restricts to events starting inside the window. */
  from?: string;
  to?: string;
  freeOnly?: boolean;
  bookingsOnly?: boolean;
  featuredOnly?: boolean;
  organizerId?: OrganizerId;
  includeNonPublic?: boolean;
  cursor?: string | null;
  limit?: number;
}

export interface EventRepository {
  findById(id: EventId): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  query(query: EventQuery): Promise<{ items: Event[]; nextCursor: string | null }>;
  listAll(): Promise<Event[]>;
  create(event: Event): Promise<Event>;
  update(id: EventId, patch: Partial<Event>): Promise<Event>;
  listOccurrences(eventId: EventId): Promise<EventOccurrence[]>;
  upsertOccurrences(occurrences: EventOccurrence[]): Promise<void>;
}

export interface TicketTypeRepository {
  listByEvent(eventId: EventId): Promise<TicketType[]>;
  findById(id: string): Promise<TicketType | null>;
  create(ticketType: TicketType): Promise<TicketType>;
}

export interface InventoryRepository {
  /**
   * Atomically selects and locks up to `quantity` AVAILABLE units for a ticket
   * type, marking them HELD against `holdId`. Returns fewer units than
   * requested only when inventory is genuinely exhausted — never as a race.
   */
  lockAvailableUnits(
    ticketTypeId: string,
    quantity: number,
    holdId: string,
  ): Promise<InventoryUnit[]>;
  findUnit(unitId: string): Promise<InventoryUnit | null>;
  countAvailable(ticketTypeId: string): Promise<number>;
  countAvailableForEvent(eventId: EventId): Promise<number>;
  createHold(hold: Hold): Promise<Hold>;
  findHold(holdId: string): Promise<Hold | null>;
  releaseHold(holdId: string): Promise<void>;
  markSold(unitIds: string[], ticketIdByUnit: Record<string, TicketId>): Promise<void>;
  listExpiredHolds(now: string): Promise<Hold[]>;
  createUnits(units: InventoryUnit[]): Promise<void>;
}

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  listByUser(userId: UserId): Promise<Order[]>;
  listByEvent(eventId: EventId): Promise<Order[]>;
  create(order: Order): Promise<Order>;
  update(id: OrderId, patch: Partial<Order>): Promise<Order>;
}

export interface TicketRepository {
  findById(id: TicketId): Promise<Ticket | null>;
  findByCode(code: string): Promise<Ticket | null>;
  listByOwner(userId: UserId): Promise<Ticket[]>;
  listByOrder(orderId: OrderId): Promise<Ticket[]>;
  listByEvent(eventId: EventId): Promise<Ticket[]>;
  create(ticket: Ticket): Promise<Ticket>;
  update(id: TicketId, patch: Partial<Ticket>): Promise<Ticket>;
  countOwnedForEvent(userId: UserId, eventId: EventId): Promise<number>;
}

export interface TransferRepository {
  findById(id: string): Promise<TicketTransfer | null>;
  listByTicket(ticketId: TicketId): Promise<TicketTransfer[]>;
  listIncoming(email: string): Promise<TicketTransfer[]>;
  create(transfer: TicketTransfer): Promise<TicketTransfer>;
  update(id: string, patch: Partial<TicketTransfer>): Promise<TicketTransfer>;
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByReference(reference: string): Promise<Booking | null>;
  listByEvent(eventId: EventId): Promise<Booking[]>;
  listByUser(userId: UserId): Promise<Booking[]>;
  listByEmail(email: string): Promise<Booking[]>;
  create(booking: Booking): Promise<Booking>;
  update(id: string, patch: Partial<Booking>): Promise<Booking>;
  /** Sum of `guestCount` across bookings that consume capacity. */
  countConfirmedGuests(eventId: EventId, occurrenceId?: string | null): Promise<number>;
}

export interface InviteRepository {
  findByTokenHash(tokenHash: string): Promise<PrivateInvite | null>;
  findById(id: string): Promise<PrivateInvite | null>;
  listByEvent(eventId: EventId): Promise<PrivateInvite[]>;
  create(invite: PrivateInvite): Promise<PrivateInvite>;
  update(id: string, patch: Partial<PrivateInvite>): Promise<PrivateInvite>;
}

export interface TableRepository {
  listByEvent(eventId: EventId): Promise<BanquetTable[]>;
  findById(id: string): Promise<BanquetTable | null>;
  update(id: string, patch: Partial<BanquetTable>): Promise<BanquetTable>;
  create(table: BanquetTable): Promise<BanquetTable>;
}

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByProviderRequestId(requestId: string): Promise<Payment | null>;
  findByProviderReference(reference: string): Promise<Payment | null>;
  listByOrder(orderId: OrderId): Promise<Payment[]>;
  /** Payments still PENDING and created at or before `cutoff` — reconciliation. */
  listPendingOlderThan(cutoff: string): Promise<Payment[]>;
  create(payment: Payment): Promise<Payment>;
  update(id: string, patch: Partial<Payment>): Promise<Payment>;
}

export interface LedgerRepository {
  findAccountByCode(code: string): Promise<LedgerAccount | null>;
  ensureAccount(account: LedgerAccount): Promise<LedgerAccount>;
  listAccounts(): Promise<LedgerAccount[]>;
  post(transaction: LedgerTransaction): Promise<LedgerTransaction>;
  findByReference(reference: string): Promise<LedgerTransaction | null>;
  listTransactions(): Promise<LedgerTransaction[]>;
  /** Signed balance for an account: debits minus credits for ASSET/EXPENSE. */
  balanceOf(accountId: string): Promise<number>;
}

export interface PayoutRepository {
  findById(id: string): Promise<Payout | null>;
  listByOrganizer(organizerId: OrganizerId): Promise<Payout[]>;
  create(payout: Payout): Promise<Payout>;
  update(id: string, patch: Partial<Payout>): Promise<Payout>;
}

export interface ListingRepository {
  findById(id: string): Promise<ResaleListing | null>;
  findActiveByTicket(ticketId: TicketId): Promise<ResaleListing | null>;
  listByEvent(eventId: EventId): Promise<ResaleListing[]>;
  listBySeller(userId: UserId): Promise<ResaleListing[]>;
  countActiveBySeller(userId: UserId, eventId: EventId): Promise<number>;
  create(listing: ResaleListing): Promise<ResaleListing>;
  update(id: string, patch: Partial<ResaleListing>): Promise<ResaleListing>;
}

export interface ContributionRepository {
  listByEvent(eventId: EventId): Promise<Contribution[]>;
  create(contribution: Contribution): Promise<Contribution>;
  update(id: string, patch: Partial<Contribution>): Promise<Contribution>;
}

export interface CheckInRepository {
  create(checkIn: CheckIn): Promise<CheckIn>;
  listByEvent(eventId: EventId): Promise<CheckIn[]>;
  findAdmittedForTicket(ticketId: TicketId): Promise<CheckIn | null>;
}

export interface RiskRepository {
  record(event: RiskEvent): Promise<RiskEvent>;
  listForSubject(subjectType: string, subjectId: string): Promise<RiskEvent[]>;
  listRecent(limit: number): Promise<RiskEvent[]>;
}

export interface CampaignRepository {
  create(campaign: Campaign): Promise<Campaign>;
  listByOrganizer(organizerId: string): Promise<Campaign[]>;
}

export interface PromoCodeRepository {
  create(promoCode: PromoCode): Promise<PromoCode>;
  findById(id: string): Promise<PromoCode | null>;
  /** `code` must already be normalized — repositories don't reinterpret data. */
  findByEventAndCode(eventId: string, code: string): Promise<PromoCode | null>;
  listByEvent(eventId: string): Promise<PromoCode[]>;
  listByOrganizer(organizerId: string): Promise<PromoCode[]>;
  update(id: string, patch: Partial<PromoCode>): Promise<PromoCode>;
}

export interface AffiliateLinkRepository {
  create(link: AffiliateLink): Promise<AffiliateLink>;
  findByCode(code: string): Promise<AffiliateLink | null>;
  listByEvent(eventId: string): Promise<AffiliateLink[]>;
  listByOrganizer(organizerId: string): Promise<AffiliateLink[]>;
  update(id: string, patch: Partial<AffiliateLink>): Promise<AffiliateLink>;
}

export interface AuditRepository {
  append(entry: AuditLog): Promise<AuditLog>;
  listForResource(resourceType: string, resourceId: string): Promise<AuditLog[]>;
  listRecent(limit: number): Promise<AuditLog[]>;
}

export interface NotificationRepository {
  enqueue(notification: Notification): Promise<Notification>;
  listForUser(userId: UserId): Promise<Notification[]>;
  listPending(): Promise<Notification[]>;
  markSent(id: string, at: string): Promise<void>;
}

export interface WebhookRepository {
  /**
   * Records a webhook exactly once. Returns `false` when `dedupeKey` was
   * already seen, which is how replayed and duplicated callbacks are ignored.
   */
  recordIfNew(record: {
    id: string;
    provider: string;
    dedupeKey: string;
    payload: Record<string, unknown>;
    signatureOk: boolean;
    quarantined: boolean;
    receivedAt: string;
  }): Promise<boolean>;
  markProcessed(dedupeKey: string, at: string): Promise<void>;
  listQuarantined(): Promise<{ dedupeKey: string; provider: string }[]>;
}

export interface IdempotencyRepository {
  find(key: string): Promise<{ requestHash: string; status: number; response: unknown } | null>;
  save(record: {
    key: string;
    endpoint: string;
    requestHash: string;
    status: number;
    response: unknown;
    expiresAt: string;
  }): Promise<void>;
}
