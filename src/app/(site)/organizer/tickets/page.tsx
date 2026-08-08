import type { Metadata } from "next";
import { formatMoney } from "@/domain/money";
import type { Event, Ticket } from "@/domain/types";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Tickets" };

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
  ACTIVE: "success",
  LISTED: "info",
  CHECKED_IN: "success",
  CONSUMED: "neutral",
  TRANSFERRED: "neutral",
  SOLD: "neutral",
  REFUNDED: "error",
  VOIDED: "error",
  CANCELLED: "error",
  SUSPENDED: "warning",
};

type Row = { ticket: Ticket; event: Event };

export default async function OrganizerTicketsPage() {
  const { catalog, uow } = getContainer();
  const events = await catalog.organizerEvents(DEMO_ORGANIZER_ID);

  const rows: Row[] = [];
  for (const summary of events) {
    for (const ticket of await uow.repos.tickets.listByEvent(summary.event.id)) {
      rows.push({ ticket, event: summary.event });
    }
  }
  rows.sort((a, b) => b.ticket.issuedAt.localeCompare(a.ticket.issuedAt));

  const columns: Column<Row>[] = [
    {
      key: "code",
      header: "Ticket",
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink">{row.ticket.code}</p>
          <p className="text-xs text-muted">{row.ticket.ownerName}</p>
        </div>
      ),
    },
    { key: "event", header: "Event", render: (row) => row.event.title },
    {
      key: "seat",
      header: "Seat",
      render: (row) => row.ticket.seatLabel ?? "General",
    },
    {
      key: "face",
      header: "Face value",
      render: (row) => <span className="tabular">{formatMoney(row.ticket.facePrice)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONE[row.ticket.status] ?? "neutral"}>
          {row.ticket.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "version",
      header: "Credential",
      render: (row) => (
        <span className="text-xs text-muted">v{row.ticket.credentialVersion}</span>
      ),
    },
    { key: "issued", header: "Issued", render: (row) => formatDateTime(row.ticket.issuedAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Tickets</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every ticket issued across your events. The credential version increments whenever a
          ticket changes hands or is voided, which is what invalidates the previous QR code.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.ticket.id}
        caption="Issued tickets"
        mobileTitle={(row) => row.ticket.code}
        emptyState={
          <EmptyState
            title="No tickets issued yet"
            description="Tickets are issued only after a payment is verified by the provider — never from the browser."
          />
        }
      />
    </div>
  );
}
