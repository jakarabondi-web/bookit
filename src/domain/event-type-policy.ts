import { EventType } from "./enums";

/**
 * The single place that answers "how does this event type behave?".
 *
 * Both the backend workflow selection and the frontend's adaptive booking card
 * read from this table, so a BANQUET can never be quietly forced through the
 * ticket abstraction in one layer while behaving correctly in the other.
 */

export type AcquisitionMode =
  | "BUY_TICKETS"
  | "RSVP"
  | "INVITE_CODE"
  | "RESERVE"
  | "SELECT_TABLE"
  | "JOIN_SERIES";

export interface EventTypeBehaviour {
  /** Primary action(s) offered on the event detail page, in order. */
  modes: AcquisitionMode[];
  /** Label for the primary call to action. */
  primaryCta: string;
  /** Does acquiring a place issue a `Ticket` record? */
  issuesTickets: boolean;
  /** Does acquiring a place create a `Booking` record? */
  createsBooking: boolean;
  /** Does the checkout normally move money? */
  requiresPayment: boolean;
  /** Must the visitor present an invite token to see/act on the event? */
  requiresInvite: boolean;
  /** Is guest-list management the organizer's primary tool for this type? */
  guestListDriven: boolean;
  /** Are banquet tables and seat assignment relevant? */
  supportsTables: boolean;
  /** Does the event materialise repeated occurrences? */
  recurring: boolean;
  /** Are member contributions (ruracio/chama/fundraiser) tracked? */
  supportsContributions: boolean;
  /** Short human explanation used in the UI and organizer wizard. */
  blurb: string;
}

export const EVENT_TYPE_BEHAVIOUR: Record<EventType, EventTypeBehaviour> = {
  PAID_TICKET: {
    modes: ["BUY_TICKETS"],
    primaryCta: "Get Tickets",
    issuesTickets: true,
    createsBooking: false,
    requiresPayment: true,
    requiresInvite: false,
    guestListDriven: false,
    supportsTables: false,
    recurring: false,
    supportsContributions: false,
    blurb: "Sell tickets with assigned or general admission and instant delivery.",
  },
  FREE_RSVP: {
    modes: ["RSVP"],
    primaryCta: "RSVP",
    issuesTickets: false,
    createsBooking: true,
    requiresPayment: false,
    requiresInvite: false,
    guestListDriven: true,
    supportsTables: false,
    recurring: false,
    supportsContributions: false,
    blurb: "Collect free RSVPs with capacity limits and a waitlist.",
  },
  PRIVATE_INVITATION: {
    modes: ["INVITE_CODE", "RSVP"],
    primaryCta: "Enter Invitation Code",
    issuesTickets: false,
    createsBooking: true,
    requiresPayment: false,
    requiresInvite: true,
    guestListDriven: true,
    supportsTables: true,
    recurring: false,
    supportsContributions: true,
    blurb: "Invite-only events with per-guest codes, guest counts and expiry.",
  },
  BOOKING: {
    modes: ["RESERVE"],
    primaryCta: "Reserve Spot",
    issuesTickets: false,
    createsBooking: true,
    requiresPayment: false,
    requiresInvite: false,
    guestListDriven: true,
    supportsTables: false,
    recurring: false,
    supportsContributions: false,
    blurb: "Reservations for meetings, venues and private gatherings.",
  },
  BANQUET: {
    modes: ["SELECT_TABLE", "RESERVE"],
    primaryCta: "Select Table",
    issuesTickets: false,
    createsBooking: true,
    requiresPayment: false,
    requiresInvite: false,
    guestListDriven: true,
    supportsTables: true,
    recurring: false,
    supportsContributions: true,
    blurb: "Seated ceremonies with tables, meal choices and seat assignment.",
  },
  RECURRING_MEETING: {
    modes: ["JOIN_SERIES", "RSVP"],
    primaryCta: "Join Meeting",
    issuesTickets: false,
    createsBooking: true,
    requiresPayment: false,
    requiresInvite: false,
    guestListDriven: true,
    supportsTables: false,
    recurring: true,
    supportsContributions: true,
    blurb: "Recurring series such as chama meetings, with per-occurrence attendance.",
  },
  HYBRID: {
    modes: ["BUY_TICKETS", "RSVP"],
    primaryCta: "Buy Tickets",
    issuesTickets: true,
    createsBooking: true,
    requiresPayment: true,
    requiresInvite: false,
    guestListDriven: true,
    supportsTables: true,
    recurring: false,
    supportsContributions: false,
    blurb: "Paid tickets for the public plus an invited guest list.",
  },
};

export function behaviourFor(type: EventType): EventTypeBehaviour {
  return EVENT_TYPE_BEHAVIOUR[type];
}

/** Human-friendly labels used on badges and in the organizer wizard. */
export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  PAID_TICKET: "Paid Event",
  FREE_RSVP: "Free RSVP Event",
  PRIVATE_INVITATION: "Private Invitation",
  BOOKING: "Booking / Reservation",
  BANQUET: "Banquet",
  RECURRING_MEETING: "Recurring Meeting",
  HYBRID: "Hybrid Event",
};

/** The short status label shown on an event card, e.g. "Free", "RSVP Only". */
export function cardStatusLabel(type: EventType): string {
  switch (type) {
    case EventType.FREE_RSVP:
      return "Free / RSVP";
    case EventType.PRIVATE_INVITATION:
      return "Invitation Only";
    case EventType.BOOKING:
      return "Reserve Spot";
    case EventType.BANQUET:
      return "Table Reservation";
    case EventType.RECURRING_MEETING:
      return "Members Only";
    case EventType.HYBRID:
    case EventType.PAID_TICKET:
      return "Tickets";
    default:
      return "Tickets";
  }
}
