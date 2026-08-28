import type { Metadata } from "next";
import { formatMoney } from "@/domain/money";
import type { Event, Order } from "@/domain/types";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
  CREATED: "neutral",
  AWAITING_PAYMENT: "warning",
  PAID: "success",
  FULFILLED: "success",
  EXPIRED: "neutral",
  CANCELLED: "error",
  REFUNDED: "error",
  PARTIALLY_REFUNDED: "warning",
};

type Row = { order: Order; event: Event };

export default async function OrdersPage() {
  const { catalog, uow } = getContainer();
  const organizerId = await currentOrganizerId();
  const events = await catalog.organizerEvents(organizerId);

  const rows: Row[] = [];
  for (const summary of events) {
    for (const order of await uow.repos.orders.listByEvent(summary.event.id)) {
      rows.push({ order, event: summary.event });
    }
  }
  rows.sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt));

  const columns: Column<Row>[] = [
    {
      key: "reference",
      header: "Order",
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink">{row.order.reference}</p>
          <p className="text-xs text-muted">{row.order.buyerEmail}</p>
        </div>
      ),
    },
    { key: "event", header: "Event", render: (row) => row.event.title },
    {
      key: "items",
      header: "Tickets",
      render: (row) => row.order.items.reduce((total, item) => total + item.quantity, 0),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => (
        <span className="tabular font-medium text-ink">{formatMoney(row.order.total)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONE[row.order.status] ?? "neutral"}>
          {row.order.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      render: (row) => formatDateTime(row.order.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Orders</h1>
        <p className="mt-1 text-sm text-muted">
          Every checkout across your events, including the ones that expired before payment
          completed.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.order.id}
        caption="Orders"
        mobileTitle={(row) => row.order.reference}
        emptyState={
          <EmptyState
            title="No orders yet"
            description="Orders appear the moment someone starts a checkout, so you can see abandoned carts as well as completed sales."
          />
        }
      />
    </div>
  );
}
