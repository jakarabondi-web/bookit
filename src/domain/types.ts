import type { Money } from "./money";
import type {
  BookingStatus,
  CheckInResult,
  ContributionStatus,
  EventCategory,
  EventStatus,
  EventType,
  EventVisibility,
  InventoryState,
  InviteStatus,
  LedgerAccountType,
  OrderStatus,
  OrganizerType,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  ResaleListingStatus,
  RiskOutcome,
  Role,
  TicketStatus,
  TransferStatus,
  VerificationStatus,
} from "./enums";

/** Branded identifier so ids of different entities cannot be swapped silently. */
export type Id<Brand extends string> = string & { readonly __brand?: Brand };

export type UserId = Id<"User">;
export type OrganizerId = Id<"Organizer">;
export type EventId = Id<"Event">;
export type OccurrenceId = Id<"EventOccurrence">;
export type VenueId = Id<"Venue">;
export type TicketTypeId = Id<"TicketType">;
export type TicketId = Id<"Ticket">;
export type OrderId = Id<"Order">;
export type PaymentId = Id<"Payment">;
export type BookingId = Id<"Booking">;
export type InviteId = Id<"PrivateInvite">;
export type ListingId = Id<"ResaleListing">;
export type LedgerAccountId = Id<"LedgerAccount">;
export type PayoutId = Id<"Payout">;
export type TableId = Id<"BanquetTable">;

/* -------------------------------------------------------------------------- */
/* Identity                                                                    */
/* -------------------------------------------------------------------------- */

export interface User {
  id: UserId;
  email: string;
  emailVerifiedAt: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  roles: Role[];
  mfaEnabled: boolean;
  createdAt: string;
}

export interface OrganizerMember {
  userId: UserId;
  role: Role;
  addedAt: string;
}

export interface Organizer {
  id: OrganizerId;
  name: string;
  slug: string;
  type: OrganizerType;
  about: string;
  logoUrl: string | null;
  verification: VerificationStatus;
  /** Drives payout reserve policy — see `services/payout-service`. */
  trustTier: "NEW" | "ESTABLISHED" | "TRUSTED";
  supportEmail: string;
  supportPhone: string;
  members: OrganizerMember[];
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Venues                                                                      */
/* -------------------------------------------------------------------------- */

export interface Venue {
  id: VenueId;
  name: string;
  city: string;
  area: string;
  addressLine: string;
  capacity: number;
  latitude: number | null;
  longitude: number | null;
  sections: VenueSection[];
}

export interface VenueSection {
  id: string;
  name: string;
  capacity: number;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export interface EventPolicies {
  refundPolicy: string;
  transferAllowed: boolean;
  resaleEnabled: boolean;
  /** Cap on resale price as basis points above face value. 0 = face value only. */
  resaleMaxMarkupBps: number;
  resaleOpensAt: string | null;
  resaleClosesAt: string | null;
  maxListingsPerAccount: number;
  sellerPayoutDelayHours: number;
  maxTicketsPerAccount: number;
  ageRestriction: string | null;
  entryRules: string[];
}

export interface AgendaItem {
  startsAt: string;
  title: string;
  description: string | null;
}

export interface TicketType {
  id: TicketTypeId;
  eventId: EventId;
  name: string;
  description: string | null;
  price: Money;
  /** Total units created for this type. */
  quantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  salesStartAt: string;
  salesEndAt: string;
  sectionId: string | null;
  sortOrder: number;
}

export interface RecurrenceRule {
  /** iCalendar-style RRULE, e.g. `FREQ=MONTHLY;BYDAY=1SA`. */
  rrule: string;
  humanLabel: string;
  until: string | null;
}

export interface EventOccurrence {
  id: OccurrenceId;
  eventId: EventId;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  cancelled: boolean;
}

export interface Event {
  id: EventId;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  type: EventType;
  status: EventStatus;
  visibility: EventVisibility;
  category: EventCategory;
  tags: string[];
  organizerId: OrganizerId;
  venueId: VenueId;
  startsAt: string;
  endsAt: string;
  heroImage: string;
  cardImage: string;
  /** Present for FREE_RSVP / BOOKING / BANQUET / RECURRING_MEETING events. */
  capacity: number | null;
  policies: EventPolicies;
  agenda: AgendaItem[];
  recurrence: RecurrenceRule | null;
  featured: boolean;
  createdAt: string;
}

/** An event joined with the entities the UI always needs alongside it. */
export interface EventSummary {
  event: Event;
  organizer: Organizer;
  venue: Venue;
  ticketTypes: TicketType[];
  /** Cheapest currently-purchasable ticket price, if the event sells tickets. */
  fromPrice: Money | null;
  remainingCapacity: number | null;
  soldOut: boolean;
}

/* -------------------------------------------------------------------------- */
/* Inventory, orders, tickets                                                  */
/* -------------------------------------------------------------------------- */

export interface InventoryUnit {
  id: string;
  ticketTypeId: TicketTypeId;
  eventId: EventId;
  state: InventoryState;
  holdId: string | null;
  ticketId: TicketId | null;
  seatLabel: string | null;
}

export interface Hold {
  id: string;
  orderId: OrderId;
  eventId: EventId;
  unitIds: string[];
  expiresAt: string;
  releasedAt: string | null;
}

export interface OrderItem {
  id: string;
  ticketTypeId: TicketTypeId;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface Order {
  id: OrderId;
  reference: string;
  userId: UserId | null;
  buyerEmail: string;
  buyerPhone: string | null;
  eventId: EventId;
  items: OrderItem[];
  subtotal: Money;
  fees: Money;
  total: Money;
  status: OrderStatus;
  holdId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface TicketOwnershipEntry {
  at: string;
  fromUserId: UserId | null;
  toUserId: UserId;
  reason: "ISSUE" | "TRANSFER" | "RESALE" | "ADMIN_CORRECTION";
  reference: string | null;
}

export interface Ticket {
  id: TicketId;
  code: string;
  eventId: EventId;
  ticketTypeId: TicketTypeId;
  orderId: OrderId;
  ownerUserId: UserId;
  ownerName: string;
  seatLabel: string | null;
  status: TicketStatus;
  facePrice: Money;
  /** Incremented on every ownership or status change that must kill old QR codes. */
  credentialVersion: number;
  issuedAt: string;
  checkedInAt: string | null;
  ownershipHistory: TicketOwnershipEntry[];
}

export interface TicketTransfer {
  id: string;
  ticketId: TicketId;
  fromUserId: UserId;
  toEmail: string;
  toUserId: UserId | null;
  status: TransferStatus;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Bookings, RSVPs, invitations                                                */
/* -------------------------------------------------------------------------- */

export interface BookingGuest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  mealChoice: string | null;
  checkedInAt: string | null;
}

export interface Booking {
  id: BookingId;
  reference: string;
  eventId: EventId;
  occurrenceId: OccurrenceId | null;
  primaryGuestUserId: UserId | null;
  primaryGuestName: string;
  phone: string | null;
  email: string | null;
  status: BookingStatus;
  guestCount: number;
  guests: BookingGuest[];
  tableId: TableId | null;
  mealChoice: string | null;
  contributionPledged: Money | null;
  contributionPaid: Money | null;
  paymentStatus: PaymentStatus | null;
  invitedBy: UserId | null;
  notes: string | null;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateInvite {
  id: InviteId;
  eventId: EventId;
  /** Only the hash is persisted — the raw token is shown once at issue time. */
  tokenHash: string;
  inviteeName: string;
  phone: string | null;
  email: string | null;
  maxGuests: number;
  expiresAt: string;
  status: InviteStatus;
  bookingId: BookingId | null;
  createdAt: string;
}

export interface BanquetTable {
  id: TableId;
  eventId: EventId;
  name: string;
  seats: number;
  assignedBookingIds: BookingId[];
}

/* -------------------------------------------------------------------------- */
/* Payments and ledger                                                         */
/* -------------------------------------------------------------------------- */

export interface Payment {
  id: PaymentId;
  orderId: OrderId | null;
  bookingId: BookingId | null;
  method: PaymentMethod;
  status: PaymentStatus;
  expectedAmount: Money;
  receivedAmount: Money | null;
  providerRequestId: string | null;
  providerReference: string | null;
  providerTimestamp: string | null;
  phone: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerAccount {
  id: LedgerAccountId;
  code: string;
  name: string;
  type: LedgerAccountType;
  ownerOrganizerId: OrganizerId | null;
  currency: Money["currency"];
}

export interface LedgerEntry {
  accountId: LedgerAccountId;
  /** Positive integer minor units. Direction is carried by `side`. */
  amount: Money;
  side: "DEBIT" | "CREDIT";
  memo: string | null;
}

export interface LedgerTransaction {
  id: string;
  reference: string;
  kind:
    | "TICKET_SALE"
    | "REFUND"
    | "RESALE"
    | "PAYOUT"
    | "CONTRIBUTION"
    | "FEE"
    | "ADJUSTMENT";
  entries: LedgerEntry[];
  postedAt: string;
  metadata: Record<string, string>;
}

export interface Payout {
  id: PayoutId;
  organizerId: OrganizerId;
  amount: Money;
  status: PayoutStatus;
  destinationMasked: string;
  requestedAt: string;
  approvedByUserId: UserId | null;
  paidAt: string | null;
  holdReason: string | null;
}

/* -------------------------------------------------------------------------- */
/* Resale                                                                      */
/* -------------------------------------------------------------------------- */

export interface ResaleListing {
  id: ListingId;
  ticketId: TicketId;
  eventId: EventId;
  sellerUserId: UserId;
  askPrice: Money;
  facePrice: Money;
  status: ResaleListingStatus;
  buyerUserId: UserId | null;
  createdAt: string;
  soldAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Contributions, check-in, risk, audit                                        */
/* -------------------------------------------------------------------------- */

export interface Contribution {
  id: string;
  eventId: EventId;
  bookingId: BookingId | null;
  contributorName: string;
  phone: string | null;
  pledged: Money;
  received: Money;
  status: ContributionStatus;
  method: PaymentMethod | null;
  reference: string | null;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  eventId: EventId;
  ticketId: TicketId | null;
  bookingId: BookingId | null;
  result: CheckInResult;
  scannedByUserId: UserId | null;
  deviceId: string | null;
  overrideReason: string | null;
  at: string;
}

export interface RiskEvent {
  id: string;
  subjectType: "USER" | "ORDER" | "PAYMENT" | "LISTING" | "ORGANIZER" | "PAYOUT";
  subjectId: string;
  outcome: RiskOutcome;
  score: number;
  /** Explainable reason codes, e.g. `VELOCITY_HIGH`, `NEW_ACCOUNT`. */
  reasonCodes: string[];
  at: string;
}

export interface AuditLog {
  id: string;
  actorUserId: UserId | null;
  actorRole: Role | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  sessionId: string | null;
  mfaSatisfied: boolean;
  reason: string | null;
  approvalChain: string[];
  at: string;
}

export interface Notification {
  id: string;
  userId: UserId | null;
  channel: "EMAIL" | "SMS" | "PUSH" | "WHATSAPP";
  template: string;
  to: string;
  payload: Record<string, string>;
  sentAt: string | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Cross-cutting                                                               */
/* -------------------------------------------------------------------------- */

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ActorContext {
  userId: UserId | null;
  roles: Role[];
  organizerId: OrganizerId | null;
  ip: string | null;
  sessionId: string | null;
  mfaSatisfied: boolean;
  deviceId: string | null;
}
