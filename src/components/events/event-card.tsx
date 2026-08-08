import Image from "next/image";
import Link from "next/link";
import { EventType } from "@/domain/enums";
import { cardStatusLabel } from "@/domain/event-type-policy";
import type { EventSummary } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { dateBadge, formatPrice, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The event card used across every rail and grid.
 *
 * Price is shown when the event sells tickets; otherwise the card shows the
 * acquisition mode for that event type (Free / RSVP, Invitation Only, Reserve
 * Spot, …) so a browsing visitor can tell instantly what Bookit will ask of
 * them.
 */

export interface EventCardProps {
  summary: EventSummary;
  className?: string;
  /** Fixed-width variant for horizontal rails on mobile. */
  railWidth?: boolean;
  priority?: boolean;
}

function statusTone(event: EventSummary["event"]) {
  switch (event.type) {
    case EventType.FREE_RSVP:
      return "success" as const;
    case EventType.PRIVATE_INVITATION:
      return "info" as const;
    case EventType.BOOKING:
    case EventType.BANQUET:
    case EventType.RECURRING_MEETING:
      return "brand" as const;
    default:
      return "neutral" as const;
  }
}

export function EventCard({ summary, className, railWidth, priority }: EventCardProps) {
  const { event, venue, fromPrice, soldOut } = summary;
  const badge = dateBadge(event.startsAt);
  const sellsTickets = summary.ticketTypes.length > 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        railWidth && "w-[16rem] sm:w-[17rem]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-surface-secondary">
        <Image
          src={event.cardImage}
          alt=""
          fill
          sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Date badge */}
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-surface/95 px-2.5 py-1.5 shadow-card backdrop-blur">
          <span className="text-base font-bold leading-none text-ink">{badge.day}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-primary">
            {badge.month}
          </span>
        </div>

        {soldOut ? (
          <div className="absolute right-3 top-3">
            <Badge tone="solid">Sold out</Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {/* Stretched link keeps the whole card clickable without nesting links. */}
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>

        <p className="line-clamp-1 text-xs text-muted">
          {venue.name} · {venue.city}
        </p>
        <p className="text-xs text-muted">{formatTime(event.startsAt)}</p>

        <div className="mt-auto pt-2">
          {sellsTickets ? (
            <span className="text-sm font-semibold text-primary">
              {formatPrice(fromPrice, { from: true })}
            </span>
          ) : (
            <Badge tone={statusTone(event)}>{cardStatusLabel(event.type)}</Badge>
          )}
        </div>
      </div>
    </article>
  );
}
