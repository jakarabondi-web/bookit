import type { Metadata } from "next";
import Link from "next/link";
import type { Booking, Event } from "@/domain/types";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
  CONFIRMED: "success",
  CHECKED_IN: "success",
  PENDING: "warning",
  WAITLISTED: "info",
  DECLINED: "neutral",
  CANCELLED: "error",
  NO_SHOW: "neutral",
};

type Row = { booking: Booking; event: Event };

export default async function OrganizerBookingsPage() {
  const { catalog, uow } = getContainer();
  const organizerId = await currentOrganizerId();
  const events = await catalog.organizerEvents(organizerId);

  const rows: Row[] = [];
  for (const summary of events) {
    for (const booking of await uow.repos.bookings.listByEvent(summary.event.id)) {
      rows.push({ booking, event: summary.event });
    }
  }
  rows.sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));

  const columns: Column<Row>[] = [
    {
      key: "guest",
      header: "Guest",
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.booking.primaryGuestName}</p>
          <p className="font-mono text-xs text-muted">{row.booking.reference}</p>
        </div>
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (row) => (
        <Link
          href={`/organizer/events/${row.event.id}/guests`}
          className="text-ink hover:text-primary"
        >
          {row.event.title}
        </Link>
      ),
    },
    { key: "guests", header: "Guests", render: (row) => row.booking.guestCount },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONE[row.booking.status] ?? "neutral"}>
          {row.booking.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    { key: "created", header: "Created", render: (row) => formatDateTime(row.booking.createdAt) },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/organizer/events/${row.event.id}/guests`}>Manage</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Bookings</h1>
        <p className="mt-1 text-sm text-muted">
          RSVPs, reservations, invitation acceptances and banquet seats across every event.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.booking.id}
        caption="All bookings"
        mobileTitle={(row) => row.booking.primaryGuestName}
        emptyState={
          <EmptyState
            title="No bookings yet"
            description="Create a free RSVP, reservation, banquet or private event and bookings will collect here."
            action={{ label: "Create event", href: "/organizer/events/new" }}
          />
        }
      />
    </div>
  );
}
