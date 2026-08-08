import {
  BookingStatus,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  ResaleListingStatus,
  TicketStatus,
  TransferStatus,
} from "./enums";
import { invalidState } from "./errors";

/**
 * Explicit transition tables. Every state change in the system goes through
 * `assertTransition`, so an illegal transition is a loud domain error rather
 * than a silently corrupted row.
 */

type Transitions<T extends string> = Readonly<Record<T, readonly T[]>>;

export const TICKET_TRANSITIONS: Transitions<TicketStatus> = {
  ACTIVE: ["LISTED", "TRANSFERRED", "CHECKED_IN", "REFUNDED", "VOIDED", "CANCELLED", "SUSPENDED"],
  LISTED: ["ACTIVE", "SOLD", "CANCELLED", "SUSPENDED", "VOIDED"],
  SOLD: ["ACTIVE", "VOIDED"],
  TRANSFERRED: ["ACTIVE", "VOIDED"],
  CHECKED_IN: ["CONSUMED", "VOIDED"],
  CONSUMED: [],
  REFUNDED: [],
  VOIDED: [],
  CANCELLED: [],
  SUSPENDED: ["ACTIVE", "VOIDED", "CANCELLED"],
};

export const BOOKING_TRANSITIONS: Transitions<BookingStatus> = {
  PENDING: ["CONFIRMED", "WAITLISTED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW", "WAITLISTED"],
  WAITLISTED: ["CONFIRMED", "CANCELLED", "DECLINED"],
  DECLINED: ["PENDING"],
  CANCELLED: [],
  CHECKED_IN: [],
  NO_SHOW: [],
};

export const ORDER_TRANSITIONS: Transitions<OrderStatus> = {
  CREATED: ["AWAITING_PAYMENT", "PAID", "CANCELLED", "EXPIRED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["FULFILLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  FULFILLED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const PAYMENT_TRANSITIONS: Transitions<PaymentStatus> = {
  CREATED: ["PENDING", "FAILED", "CANCELLED"],
  PENDING: ["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED"],
  CAPTURED: ["SETTLED", "REFUNDED", "DISPUTED"],
  SETTLED: ["REFUNDED", "DISPUTED"],
  DISPUTED: ["CHARGEBACK", "SETTLED"],
  CHARGEBACK: [],
  REFUNDED: [],
  FAILED: [],
  CANCELLED: [],
};

export const PAYOUT_TRANSITIONS: Transitions<PayoutStatus> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "FAILED"],
  UNDER_REVIEW: ["APPROVED", "FAILED"],
  APPROVED: ["PROCESSING", "FAILED"],
  PROCESSING: ["PAID", "FAILED"],
  PAID: ["REVERSED"],
  FAILED: ["PENDING"],
  REVERSED: [],
};

export const LISTING_TRANSITIONS: Transitions<ResaleListingStatus> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["RESERVED", "CANCELLED", "EXPIRED", "BLOCKED"],
  RESERVED: ["SOLD", "ACTIVE", "CANCELLED"],
  SOLD: [],
  CANCELLED: [],
  EXPIRED: [],
  BLOCKED: ["ACTIVE", "CANCELLED"],
};

export const TRANSFER_TRANSITIONS: Transitions<TransferStatus> = {
  PENDING: ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
  ACCEPTED: [],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition<T extends string>(
  table: Transitions<T>,
  from: T,
  to: T,
): boolean {
  return (table[from] ?? []).includes(to);
}

export function assertTransition<T extends string>(
  table: Transitions<T>,
  from: T,
  to: T,
  subject: string,
): void {
  if (from === to) return;
  if (!canTransition(table, from, to)) {
    throw invalidState(`${subject} cannot move from ${from} to ${to}`, { from, to });
  }
}

/** Ticket statuses that still grant entry to the venue. */
export const ADMITTABLE_TICKET_STATUSES: readonly TicketStatus[] = [
  TicketStatus.ACTIVE,
  TicketStatus.LISTED,
];

/** Ticket statuses whose credentials must be rejected by scanners. */
export const REVOKED_TICKET_STATUSES: readonly TicketStatus[] = [
  TicketStatus.REFUNDED,
  TicketStatus.VOIDED,
  TicketStatus.CANCELLED,
  TicketStatus.SUSPENDED,
  TicketStatus.TRANSFERRED,
  TicketStatus.SOLD,
];
