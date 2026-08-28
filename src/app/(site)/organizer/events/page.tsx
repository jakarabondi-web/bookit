import type { Metadata } from "next";
import Link from "next/link";
import { EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import type { EventSummary } from "@/domain/types";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };

const STATUS_TONE: Record<string, "success" | "info" | "neutral" | "error" | "warning"> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  ON_SALE: "success",
  SOLD_OUT: "warning",
  LIVE: "success",
  COMPLETED: "neutral",
  CANCELLED: "error",
};

export default async function OrganizerEventsPage() {
  const { catalog } = getContainer();
  const organizerId = await currentOrganizerId();
  const events = await catalog.organizerEvents(organizerId);

  const columns: Column<EventSummary>[] = [
    {
      key: "title",
      header: "Event",
      hideOnMobile: true,
      render: (summary) => (
        <Link
          href={`/organizer/events/${summary.event.id}`}
          className="font-medium text-ink hover:text-primary"
        >
          {summary.event.title}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (summary) => <Badge>{EVENT_TYPE_LABEL[summary.event.type]}</Badge>,
    },
    {
      key: "when",
      header: "Starts",
      render: (summary) => formatDateTime(summary.event.startsAt),
    },
    {
      key: "venue",
      header: "Venue",
      render: (summary) => `${summary.venue.name}, ${summary.venue.city}`,
    },
    {
      key: "availability",
      header: "Availability",
      render: (summary) =>
        summary.soldOut ? (
          <Badge tone="solid">Sold out</Badge>
        ) : summary.remainingCapacity !== null ? (
          `${summary.remainingCapacity} places`
        ) : summary.fromPrice ? (
          formatPrice(summary.fromPrice, { from: true })
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (summary) => (
        <Badge tone={STATUS_TONE[summary.event.status] ?? "neutral"}>
          {summary.event.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (summary) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/organizer/events/${summary.event.id}/guests`}>Guests</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/organizer/events/${summary.event.id}`}>Manage</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Events</h1>
          <p className="mt-1 text-sm text-muted">
            {events.length} {events.length === 1 ? "event" : "events"} across all types.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/new">Create event</Link>
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={events}
        rowKey={(summary) => summary.event.id}
        caption="Your events"
        mobileTitle={(summary) => (
          <Link href={`/organizer/events/${summary.event.id}`}>{summary.event.title}</Link>
        )}
        emptyState={
          <EmptyState
            title="No events yet"
            description="Create your first event — paid tickets, a free RSVP, a private invitation, a reservation, a banquet or a recurring meeting."
            action={{ label: "Create event", href: "/organizer/events/new" }}
          />
        }
      />
    </div>
  );
}
