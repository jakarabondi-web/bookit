import Image from "next/image";
import Link from "next/link";
import type { EventSummary } from "@/domain/types";
import { cardStatusLabel } from "@/domain/event-type-policy";
import { formatPrice, formatTime } from "@/lib/format";

/**
 * "Leo usiku" — the USIKU signature rail, directly under the hero.
 *
 * Time-sorted, not category-sorted: the next events to start, each card a
 * photograph with a door-time chip. Like the hero, the cards commit to the
 * dark treatment in both themes — they are night photography with text on a
 * gradient, and re-theming them would only cost legibility.
 */
export function TonightRail({ events }: { events: EventSummary[] }) {
  if (events.length === 0) return null;

  return (
    <section className="page-shell pt-10 lg:pt-12" aria-label="Happening next">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-poster text-3xl font-normal uppercase tracking-[0.01em] text-ink lg:text-4xl">
          Leo usiku
        </h2>
        <p className="text-sm text-muted">happening next · sorted by start time</p>
        <Link
          href="/events"
          className="ml-auto text-sm font-semibold text-primary hover:text-primary-hover"
        >
          All events →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {events.slice(0, 4).map(({ event, venue, fromPrice, ticketTypes }) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.slug}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-[#12141F] sm:aspect-[4/5]"
            >
              <Image
                src={event.cardImage}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#0A0B14]/10 via-transparent to-[#0A0B14]/95"
                aria-hidden="true"
              />

              <span className="absolute left-3 top-3 rounded-pill border border-white/15 bg-[#0A0B14]/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="text-[#FFC981]">{formatTime(event.startsAt)}</span>
                <span className="text-white/60"> · {shortDay(event.startsAt)}</span>
              </span>

              <div className="absolute inset-x-3 bottom-3">
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">
                  {event.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-white/60">
                  {venue.name} · {venue.city}
                </p>
                <p className="mt-1.5 text-sm font-bold text-[#FFC981]">
                  {ticketTypes.length > 0
                    ? formatPrice(fromPrice, { from: true })
                    : cardStatusLabel(event.type)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function shortDay(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}
