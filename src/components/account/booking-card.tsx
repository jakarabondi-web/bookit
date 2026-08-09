import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { BookingStatus, EventVisibility } from "@/domain/enums";
import type { Booking, Event, Venue } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, pluralise } from "@/lib/format";

const STATUS_TONE: Record<BookingStatus, "success" | "warning" | "info" | "error" | "neutral"> = {
  CONFIRMED: "success",
  CHECKED_IN: "success",
  PENDING: "warning",
  WAITLISTED: "info",
  DECLINED: "neutral",
  CANCELLED: "error",
  NO_SHOW: "neutral",
};

/** Shown on controls whose service layer exists but whose flow is unbuilt. */
const NOT_YET = "Not available yet";

const STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  PENDING: "Awaiting confirmation",
  WAITLISTED: "Waitlisted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

/**
 * A booking in the account area.
 *
 * Which actions appear depends on the booking's state — a cancelled booking
 * offers nothing but a look at the event, and only a confirmed one shows a QR.
 */
export function BookingCard({
  booking,
  event,
  venue,
}: {
  booking: Booking;
  event: Event;
  venue: Venue;
}) {
  const isActive =
    booking.status === BookingStatus.CONFIRMED ||
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.WAITLISTED;
  const isPast = new Date(event.endsAt) < new Date();

  /**
   * A private event has no public page — `/events/[slug]` 404s it on purpose,
   * so linking there sent guests of a ruracio or wedding to a dead end. Their
   * booking is the record they came for, so the title stops being a link and
   * the venue takes over as the useful destination.
   */
  const hasPublicPage = event.visibility === EventVisibility.PUBLIC;

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card-sm sm:aspect-square sm:w-32">
        <Image
          src={event.cardImage}
          alt=""
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink">
              {hasPublicPage ? (
                <Link href={`/events/${event.slug}`} className="hover:text-primary">
                  {event.title}
                </Link>
              ) : (
                event.title
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted">Reference {booking.reference}</p>
          </div>
          <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd>{formatDateTime(event.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-4 text-muted" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd>
              {venue.name}, {venue.city}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-muted" aria-hidden="true" />
            <dt className="sr-only">Guests</dt>
            <dd>{pluralise(booking.guestCount, "guest")}</dd>
          </div>
        </dl>

        {booking.notes ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted">{booking.notes}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            {hasPublicPage ? (
              <Link href={`/events/${event.slug}`}>View event</Link>
            ) : (
              <Link href={`/venues/${venue.id}`}>View venue</Link>
            )}
          </Button>
          {isActive && !isPast ? (
            <>
              {/* Not yet built: `BookingService` has the operations but there
                  is no route or UI for them. Disabled rather than live-looking
                  and inert — a button that silently does nothing is worse than
                  one that says it isn't ready. */}
              <Button size="sm" variant="ghost" disabled title={NOT_YET}>
                Edit Guests
              </Button>
              <Button size="sm" variant="ghost" disabled title={NOT_YET}>
                Update RSVP
              </Button>
              {booking.status === BookingStatus.CONFIRMED ? (
                <Button size="sm" variant="ghost" disabled title={NOT_YET}>
                  View QR
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" disabled title={NOT_YET}>
                Contact Organizer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled
                title={NOT_YET}
                className="text-error hover:bg-error-tint"
              >
                Cancel Booking
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
