/**
 * Domain enumerations for Bookit.
 *
 * These are plain const objects rather than TypeScript `enum`s so that they are
 * safe to import from both server modules and client components, and so their
 * runtime values line up exactly with the Postgres enums declared in
 * `prisma/schema.prisma`.
 */

export const EventType = {
  PAID_TICKET: "PAID_TICKET",
  FREE_RSVP: "FREE_RSVP",
  PRIVATE_INVITATION: "PRIVATE_INVITATION",
  BOOKING: "BOOKING",
  BANQUET: "BANQUET",
  RECURRING_MEETING: "RECURRING_MEETING",
  HYBRID: "HYBRID",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const EventStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ON_SALE: "ON_SALE",
  SOLD_OUT: "SOLD_OUT",
  LIVE: "LIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const EventVisibility = {
  PUBLIC: "PUBLIC",
  UNLISTED: "UNLISTED",
  PRIVATE: "PRIVATE",
  INVITE_CODE_REQUIRED: "INVITE_CODE_REQUIRED",
  INVITE_LINK_REQUIRED: "INVITE_LINK_REQUIRED",
} as const;
export type EventVisibility = (typeof EventVisibility)[keyof typeof EventVisibility];

export const InventoryState = {
  AVAILABLE: "AVAILABLE",
  HELD: "HELD",
  SOLD: "SOLD",
  CANCELLED: "CANCELLED",
} as const;
export type InventoryState = (typeof InventoryState)[keyof typeof InventoryState];

export const TicketStatus = {
  ACTIVE: "ACTIVE",
  LISTED: "LISTED",
  TRANSFERRED: "TRANSFERRED",
  SOLD: "SOLD",
  CHECKED_IN: "CHECKED_IN",
  CONSUMED: "CONSUMED",
  REFUNDED: "REFUNDED",
  VOIDED: "VOIDED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  WAITLISTED: "WAITLISTED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  CHECKED_IN: "CHECKED_IN",
  NO_SHOW: "NO_SHOW",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const OrderStatus = {
  CREATED: "CREATED",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  FULFILLED: "FULFILLED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  SETTLED: "SETTLED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
  CHARGEBACK: "CHARGEBACK",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  MPESA: "MPESA",
  CARD: "CARD",
  AIRTEL_MONEY: "AIRTEL_MONEY",
  WALLET: "WALLET",
  BANK_TRANSFER: "BANK_TRANSFER",
  FREE: "FREE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PayoutStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const ResaleListingStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  RESERVED: "RESERVED",
  SOLD: "SOLD",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  BLOCKED: "BLOCKED",
} as const;
export type ResaleListingStatus =
  (typeof ResaleListingStatus)[keyof typeof ResaleListingStatus];

export const TransferStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export const InviteStatus = {
  ISSUED: "ISSUED",
  VIEWED: "VIEWED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const RiskOutcome = {
  ALLOW: "ALLOW",
  MONITOR: "MONITOR",
  CHALLENGE: "CHALLENGE",
  HOLD: "HOLD",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  BLOCK: "BLOCK",
} as const;
export type RiskOutcome = (typeof RiskOutcome)[keyof typeof RiskOutcome];

export const Role = {
  CONSUMER: "CONSUMER",
  ORGANIZER_OWNER: "ORGANIZER_OWNER",
  ORGANIZER_ADMIN: "ORGANIZER_ADMIN",
  EVENT_MANAGER: "EVENT_MANAGER",
  FINANCE: "FINANCE",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  CHECK_IN_STAFF: "CHECK_IN_STAFF",
  SUPPORT_AGENT: "SUPPORT_AGENT",
  RISK_ANALYST: "RISK_ANALYST",
  SUPER_ADMIN: "SUPER_ADMIN",
  SECURITY_ADMIN: "SECURITY_ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrganizerType = {
  INDIVIDUAL: "INDIVIDUAL",
  BUSINESS: "BUSINESS",
  NONPROFIT: "NONPROFIT",
  COMMUNITY_ORGANIZATION: "COMMUNITY_ORGANIZATION",
  CHURCH: "CHURCH",
  ASSOCIATION: "ASSOCIATION",
  SPORTS_ORGANIZATION: "SPORTS_ORGANIZATION",
} as const;
export type OrganizerType = (typeof OrganizerType)[keyof typeof OrganizerType];

export const VerificationStatus = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const CheckInResult = {
  ADMITTED: "ADMITTED",
  ALREADY_USED: "ALREADY_USED",
  INVALID_CREDENTIAL: "INVALID_CREDENTIAL",
  WRONG_EVENT: "WRONG_EVENT",
  NOT_YET_VALID: "NOT_YET_VALID",
  REVOKED: "REVOKED",
  REQUIRES_OVERRIDE: "REQUIRES_OVERRIDE",
} as const;
export type CheckInResult = (typeof CheckInResult)[keyof typeof CheckInResult];

export const ContributionStatus = {
  PLEDGED: "PLEDGED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  WRITTEN_OFF: "WRITTEN_OFF",
} as const;
export type ContributionStatus =
  (typeof ContributionStatus)[keyof typeof ContributionStatus];

export const LedgerAccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  EQUITY: "EQUITY",
} as const;
export type LedgerAccountType =
  (typeof LedgerAccountType)[keyof typeof LedgerAccountType];

export const EventCategory = {
  CONCERTS: "CONCERTS",
  SPORTS: "SPORTS",
  COMEDY: "COMEDY",
  CONFERENCES: "CONFERENCES",
  PARTIES: "PARTIES",
  WEDDINGS: "WEDDINGS",
  MEETINGS: "MEETINGS",
  COMMUNITY: "COMMUNITY",
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];
