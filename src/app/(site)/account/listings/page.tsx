import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DEMO_USER_ID, getContainer } from "@/server/container";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatPrice } from "@/lib/format";
import type { Event, ResaleListing, Ticket } from "@/domain/types";

export const metadata: Metadata = { title: "My Listings" };

type Row = { listing: ResaleListing; event: Event; ticket: Ticket | null };

const STATUS_TONE: Record<string, "success" | "info" | "neutral" | "error" | "warning"> = {
  ACTIVE: "success",
  RESERVED: "info",
  SOLD: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  BLOCKED: "warning",
  DRAFT: "neutral",
};

export default async function ListingsPage() {
  const { catalog } = getContainer();
  const rows = await catalog.listingsForUser(DEMO_USER_ID);

  const columns: Column<Row>[] = [
    {
      key: "event",
      header: "Event",
      hideOnMobile: true,
      render: (row) => (
        <Link href={`/events/${row.event.slug}`} className="font-medium text-ink hover:text-primary">
          {row.event.title}
        </Link>
      ),
    },
    {
      key: "ticket",
      header: "Ticket",
      render: (row) => <span className="text-xs">{row.ticket?.code ?? "—"}</span>,
    },
    {
      key: "face",
      header: "Face value",
      render: (row) => formatPrice(row.listing.facePrice),
    },
    {
      key: "ask",
      header: "Your price",
      render: (row) => (
        <span className="font-medium text-ink">{formatPrice(row.listing.askPrice)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONE[row.listing.status] ?? "neutral"}>
          {row.listing.status.charAt(0) + row.listing.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "listed",
      header: "Listed",
      render: (row) => formatDate(row.listing.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.listing.status === "ACTIVE" ? (
          <Button size="sm" variant="ghost" className="text-error hover:bg-error-tint">
            Cancel listing
          </Button>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-card border border-success/20 bg-success-tint p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-ink">Verified resale</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Only tickets Bookit issued can be listed, and we check you still own them. When a
            listing sells, ownership transfers to the buyer and your QR stops working immediately —
            so a ticket can never be sold twice. Proceeds are released after the organizer&apos;s
            payout delay.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.listing.id}
        caption="Your resale listings"
        mobileTitle={(row) => row.event.title}
        emptyState={
          <EmptyState
            icon={<BookitIcon name="ticket" className="size-5" />}
            title="No listings yet"
            description="If you can no longer attend an event, you can list your ticket for resale from My Tickets — as long as the organizer allows it."
            action={{ label: "Go to my tickets", href: "/account/tickets" }}
          />
        }
      />
    </div>
  );
}
