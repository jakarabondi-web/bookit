import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { formatMoney } from "@/domain/money";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import {
  SEGMENT_LABEL,
  type CustomerProfile,
  type Segment,
} from "@/server/services/crm-service";
import { SegmentBadge } from "@/components/organizer/segment-badge";
import { MetricCard } from "@/components/organizer/metric-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Customers" };

/**
 * The CRM list view. Profiles aggregate from the order stream (one row per
 * person, however many events they've bought into) and every row carries its
 * RFM segment, so the list doubles as a targeting tool: filter to a segment,
 * export it, run the play.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const segmentFilter =
    typeof params.segment === "string" ? (params.segment as Segment) : undefined;
  const query = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const { crm } = getContainer();
  const organizerId = await currentOrganizerId();
  const [profiles, summary] = await Promise.all([
    crm.customers(organizerId),
    crm.summary(organizerId),
  ]);

  const rows = profiles.filter((profile) => {
    if (segmentFilter && profile.segment !== segmentFilter) return false;
    if (query && !profile.name.toLowerCase().includes(query) && !profile.email.includes(query))
      return false;
    return true;
  });

  const atRisk = summary.segments
    .filter((entry) => entry.segment === "AT_RISK" || entry.segment === "LAPSED")
    .reduce((sum, entry) => sum + entry.count, 0);

  const exportHref = `/organizer/customers/export${segmentFilter ? `?segment=${segmentFilter}` : ""}`;

  const columns: Column<CustomerProfile>[] = [
    {
      key: "name",
      header: "Customer",
      render: (row) => (
        <Link href={`/organizer/customers/${row.id}`} className="group flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-bold text-primary">
            {initials(row.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary">
              {row.name}
            </span>
            <span className="block truncate text-xs text-muted">{row.email}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "segment",
      header: "Segment",
      render: (row) => <SegmentBadge segment={row.segment} />,
    },
    {
      key: "orders",
      header: "Orders",
      align: "right",
      render: (row) => <span className="tabular">{row.orders}</span>,
    },
    {
      key: "tickets",
      header: "Tickets",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular">{row.tickets}</span>,
    },
    {
      key: "events",
      header: "Events",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular">{row.eventsBought}</span>,
    },
    {
      key: "spend",
      header: "Lifetime spend",
      align: "right",
      render: (row) => (
        <span className="tabular font-semibold text-ink">{formatMoney(row.spend)}</span>
      ),
    },
    {
      key: "last",
      header: "Last purchase",
      hideOnMobile: true,
      render: (row) => formatDate(row.lastOrderAt),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Customers</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            One row per person across all your events, segmented by recency, frequency and spend.
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a href={exportHref} download>
            <Download className="size-4" /> Export CSV
          </a>
        </Button>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li>
          <MetricCard
            label="Customers"
            value={summary.customers.toLocaleString("en-KE")}
            hint={`${summary.newLast30} new in the last 30 days`}
            tone="brand"
          />
        </li>
        <li>
          <MetricCard
            label="Repeat rate"
            value={`${Math.round(summary.repeatRate * 100)}%`}
            hint="Bought more than once"
          />
        </li>
        <li>
          <MetricCard label="Avg lifetime spend" value={formatMoney(summary.avgLifetimeSpend)} />
        </li>
        <li>
          <MetricCard
            label="Needs a win-back"
            value={atRisk.toLocaleString("en-KE")}
            hint="At risk or lapsed"
          />
        </li>
      </ul>

      {/* Segment rail — counts double as the distribution readout. */}
      <nav aria-label="Filter by segment">
        <ul className="scroll-rail sm:flex sm:flex-wrap sm:gap-2 sm:overflow-visible">
          <li>
            <FilterPill href="/organizer/customers" active={!segmentFilter}>
              All · {summary.customers}
            </FilterPill>
          </li>
          {summary.segments.map((entry) => (
            <li key={entry.segment}>
              <FilterPill
                href={`/organizer/customers?segment=${entry.segment}`}
                active={segmentFilter === entry.segment}
              >
                {SEGMENT_LABEL[entry.segment]} · {entry.count}
              </FilterPill>
            </li>
          ))}
        </ul>
      </nav>

      {/* Plain GET form — search works before hydration and is linkable. */}
      <form method="get" role="search" className="max-w-sm">
        {segmentFilter ? <input type="hidden" name="segment" value={segmentFilter} /> : null}
        <label htmlFor="crm-q" className="sr-only">
          Search customers by name or email
        </label>
        <input
          id="crm-q"
          name="q"
          defaultValue={query}
          placeholder="Search name or email…"
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption="Customers"
        mobileTitle={(row) => row.name}
        emptyState={
          <EmptyState
            title={query || segmentFilter ? "No customers match" : "No customers yet"}
            description={
              query || segmentFilter
                ? "Try a different search or clear the segment filter."
                : "Your customer list builds itself from ticket sales and bookings."
            }
            action={
              query || segmentFilter
                ? { label: "Clear filters", href: "/organizer/customers" }
                : undefined
            }
          />
        }
      />
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex whitespace-nowrap rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}
