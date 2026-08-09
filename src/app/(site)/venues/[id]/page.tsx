import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { getContainer } from "@/server/container";
import { venueGallery, venueHeroImage } from "@/server/venue-media";
import { boxAround, MapEmbed } from "@/components/common/map-embed";
import { EventRail } from "@/components/events/event-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pluralise } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getContainer().catalog.venueDetail(id);
  if (!detail) return { title: "Venue not found" };
  return {
    title: detail.venue.name,
    description: `${detail.venue.name} — ${detail.venue.addressLine}. Capacity ${detail.venue.capacity.toLocaleString("en-KE")}. See what's on at this venue on Bookit.`,
  };
}

/**
 * A venue's own page.
 *
 * This exists because the venue cards used to link to `/events?city=…`, which
 * answered a question nobody asked: clicking "Bomas International Convention
 * Centre" produced a list of every event in Nairobi, so it read as though the
 * click had done nothing. What a visitor wants from a venue is this page — the
 * place, where it is, how big it is, and specifically what is on *here*.
 */
export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getContainer().catalog.venueDetail(id);
  if (!detail) notFound();

  const { venue, upcoming, past } = detail;
  const gallery = venueGallery(venue.id);
  const hasCoordinates = venue.latitude !== null && venue.longitude !== null;

  return (
    <div className="page-shell py-6 lg:py-8">
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-primary"
      >
        <ArrowLeft className="size-4" /> All venues
      </Link>

      {/* Hero */}
      <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-hero border border-line bg-surface-secondary sm:aspect-[21/9]">
        <Image
          src={venueHeroImage(venue.id)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">{venue.name}</h1>
          <p className="mt-1.5 text-sm text-white/80">
            {venue.area} · {venue.city}
          </p>
        </div>
      </div>

      {/* Facts */}
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <MapPin className="size-3.5" /> Address
          </dt>
          <dd className="mt-1.5 text-sm text-ink">{venue.addressLine}</dd>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Users className="size-3.5" /> Capacity
          </dt>
          <dd className="tabular mt-1.5 text-sm text-ink">
            {venue.capacity.toLocaleString("en-KE")} people
          </dd>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            On sale now
          </dt>
          <dd className="mt-1.5 text-sm text-ink">
            {upcoming.length > 0 ? pluralise(upcoming.length, "upcoming event") : "Nothing yet"}
          </dd>
        </div>
      </dl>

      {/* Sections */}
      {venue.sections.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Sections</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {venue.sections.map((section) => (
              <li key={section.id}>
                <Badge>
                  {section.name} · {section.capacity.toLocaleString("en-KE")}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Gallery — only for venues with published media. */}
      {gallery.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Inside the venue</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((item) => (
              <li key={item.src}>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-card-sm border border-line bg-surface-secondary">
                    <Image
                      src={item.src}
                      alt={item.caption}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="mt-1.5 text-xs text-muted">{item.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Map */}
      {hasCoordinates ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Getting there</h2>
          <Card className="mt-4 overflow-hidden">
            <MapEmbed
              className="h-56 sm:h-72"
              bbox={boxAround({ latitude: venue.latitude!, longitude: venue.longitude! })}
              marker={{ latitude: venue.latitude!, longitude: venue.longitude! }}
              title={`Map showing ${venue.name}`}
            />
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-ink-secondary">{venue.addressLine}</p>
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* What's actually on here — the reason for the click. */}
      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">What&apos;s on at {venue.name}</h2>
          <Link
            href={`/events?city=${encodeURIComponent(venue.city)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            All {venue.city} events
          </Link>
        </div>
        <EventRail
          events={upcoming}
          columns={4}
          emptyMessage={`No events scheduled at ${venue.name} right now. Browse everything in ${venue.city} instead.`}
        />
      </section>

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-ink">Previously here</h2>
          <EventRail events={past.slice(0, 4)} columns={4} />
        </section>
      ) : null}
    </div>
  );
}
