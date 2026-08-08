import type { Metadata } from "next";
import Link from "next/link";
import { EventType } from "@/domain/enums";
import { EVENT_TYPE_BEHAVIOUR, EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { Section } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { BookingIllustration } from "@/components/home/booking-illustration";
import { Badge } from "@/components/ui/badge";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Bookings",
  description:
    "Create reservations for meetings, banquets, ceremonies and private events, and manage your guest list on Bookit.",
};

const BOOKING_TYPES: Array<{
  type: EventType;
  icon: BookitIconName;
  examples: string;
}> = [
  { type: EventType.BOOKING, icon: "booking", examples: "Meeting rooms, venues, family lunches" },
  { type: EventType.BANQUET, icon: "seat", examples: "Wedding receptions, corporate dinners" },
  {
    type: EventType.PRIVATE_INVITATION,
    icon: "gift",
    examples: "Ruracio ceremonies, private parties",
  },
  {
    type: EventType.RECURRING_MEETING,
    icon: "meeting",
    examples: "Chama meetings, committee sessions",
  },
  { type: EventType.FREE_RSVP, icon: "rsvp", examples: "Meetups, community events, workshops" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const typeFilter = typeof params.type === "string" ? params.type : undefined;

  const { catalog } = getContainer();
  const { items } = await catalog.search({
    types: typeFilter
      ? [typeFilter]
      : [
          EventType.BOOKING,
          EventType.BANQUET,
          EventType.RECURRING_MEETING,
          EventType.PRIVATE_INVITATION,
        ],
    limit: 24,
  });

  return (
    <div className="page-shell py-8 lg:py-12">
      {/* Intro */}
      <div className="overflow-hidden rounded-hero border border-primary/15 bg-primary-tint">
        <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:p-10">
          <div>
            <h1 className="text-2xl font-bold text-ink lg:text-3xl">Make a Booking</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-secondary lg:text-base">
              Bookit is not only for concerts. Create reservations for meetings, banquets,
              ceremonies and private events — then manage RSVPs, guest counts, tables, meal
              choices and contributions in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/organizer/events/new">Create Booking</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/account/bookings">My bookings</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-card-lg border border-white/60 bg-white/50 p-4">
            <BookingIllustration className="h-auto w-full" />
          </div>
        </div>
      </div>

      {/* What you can book */}
      <Section title="What can you book?" headingLevel="h2">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKING_TYPES.map(({ type, icon, examples }) => {
            const behaviour = EVENT_TYPE_BEHAVIOUR[type];
            return (
              <li key={type}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                      <BookitIcon name={icon} className="size-5" />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-ink">
                      {EVENT_TYPE_LABEL[type]}
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-secondary">{behaviour.blurb}</p>
                    <p className="mt-2 text-xs text-muted">{examples}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {behaviour.supportsTables ? <Badge>Tables</Badge> : null}
                      {behaviour.supportsContributions ? <Badge>Contributions</Badge> : null}
                      {behaviour.guestListDriven ? <Badge>Guest list</Badge> : null}
                      {behaviour.recurring ? <Badge>Recurring</Badge> : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Bookable events */}
      <Section
        title="Open for booking"
        description="Reservations, ceremonies, banquets and recurring meetings currently taking guests."
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<BookitIcon name="booking" className="size-5" />}
            title="Nothing open right now"
            description="There are no bookable events matching that filter. You can always create your own."
            action={{ label: "Create a booking", href: "/organizer/events/new" }}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((summary) => (
              <li key={summary.event.id}>
                <EventCard summary={summary} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
