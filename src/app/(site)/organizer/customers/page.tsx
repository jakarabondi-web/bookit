import type { Metadata } from "next";
import { formatMoney, money, type Money } from "@/domain/money";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Customers" };

interface CustomerRow {
  key: string;
  name: string;
  contact: string;
  orders: number;
  bookings: number;
  spend: Money;
  lastSeen: string;
}

export default async function CustomersPage() {
  const { catalog, uow } = getContainer();
  const events = await catalog.organizerEvents(DEMO_ORGANIZER_ID);

  // Customers are derived rather than stored: the same person may appear as a
  // ticket buyer on one event and a named guest on another, and the organizer
  // needs them as one row.
  const byKey = new Map<string, CustomerRow>();

  const upsert = (
    key: string,
    patch: Partial<CustomerRow> & Pick<CustomerRow, "name" | "contact" | "lastSeen">,
  ) => {
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        orders: 0,
        bookings: 0,
        spend: money(0, "KES"),
        ...patch,
      });
      return;
    }
    byKey.set(key, {
      ...existing,
      orders: existing.orders + (patch.orders ?? 0),
      bookings: existing.bookings + (patch.bookings ?? 0),
      spend: money(existing.spend.amount + (patch.spend?.amount ?? 0), "KES"),
      lastSeen:
        patch.lastSeen > existing.lastSeen ? patch.lastSeen : existing.lastSeen,
    });
  };

  for (const summary of events) {
    for (const order of await uow.repos.orders.listByEvent(summary.event.id)) {
      const key = order.buyerEmail.toLowerCase();
      const paid = order.status === "PAID" || order.status === "FULFILLED";
      const user = order.userId ? await uow.repos.users.findById(order.userId) : null;
      upsert(key, {
        name: user?.fullName ?? order.buyerEmail,
        contact: order.buyerEmail,
        orders: 1,
        spend: paid ? order.total : money(0, "KES"),
        lastSeen: order.createdAt,
      });
    }

    for (const booking of await uow.repos.bookings.listByEvent(summary.event.id)) {
      const key = (booking.email ?? booking.phone ?? booking.id).toLowerCase();
      upsert(key, {
        name: booking.primaryGuestName,
        contact: booking.email ?? booking.phone ?? "—",
        bookings: 1,
        lastSeen: booking.createdAt,
      });
    }
  }

  const rows = [...byKey.values()].sort(
    (a, b) => b.spend.amount - a.spend.amount || b.lastSeen.localeCompare(a.lastSeen),
  );

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.name}</p>
            <p className="truncate text-xs text-muted">{row.contact}</p>
          </div>
        </div>
      ),
    },
    { key: "orders", header: "Orders", render: (row) => row.orders },
    { key: "bookings", header: "Bookings", render: (row) => row.bookings },
    {
      key: "spend",
      header: "Lifetime spend",
      render: (row) => (
        <span className="tabular font-medium text-ink">{formatMoney(row.spend)}</span>
      ),
    },
    {
      key: "segment",
      header: "Segment",
      render: (row) =>
        row.spend.amount >= 1_000_000 ? (
          <Badge tone="brand">High value</Badge>
        ) : row.orders + row.bookings > 1 ? (
          <Badge tone="success">Returning</Badge>
        ) : (
          <Badge>First time</Badge>
        ),
    },
    { key: "last", header: "Last activity", render: (row) => formatDate(row.lastSeen) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Everyone who has bought a ticket or booked a place with you, merged across events.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        caption="Customers"
        mobileTitle={(row) => row.name}
        emptyState={
          <EmptyState
            title="No customers yet"
            description="Your customer list builds itself from ticket sales and bookings."
          />
        }
      />
    </div>
  );
}
