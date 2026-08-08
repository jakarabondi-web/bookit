import type { Metadata } from "next";
import { Suspense } from "react";
import { EventType } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { CardGridSkeleton, EmptyState } from "@/components/ui/states";
import type { EventQuery } from "@/server/repositories/types";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse concerts, sports, comedy, conferences, parties, weddings, meetings and community events across Kenya.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Turns the URL's search params into a repository query. */
function buildQuery(params: SearchParams): EventQuery {
  const view = one(params, "view");
  const type = one(params, "type");

  const query: EventQuery = {
    search: one(params, "q"),
    city: one(params, "city"),
    category: one(params, "category"),
    limit: 48,
  };

  if (type) query.types = [type];

  if (view === "weekend") {
    const now = new Date();
    const daysToFriday = (5 - now.getDay() + 7) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() + daysToFriday);
    friday.setHours(0, 0, 0, 0);
    const monday = new Date(friday);
    monday.setDate(friday.getDate() + 3);
    query.from = friday.toISOString();
    query.to = monday.toISOString();
  }

  if (view === "bookings") {
    query.types = [
      EventType.BOOKING,
      EventType.BANQUET,
      EventType.RECURRING_MEETING,
      EventType.PRIVATE_INVITATION,
    ];
    query.includeNonPublic = true;
  }

  return query;
}

async function EventResults({ params }: { params: SearchParams }) {
  const { catalog } = getContainer();
  const { items } = await catalog.search(buildQuery(params));

  return (
    <>
      <EventFilters resultCount={items.length} />

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<BookitIcon name="search" className="size-5" />}
            title="No events match those filters"
            description="Try a different city, widen the date range, or clear the filters to see everything happening on Bookit."
            action={{ label: "Browse all events", href: "/events" }}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((summary, index) => (
              <li key={summary.event.id}>
                <EventCard summary={summary} priority={index < 5} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="page-shell py-8 lg:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">Events</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Every kind of event on one platform — paid tickets, free RSVPs, private invitations,
          reservations, banquets and recurring meetings.
        </p>
      </header>

      {/* Re-suspends whenever the search params change, so the filter bar stays
          interactive while results reload. */}
      <Suspense
        key={JSON.stringify(params)}
        fallback={
          <>
            <div className="skeleton h-11 w-full" />
            <div className="mt-8">
              <CardGridSkeleton count={10} />
            </div>
          </>
        }
      >
        <EventResults params={params} />
      </Suspense>
    </div>
  );
}
