import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { behaviourFor, EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { MetricCard } from "@/components/organizer/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDateTime, formatMoneyOrDash } from "@/lib/organizer-format";
import { formatEventWindow, formatPrice } from "@/lib/format";
import type { TicketType } from "@/domain/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getContainer().uow.repos.events.findById(id);
  return { title: event?.title ?? "Event" };
}

export default async function OrganizerEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = getContainer();
  const event = await container.uow.repos.events.findById(id);
  if (!event) notFound();

  const [summary, guestList, checkins] = await Promise.all([
    container.catalog.summarise(event),
    container.catalog.guestList(event.id),
    container.uow.repos.checkins.listByEvent(event.id),
  ]);

  const behaviour = behaviourFor(event.type);
  const tickets = await container.uow.repos.tickets.listByEvent(event.id);
  const orders = await container.uow.repos.orders.listByEvent(event.id);

  const gross = orders
    .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
    .reduce((total, order) => total + order.total.amount, 0);

  const availability: Array<{ ticketType: TicketType; available: number }> = [];
  for (const ticketType of summary.ticketTypes) {
    availability.push({
      ticketType,
      available: await container.uow.repos.inventory.countAvailable(ticketType.id),
    });
  }

  const ticketColumns: Column<(typeof availability)[number]>[] = [
    {
      key: "name",
      header: "Ticket type",
      hideOnMobile: true,
      render: (row) => <span className="font-medium text-ink">{row.ticketType.name}</span>,
    },
    { key: "price", header: "Price", render: (row) => formatPrice(row.ticketType.price) },
    {
      key: "quantity",
      header: "Allocation",
      render: (row) => row.ticketType.quantity.toLocaleString("en-KE"),
    },
    {
      key: "available",
      header: "Available",
      render: (row) =>
        row.available === 0 ? (
          <Badge tone="solid">Sold out</Badge>
        ) : (
          row.available.toLocaleString("en-KE")
        ),
    },
    {
      key: "limit",
      header: "Max per order",
      render: (row) => row.ticketType.maxPerOrder,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Events
        </Link>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{event.title}</h1>
              <Badge tone="brand">{EVENT_TYPE_LABEL[event.type]}</Badge>
              <Badge>{event.status.replace("_", " ").toLowerCase()}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatEventWindow(event.startsAt, event.endsAt)} · {summary.venue.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/events/${event.slug}`}>
                View public page
                <ExternalLink className="size-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/organizer/events/${event.id}/guests`}>Guest list</Link>
            </Button>
          </div>
        </div>
      </header>

      <section aria-label="Event metrics">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <li>
            <MetricCard
              label="Gross revenue"
              value={formatMoneyOrDash(gross, event.type)}
              tone="brand"
            />
          </li>
          <li>
            <MetricCard label="Tickets issued" value={tickets.length.toLocaleString("en-KE")} />
          </li>
          <li>
            <MetricCard
              label="Guests confirmed"
              value={guestList.confirmed.toLocaleString("en-KE")}
              hint={`${guestList.pending} pending · ${guestList.waitlist} waitlisted`}
            />
          </li>
          <li>
            <MetricCard
              label="Checked in"
              value={checkins
                .filter((checkIn) => checkIn.result === "ADMITTED")
                .length.toLocaleString("en-KE")}
            />
          </li>
        </ul>
      </section>

      {behaviour.issuesTickets && availability.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Ticket types & inventory</h2>
          <DataTable
            columns={ticketColumns}
            rows={availability}
            rowKey={(row) => row.ticketType.id}
            caption="Ticket types"
            mobileTitle={(row) => row.ticketType.name}
          />
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-ink">Workflow</h2>
            <p className="mt-1 text-sm text-muted">
              How Bookit runs this event, based on its type.
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-secondary">
              {[
                ["Issues tickets", behaviour.issuesTickets],
                ["Creates bookings", behaviour.createsBooking],
                ["Takes payment", behaviour.requiresPayment],
                ["Requires an invitation", behaviour.requiresInvite],
                ["Guest-list driven", behaviour.guestListDriven],
                ["Table seating", behaviour.supportsTables],
                ["Recurring occurrences", behaviour.recurring],
                ["Tracks contributions", behaviour.supportsContributions],
              ].map(([label, enabled]) => (
                <li key={String(label)} className="flex items-center justify-between gap-3">
                  {label}
                  <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Yes" : "No"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-ink">Policies</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted">Refunds</dt>
                <dd className="mt-0.5 text-ink-secondary">{event.policies.refundPolicy}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Transfers</dt>
                <dd className="text-ink">
                  {event.policies.transferAllowed ? "Allowed" : "Not allowed"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Resale</dt>
                <dd className="text-ink">
                  {event.policies.resaleEnabled
                    ? `Up to ${event.policies.resaleMaxMarkupBps / 100}% markup`
                    : "Not allowed"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Max per account</dt>
                <dd className="text-ink">{event.policies.maxTicketsPerAccount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Seller payout delay</dt>
                <dd className="text-ink">{event.policies.sellerPayoutDelayHours}h</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Recent check-ins</h2>
        {checkins.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-surface-secondary/50 px-5 py-8 text-center text-sm text-muted">
            No scans yet. Check-in opens on the day of the event.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {checkins.slice(0, 8).map((checkIn) => (
              <li
                key={checkIn.id}
                className="flex items-center justify-between gap-3 rounded-card-sm border border-line bg-surface px-4 py-3 text-sm"
              >
                <span className="text-ink-secondary">{formatDateTime(checkIn.at)}</span>
                <Badge tone={checkIn.result === "ADMITTED" ? "success" : "warning"}>
                  {checkIn.result.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
