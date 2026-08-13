import { EventType } from "@/domain/enums";
import { EVENT_TYPE_BEHAVIOUR } from "@/domain/event-type-policy";
import type { BookitIconName } from "@/components/ui/bookit-icon";

/**
 * The five kinds of gathering the booking hub covers, in the order a visitor
 * is most likely to want them.
 *
 * `label` and `examples` are the only strings written here. Everything else a
 * kind knows about itself — what the host is asking for, whether tables or
 * contributions apply — is read from `EVENT_TYPE_BEHAVIOUR`, so this list can
 * never drift from the policy table the backend uses.
 */

export interface BookingKind {
  type: EventType;
  /** Shorter than EVENT_TYPE_LABEL: these read as a row of controls. */
  label: string;
  icon: BookitIconName;
  examples: string;
}

export const BOOKING_KINDS: BookingKind[] = [
  {
    type: EventType.BOOKING,
    label: "Reservation",
    icon: "booking",
    examples: "Meeting rooms, venues, family lunches",
  },
  {
    type: EventType.BANQUET,
    label: "Banquet",
    icon: "seat",
    examples: "Wedding receptions, corporate dinners",
  },
  {
    type: EventType.PRIVATE_INVITATION,
    label: "Private invitation",
    icon: "gift",
    examples: "Ruracio ceremonies, private parties",
  },
  {
    type: EventType.RECURRING_MEETING,
    label: "Recurring meeting",
    icon: "meeting",
    examples: "Chama meetings, committee sessions",
  },
  {
    type: EventType.FREE_RSVP,
    label: "Free RSVP",
    icon: "rsvp",
    examples: "Meetups, community events, workshops",
  },
];

/** The kinds that appear in the register when no filter is applied. */
export const DEFAULT_REGISTER_TYPES: EventType[] = [
  EventType.BOOKING,
  EventType.BANQUET,
  EventType.RECURRING_MEETING,
  EventType.PRIVATE_INVITATION,
];

/** Narrows an untrusted `?type=` value to a kind this page actually offers. */
export function parseKind(value: string | string[] | undefined): EventType | null {
  if (typeof value !== "string") return null;
  const match = BOOKING_KINDS.find((kind) => kind.type === value);
  return match ? match.type : null;
}

/**
 * What the host will ask a guest for, phrased from the guest's side.
 *
 * Only the things the policy table marks as required are listed. Contributions
 * are deliberately excluded: `supportsContributions` means the host *may*
 * collect them, and promising a guest they will be asked for money when they
 * might not be is worse than saying nothing.
 */
export function asksFor(type: EventType): string[] {
  const behaviour = EVENT_TYPE_BEHAVIOUR[type];
  const asks: string[] = [];
  if (behaviour.requiresInvite) asks.push("your invitation code");
  if (behaviour.guestListDriven) asks.push("your guest count");
  if (behaviour.supportsTables) asks.push("a table");
  return asks;
}

/** "your invitation code, your guest count and a table" */
export function asksForSentence(type: EventType): string | null {
  const asks = asksFor(type);
  if (asks.length === 0) return null;
  if (asks.length === 1) return asks[0]!;
  return `${asks.slice(0, -1).join(", ")} and ${asks.at(-1)}`;
}
