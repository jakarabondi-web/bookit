import { EventType } from "@/domain/enums";
import { formatMoney, money } from "@/domain/money";

export { formatDateTime } from "./format";

/**
 * Revenue for a non-ticketed event is meaningless rather than zero — showing
 * "KES 0" next to a free RSVP reads as a failure, so those render a dash.
 */
export function formatMoneyOrDash(minorUnits: number, eventType: EventType): string {
  const sellsTickets = eventType === EventType.PAID_TICKET || eventType === EventType.HYBRID;
  if (!sellsTickets && minorUnits === 0) return "—";
  return formatMoney(money(minorUnits, "KES"));
}
