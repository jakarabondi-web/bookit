import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Info, MapPin, ShieldCheck, Users } from "lucide-react";
import { EventType } from "@/domain/enums";
import { EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { config } from "@/server/config";
import { BookingPanel } from "@/components/events/booking-panel";
import { boxAround, MapEmbed } from "@/components/common/map-embed";
import { venueGallery } from "@/server/venue-media";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatEventWindow, formatPrice, formatTime, initials } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getContainer().catalog.getBySlug(slug);
  if (!detail) return { title: "Event not found" };

  return {
    title: detail.event.title,
    description: detail.event.description.slice(0, 155),
    openGraph: {
      title: detail.event.title,
      description: detail.event.description.slice(0, 155),
      images: [{ url: detail.event.heroImage }],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const container = getContainer();
  const detail = await container.catalog.getBySlug(slug);
  if (!detail) notFound();

  const { event, organizer, venue, ticketTypes, occurrences, remainingCapacity } = detail;
  const gallery = venueGallery(venue.id);

  // Live availability per tier drives the quantity steppers in the panel.
  const availability: Record<string, number> = {};
  for (const ticketType of ticketTypes) {
    availability[ticketType.id] = await container.uow.repos.inventory.countAvailable(
      ticketType.id,
    );
  }

  const upcomingOccurrences = occurrences
    .filter((occurrence) => occurrence.startsAt >= new Date().toISOString())
    .slice(0, 4);

  return (
    <article className="page-shell py-6 lg:py-10">
      {/* Hero */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-hero border border-line bg-surface-secondary sm:aspect-[21/9]">
        <Image
          src={event.heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{EVENT_TYPE_LABEL[event.type]}</Badge>
            {event.status === "CANCELLED" ? <Badge tone="error">Cancelled</Badge> : null}
            {detail.soldOut ? <Badge tone="solid">Sold out</Badge> : null}
          </div>
          <h1 className="mt-3 max-w-3xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {event.title}
          </h1>
          {event.subtitle ? (
            <p className="mt-1.5 text-sm text-white/85 sm:text-base">{event.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        {/* Main column */}
        <div className="min-w-0">
          <dl className="grid gap-4 border-b border-line pb-6 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">When</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {formatEventWindow(event.startsAt, event.endsAt)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Where</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  <Link href={`/venues/${venue.id}`} className="hover:text-primary">
                    {venue.name}
                  </Link>
                  <span className="block text-xs font-normal text-muted">
                    {venue.area}, {venue.city}
                  </span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {ticketTypes.length > 0 ? "From" : "Capacity"}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {ticketTypes.length > 0
                    ? formatPrice(detail.fromPrice)
                    : remainingCapacity !== null
                      ? `${remainingCapacity} places left`
                      : "Open"}
                </dd>
              </div>
            </div>
          </dl>

          {event.recurrence ? (
            <Card className="mt-6 border-primary/20 bg-primary-tint/50">
              <CardContent className="flex items-start gap-3 p-5">
                <BookitIcon name="meeting" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-ink">Recurring series</p>
                  <p className="mt-0.5 text-sm text-ink-secondary">
                    {event.recurrence.humanLabel}
                  </p>
                  {upcomingOccurrences.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {upcomingOccurrences.map((occurrence) => (
                        <li
                          key={occurrence.id}
                          className="rounded-pill border border-line bg-surface px-3 py-1 text-xs text-ink-secondary"
                        >
                          {formatDate(occurrence.startsAt)} · {formatTime(occurrence.startsAt)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
              {event.description}
            </p>
            {event.tags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/events?q=${encodeURIComponent(tag)}`}>
                      <Badge>{tag}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {event.agenda.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Agenda</h2>
              <ol className="mt-4 flex flex-col">
                {event.agenda.map((item, index) => (
                  <li key={`${item.startsAt}-${index}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                      {index < event.agenda.length - 1 ? (
                        <span className="w-px flex-1 bg-line" aria-hidden="true" />
                      ) : null}
                    </div>
                    <div className="pb-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        {formatTime(item.startsAt)}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Venue map */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Getting there</h2>
            <Card className="mt-4 overflow-hidden">
              {venue.latitude !== null && venue.longitude !== null ? (
                <MapEmbed
                  className="h-56 sm:h-64"
                  bbox={boxAround({ latitude: venue.latitude, longitude: venue.longitude })}
                  marker={{ latitude: venue.latitude, longitude: venue.longitude }}
                  title={`Map showing ${venue.name}`}
                />
              ) : null}
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    <Link href={`/venues/${venue.id}`} className="hover:text-primary">
                      {venue.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-secondary">{venue.addressLine}</p>
                  <p className="mt-1 text-sm text-muted">
                    Capacity {venue.capacity.toLocaleString("en-KE")}
                    {venue.sections.length > 0
                      ? ` · ${venue.sections.map((section) => section.name).join(", ")}`
                      : ""}
                  </p>
                </div>
                {venue.latitude !== null && venue.longitude !== null ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get directions
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </section>

          {/* Venue gallery — only for venues with published media. */}
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

          {/* Policies */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Policies & entry</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Info className="size-4 text-primary" aria-hidden="true" />
                    Refunds
                  </h3>
                  <p className="mt-2 text-sm text-ink-secondary">{event.policies.refundPolicy}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    Transfer & resale
                  </h3>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-secondary">
                    <li>
                      Transfers {event.policies.transferAllowed ? "allowed" : "not allowed"}
                    </li>
                    <li>
                      Resale{" "}
                      {event.policies.resaleEnabled
                        ? event.policies.resaleMaxMarkupBps === 0
                          ? "allowed at face value only"
                          : `allowed up to ${event.policies.resaleMaxMarkupBps / 100}% above face value`
                        : "not allowed"}
                    </li>
                    <li>Maximum {event.policies.maxTicketsPerAccount} tickets per account</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {event.policies.entryRules.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {event.policies.entryRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
            ) : null}
            {event.policies.ageRestriction ? (
              <p className="mt-3 text-sm font-medium text-warning">
                {event.policies.ageRestriction}
              </p>
            ) : null}
          </section>

          {/* Organizer */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Organizer</h2>
            <Card className="mt-4">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-base font-semibold text-primary">
                  {initials(organizer.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{organizer.name}</p>
                    {organizer.verification === "VERIFIED" ? (
                      <Badge tone="success">
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        Verified
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-secondary">{organizer.about}</p>
                  <p className="mt-2 text-xs text-muted">
                    {organizer.supportEmail} · {organizer.supportPhone}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {detail.resaleListings.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Verified resale</h2>
              <p className="mt-2 text-sm text-ink-secondary">
                These tickets were bought on Bookit and are being resold by their verified owners.
                Ownership transfers to you the moment you pay, and the seller&apos;s QR stops
                working.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {detail.resaleListings.map((listing) => (
                  <li
                    key={listing.id}
                    className="flex items-center justify-between gap-4 rounded-card-sm border border-line bg-surface p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatPrice(listing.askPrice)}
                      </p>
                      <p className="text-xs text-muted">
                        Face value {formatPrice(listing.facePrice)}
                      </p>
                    </div>
                    <Badge tone="success">
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      Verified owner
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <BookingPanel
            event={{
              id: event.id,
              type: event.type,
              title: event.title,
              capacity: event.capacity,
              policies: event.policies,
              slug: event.slug,
            }}
            ticketTypes={ticketTypes}
            availability={availability}
            remainingCapacity={remainingCapacity}
            tablesAvailable={detail.tablesAvailable}
            soldOut={detail.soldOut}
            serviceFeeBps={config.checkout.serviceFeeBps}
          />

          {event.type === EventType.PRIVATE_INVITATION ||
          event.type === EventType.RECURRING_MEETING ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Hosting something similar?{" "}
              <Link href="/organizer/events/new" className="text-primary hover:underline">
                Create your own private event
              </Link>{" "}
              and manage the guest list on Bookit.
            </p>
          ) : null}

          <p className="mt-4 text-xs text-muted">
            Listed {formatDateTime(event.createdAt)}
          </p>
        </aside>
      </div>
    </article>
  );
}
