import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { behaviourFor } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { GuestListManager } from "@/components/organizer/guest-list-manager";
import { MetricCard } from "@/components/organizer/metric-card";
import { formatEventWindow } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getContainer().uow.repos.events.findById(id);
  return { title: event ? `Guests · ${event.title}` : "Guest list" };
}

export default async function GuestListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const container = getContainer();

  const event = await container.uow.repos.events.findById(id);
  if (!event) notFound();

  const [view, venue] = await Promise.all([
    container.catalog.guestList(id),
    container.uow.repos.venues.findById(event.venueId),
  ]);

  const behaviour = behaviourFor(event.type);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href={`/organizer/events/${event.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {event.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Guest list</h1>
        <p className="mt-1 text-sm text-muted">
          {formatEventWindow(event.startsAt, event.endsAt)}
          {venue ? ` · ${venue.name}` : ""}
        </p>
      </header>

      <section aria-label="Guest list summary">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          <li>
            <MetricCard label="Confirmed" value={String(view.confirmed)} tone="brand" />
          </li>
          <li>
            <MetricCard label="Pending" value={String(view.pending)} />
          </li>
          <li>
            <MetricCard label="Declined" value={String(view.declined)} />
          </li>
          <li>
            <MetricCard label="Waitlist" value={String(view.waitlist)} />
          </li>
          <li>
            <MetricCard label="Checked In" value={String(view.checkedIn)} />
          </li>
          <li>
            <MetricCard
              label="Capacity Remaining"
              value={view.capacityRemaining === null ? "—" : String(view.capacityRemaining)}
              hint={event.capacity ? `of ${event.capacity}` : "No limit set"}
            />
          </li>
        </ul>
      </section>

      <GuestListManager
        bookings={view.bookings}
        tables={view.tables}
        supportsTables={behaviour.supportsTables}
        supportsContributions={behaviour.supportsContributions}
      />
    </div>
  );
}
