import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { getContainer } from "@/server/container";
import { venueHeroImage } from "@/server/venue-media";
import { boxContaining, MapEmbed } from "@/components/common/map-embed";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CITIES } from "@/lib/cities";
import { pluralise } from "@/lib/format";

export const metadata: Metadata = {
  title: "Venues",
  description:
    "Stadiums, gardens, ballrooms and meeting rooms hosting events across Kenya on Bookit.",
};

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cityFilter = typeof params.city === "string" ? params.city : undefined;

  const container = getContainer();
  const venues = await container.uow.repos.venues.list();
  const events = await container.uow.repos.events.listAll();
  const now = new Date().toISOString();

  const rows = venues
    .filter((venue) => !cityFilter || venue.city === cityFilter)
    .map((venue) => ({
      venue,
      upcoming: events.filter(
        (event) =>
          event.venueId === venue.id && event.startsAt >= now && event.status !== "CANCELLED",
      ).length,
    }))
    .sort((a, b) => b.upcoming - a.upcoming || a.venue.name.localeCompare(b.venue.name));

  const located = rows
    .filter(({ venue }) => venue.latitude !== null && venue.longitude !== null)
    .map(({ venue }) => ({ latitude: venue.latitude!, longitude: venue.longitude! }));
  const mapBox = boxContaining(located);

  return (
    <div className="page-shell py-8 lg:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">Venues</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          From 60,000-seat stadiums to a 40-seat boardroom in Westlands — every venue currently
          hosting events on Bookit.
        </p>
      </header>

      <nav aria-label="Filter by city" className="mb-8">
        <ul className="scroll-rail sm:flex sm:flex-wrap sm:gap-2 sm:overflow-visible">
          <li>
            <Link
              href="/venues"
              aria-current={!cityFilter ? "page" : undefined}
              className={`inline-flex whitespace-nowrap rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
                !cityFilter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary"
              }`}
            >
              All cities
            </Link>
          </li>
          {CITIES.map((city) => (
            <li key={city}>
              <Link
                href={`/venues?city=${encodeURIComponent(city)}`}
                aria-current={cityFilter === city ? "page" : undefined}
                className={`inline-flex whitespace-nowrap rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
                  cityFilter === city
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary"
                }`}
              >
                {city}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Orientation map framed to the venues actually listed below, not to a
          hardcoded place name — so filtering the list reframes the map. OSM's
          embed supports one marker, so a single result gets pinned and a
          multi-venue view shows the area they span. */}
      {mapBox ? (
        <div className="mb-8 overflow-hidden rounded-card border border-line">
          <MapEmbed
            className="h-64 sm:h-72"
            bbox={mapBox}
            marker={located.length === 1 ? located[0] : undefined}
            title={
              cityFilter ? `Map of Bookit venues in ${cityFilter}` : "Map of Bookit venues in Kenya"
            }
          />
          {/* A plain link, so there is always a way to a real map even if the
              embed is blocked by a network or an extension. */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <p className="text-xs text-muted">
              {located.length} {located.length === 1 ? "venue" : "venues"} mapped
              {cityFilter ? ` in ${cityFilter}` : " across Kenya"}
            </p>
            <a
              href={`https://www.openstreetmap.org/?bbox=${mapBox.map((value) => value.toFixed(6)).join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open larger map ↗
            </a>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<BookitIcon name="venue" className="size-5" />}
          title="No venues in that city yet"
          description="We are adding venues across Kenya. Try another city."
          action={{ label: "See all venues", href: "/venues" }}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ venue, upcoming }) => (
            <li key={venue.id}>
              {/* The whole card is the link — a title-only target is a
                  fiddly tap on mobile and reads as inert on desktop. It goes
                  to the venue's own page: linking to a city-filtered event
                  list made the click look like it had done nothing. */}
              <Link
                href={`/venues/${venue.id}`}
                className="group block h-full"
                aria-label={`${venue.name} — venue details and upcoming events`}
              >
              <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/40">
                <div className="relative aspect-[16/9] bg-surface-secondary">
                  <Image
                    src={venueHeroImage(venue.id)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {/* Legibility scrim behind the badge, photo stays the hero. */}
                  <div
                    className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent"
                    aria-hidden="true"
                  />
                  <span className="absolute right-3 top-3">
                    {upcoming > 0 ? (
                      <Badge tone="brand">{pluralise(upcoming, "event")}</Badge>
                    ) : (
                      <Badge>No events</Badge>
                    )}
                  </span>
                </div>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold text-ink transition-colors group-hover:text-primary">
                    {venue.name}
                  </h2>

                  <dl className="mt-3 flex flex-col gap-1.5 text-sm text-ink-secondary">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                      <dt className="sr-only">Address</dt>
                      <dd>{venue.addressLine}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 shrink-0 text-muted" aria-hidden="true" />
                      <dt className="sr-only">Capacity</dt>
                      <dd className="tabular">
                        Capacity {venue.capacity.toLocaleString("en-KE")}
                      </dd>
                    </div>
                  </dl>

                  {venue.sections.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {venue.sections.map((section) => (
                        <li key={section.id}>
                          <Badge>{section.name}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
