import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EVENT_TYPE_BEHAVIOUR } from "@/domain/event-type-policy";
import type { EventSummary } from "@/domain/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { asksForSentence } from "./booking-kinds";

/**
 * The register of open bookings.
 *
 * Deliberately not the `EventCard` grid used by `/events`. A ticketed event is
 * sold on its poster and its price; a booking is not sold at all — the visitor
 * is deciding whether to answer a host. The two things that decision turns on
 * are how many places are left and what the host will ask them for, so those
 * lead the row, and the photograph is dropped entirely.
 *
 * The place count sits in a fixed left column at display size, which lines the
 * numbers up as a column down the page and makes the register scannable the
 * way a guest book is.
 */

/** Below this share of capacity the count is shown as running out. */
const NEARLY_FULL_RATIO = 0.1;

interface PlaceCount {
  value: string;
  label: string;
  tone: "available" | "nearly-full" | "full";
}

function placeCount(summary: EventSummary): PlaceCount {
  const { event, remainingCapacity, soldOut } = summary;

  if (soldOut || remainingCapacity === 0) {
    return { value: "Full", label: "no places left", tone: "full" };
  }
  if (remainingCapacity === null) {
    return { value: "Open", label: "no limit set", tone: "available" };
  }

  const nearlyFull =
    event.capacity !== null && remainingCapacity <= event.capacity * NEARLY_FULL_RATIO;

  return {
    value: String(remainingCapacity),
    label: remainingCapacity === 1 ? "place left" : "places left",
    tone: nearlyFull ? "nearly-full" : "available",
  };
}

function BookingRow({ summary }: { summary: EventSummary }) {
  const { event, venue } = summary;
  const behaviour = EVENT_TYPE_BEHAVIOUR[event.type];
  const count = placeCount(summary);
  const asks = asksForSentence(event.type);
  const unavailable = count.tone === "full";

  return (
    <li>
      {/*
        One link for the whole row: a single tab stop, and no anchor nested
        inside another. The trailing control is styled as a button but is part
        of the same link.
      */}
      <Link
        href={`/events/${event.slug}`}
        /*
          Explicitly background-color, not `transition-colors`: that utility
          also transitions `outline-color`, which makes the keyboard focus ring
          fade in rather than appear the instant the row is tabbed to.
        */
        className="group grid grid-cols-[5.25rem_1fr] items-start gap-x-4 gap-y-3 px-4 py-6 transition-[background-color] hover:bg-surface-secondary sm:grid-cols-[8.5rem_1fr] sm:gap-x-6 sm:px-6 lg:grid-cols-[8.5rem_1fr_auto] lg:items-center"
      >
        {/*
          The signature: places left, as a ruled column of figures. The rule is
          the guest book's — it is what makes a column of numbers read as a
          register rather than as a stack of cards.
        */}
        <span className="flex flex-col self-stretch sm:border-r sm:border-line sm:pr-6 lg:items-end lg:text-right">
          <span
            className={cn(
              "font-poster text-[2.25rem] font-normal leading-none tabular sm:text-[3.25rem]",
              count.tone === "available" && "text-primary",
              count.tone === "nearly-full" && "text-warning",
              count.tone === "full" && "text-muted",
            )}
          >
            {count.value}
          </span>
          <span className="mt-2 text-[11px] uppercase leading-tight tracking-[0.08em] text-muted">
            {count.label}
          </span>
        </span>

        <span className="min-w-0">
          <span className="block font-display text-base font-bold leading-snug text-ink transition-[color] group-hover:text-primary-hover lg:text-lg">
            {event.title}
          </span>
          {event.subtitle ? (
            <span className="mt-0.5 block text-sm text-ink-secondary">{event.subtitle}</span>
          ) : null}

          {/*
            A bookable room is often titled after the room it is, so printing
            the venue again would stutter: "Delta Corner Boardroom · Delta
            Corner Boardroom · Nairobi".
          */}
          <span className="mt-2 block text-sm text-muted">
            {venue.name === event.title ? venue.area : venue.name} · {venue.city} ·{" "}
            {event.recurrence ? event.recurrence.humanLabel : formatDateTime(event.startsAt)}
          </span>

          {asks ? (
            <span className="mt-1.5 block text-sm text-ink-secondary">
              The host asks for {asks}.
            </span>
          ) : null}
        </span>

        <span className="col-start-2 lg:col-start-3">
          <span
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-[background-color,color]",
              unavailable
                ? "border border-line bg-surface text-ink-secondary"
                : "bg-primary-tint text-primary-hover group-hover:bg-primary group-hover:text-primary-foreground",
            )}
          >
            {unavailable ? "See details" : behaviour.primaryCta}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </span>
      </Link>
    </li>
  );
}

export function BookingRegister({ items }: { items: EventSummary[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {items.map((summary) => (
        <BookingRow key={summary.event.id} summary={summary} />
      ))}
    </ul>
  );
}
