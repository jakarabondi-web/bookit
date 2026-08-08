import { formatMoney, type Money } from "@/domain/money";

/**
 * Presentation helpers. Everything is pinned to `en-KE` and `Africa/Nairobi`
 * so the server and the browser render identical strings and React does not
 * report a hydration mismatch.
 */

const TIME_ZONE = "Africa/Nairobi";
const LOCALE = "en-KE";

export function formatPrice(value: Money | null, options?: { from?: boolean }): string {
  if (!value) return "Free";
  if (value.amount === 0) return "Free";
  const formatted = formatMoney(value).replace("KES", "KES");
  return options?.from ? `From ${formatted}` : formatted;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** Day and month for the date badge on an event card. */
export function dateBadge(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(LOCALE, { day: "2-digit", timeZone: TIME_ZONE }).format(date),
    month: new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TIME_ZONE })
      .format(date)
      .toUpperCase(),
  };
}

/** "Fri 12 Sep, 6:00 PM – 11:00 PM" or a date range when it spans days. */
export function formatEventWindow(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay =
    new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeZone: TIME_ZONE }).format(start) ===
    new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeZone: TIME_ZONE }).format(end);

  return sameDay
    ? `${formatDate(startsAt)} · ${formatTime(startsAt)} – ${formatTime(endsAt)}`
    : `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
}

export function formatRelativeDays(iso: string): string {
  const days = Math.round(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < 0) return `${Math.abs(days)} days ago`;
  return formatDateShort(iso);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
