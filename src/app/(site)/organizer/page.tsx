import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ScanLine, Ticket, TrendingUp, Users, Wallet } from "lucide-react";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { MetricCard } from "@/components/organizer/metric-card";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime, formatPrice } from "@/lib/format";
import { formatMoney } from "@/domain/money";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default async function OrganizerDashboardPage() {
  const { catalog, payouts, risk } = getContainer();

  const [metrics, events, balance, recentRisk] = await Promise.all([
    catalog.organizerDashboard(DEMO_ORGANIZER_ID),
    catalog.organizerEvents(DEMO_ORGANIZER_ID),
    payouts.balanceFor(DEMO_ORGANIZER_ID),
    risk.listRecent(5),
  ]);

  const now = new Date().toISOString();
  const upcoming = events
    .filter((summary) => summary.event.startsAt >= now)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Everything happening across your events right now.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/new">Create event</Link>
        </Button>
      </header>

      <section aria-label="Key metrics">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <li>
            <MetricCard
              label="Gross Revenue"
              value={formatMoney(metrics.grossRevenue)}
              hint="Paid and fulfilled orders"
              icon={<TrendingUp className="size-4" />}
              tone="brand"
            />
          </li>
          <li>
            <MetricCard
              label="Tickets Sold"
              value={metrics.ticketsSold.toLocaleString("en-KE")}
              icon={<Ticket className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="Bookings"
              value={metrics.bookings.toLocaleString("en-KE")}
              icon={<CalendarDays className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="RSVPs"
              value={metrics.rsvps.toLocaleString("en-KE")}
              icon={<BookitIcon name="rsvp" className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="Guests Confirmed"
              value={metrics.guestsConfirmed.toLocaleString("en-KE")}
              icon={<Users className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="Upcoming Events"
              value={metrics.upcomingEvents.toLocaleString("en-KE")}
              icon={<CalendarDays className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="Check-ins"
              value={metrics.checkIns.toLocaleString("en-KE")}
              icon={<ScanLine className="size-4" />}
            />
          </li>
          <li>
            <MetricCard
              label="Pending Payout"
              value={formatMoney(metrics.pendingPayout)}
              hint={`${formatMoney(balance.available)} available now`}
              icon={<Wallet className="size-4" />}
            />
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Upcoming events</h2>
            <Link
              href="/organizer/events"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming events"
              description="Create your first event to start selling tickets or taking bookings."
              action={{ label: "Create event", href: "/organizer/events/new" }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((summary) => (
                <li key={summary.event.id}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <Link
                          href={`/organizer/events/${summary.event.id}`}
                          className="text-sm font-semibold text-ink hover:text-primary"
                        >
                          {summary.event.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDateTime(summary.event.startsAt)} · {summary.venue.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={summary.soldOut ? "solid" : "neutral"}>
                          {summary.soldOut
                            ? "Sold out"
                            : summary.remainingCapacity !== null
                              ? `${summary.remainingCapacity} places left`
                              : summary.fromPrice
                                ? formatPrice(summary.fromPrice, { from: true })
                                : "On sale"}
                        </Badge>
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/organizer/events/${summary.event.id}/guests`}>
                            Guest list
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">Settlement</h2>
            <Card>
              <CardContent className="p-5">
                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Ticket revenue owed to you</dt>
                    <dd className="font-medium text-ink">{formatMoney(balance.payable)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Held in reserve</dt>
                    <dd className="font-medium text-ink">{formatMoney(balance.reserved)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-3">
                    <dt className="font-medium text-ink">Available now</dt>
                    <dd className="font-semibold text-primary">
                      {formatMoney(balance.available)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-muted">{balance.releasePolicy}</p>
                <Button size="sm" className="mt-4" block asChild>
                  <Link href="/organizer/payouts">Request payout</Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">Risk & review</h2>
            <Card>
              <CardContent className="p-5">
                {recentRisk.length === 0 ? (
                  <p className="text-sm text-muted">
                    Nothing needs your attention. Risk decisions from checkout, resale and payouts
                    appear here with their reason codes.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {recentRisk.map((event) => (
                      <li key={event.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {event.subjectType.toLowerCase()} · score {event.score}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {event.reasonCodes.join(", ") || "No triggers"}
                          </p>
                        </div>
                        <Badge
                          tone={
                            event.outcome === "BLOCK"
                              ? "error"
                              : event.outcome === "ALLOW"
                                ? "success"
                                : "warning"
                          }
                        >
                          {event.outcome}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
