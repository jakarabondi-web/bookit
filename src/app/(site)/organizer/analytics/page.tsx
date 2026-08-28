import type { Metadata } from "next";
import { formatMoney, money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { BreakdownBars, DailyBars, ShareBar } from "@/components/organizer/charts";
import { MetricCard } from "@/components/organizer/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Analytics" };

const CATEGORY_LABEL: Record<string, string> = {
  CONCERTS: "Concerts",
  SPORTS: "Sports",
  COMEDY: "Comedy",
  CONFERENCES: "Conferences",
  PARTIES: "Parties",
  WEDDINGS: "Weddings",
  MEETINGS: "Meetings",
  COMMUNITY: "Community",
};

/**
 * Thirty days of the business, charted from orders. Every figure on this page
 * derives from the same order stream the ledger posts from, so analytics,
 * finance and payouts can never tell different stories.
 */
export default async function AnalyticsPage() {
  const { catalog } = getContainer();
  const organizerId = await currentOrganizerId();
  const [analytics, dashboard] = await Promise.all([
    catalog.organizerAnalytics(organizerId),
    catalog.organizerDashboard(organizerId),
  ]);

  const revenueDelta = delta(analytics.revenue30d.amount, analytics.revenuePrev30d.amount);
  const ticketsDelta = delta(analytics.tickets30d, analytics.ticketsPrev30d);
  const averageOrder =
    analytics.orders30d - analytics.refunded30d > 0
      ? Math.round(analytics.revenue30d.amount / (analytics.orders30d - analytics.refunded30d))
      : 0;
  const refundRate =
    analytics.orders30d > 0 ? (analytics.refunded30d / analytics.orders30d) * 100 : 0;

  const hasSales = analytics.revenue30d.amount > 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          The last 30 days across every event — compared with the 30 days before.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li>
          <MetricCard
            label="Revenue · 30 days"
            value={formatMoney(analytics.revenue30d)}
            hint={revenueDelta}
            tone="brand"
          />
        </li>
        <li>
          <MetricCard
            label="Tickets · 30 days"
            value={analytics.tickets30d.toLocaleString("en-KE")}
            hint={ticketsDelta}
          />
        </li>
        <li>
          <MetricCard
            label="Average order"
            value={formatMoney(money(averageOrder, "KES"))}
            hint={`${(analytics.orders30d - analytics.refunded30d).toLocaleString("en-KE")} orders`}
          />
        </li>
        <li>
          <MetricCard
            label="Refund rate"
            value={`${refundRate.toFixed(1)}%`}
            hint={`${analytics.refunded30d} of ${analytics.orders30d} orders`}
          />
        </li>
      </ul>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Daily revenue</h2>
        <Card>
          <CardContent className="p-5">
            {hasSales ? (
              <DailyBars
                ariaLabel="Daily gross revenue for the last 30 days"
                data={analytics.series.map((point) => ({
                  date: point.date,
                  // Money is stored in minor units; the axis prints major.
                  value: point.revenue / 100,
                  label: `${formatMoney(money(point.revenue, "KES"))} · ${point.tickets} tickets`,
                }))}
              />
            ) : (
              <EmptyState
                title="No sales in the last 30 days"
                description="Once tickets sell, every day lands here as a bar you can hover for the exact figure."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Revenue by event</h2>
          <Card className="h-full">
            <CardContent className="p-5">
              {analytics.byEvent.length === 0 ? (
                <EmptyState
                  title="No revenue yet"
                  description="Once tickets sell, this ranks your events by 30-day gross."
                />
              ) : (
                <BreakdownBars
                  rows={analytics.byEvent.slice(0, 8).map((entry) => ({
                    label: entry.title,
                    value: entry.revenue,
                    display: formatMoney(money(entry.revenue, "KES")),
                    hint: `${entry.tickets.toLocaleString("en-KE")} tkts`,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </section>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">Where the money comes from</h2>
            <Card>
              <CardContent className="p-5">
                {analytics.byCategory.length === 0 ? (
                  <p className="text-sm text-muted">No category data yet.</p>
                ) : (
                  <ShareBar
                    segments={analytics.byCategory.slice(0, 5).map((entry) => ({
                      label: CATEGORY_LABEL[entry.category] ?? entry.category,
                      value: entry.revenue,
                      display: formatMoney(money(entry.revenue, "KES")),
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">By city</h2>
            <Card>
              <CardContent className="p-5">
                {analytics.byCity.length === 0 ? (
                  <p className="text-sm text-muted">No city data yet.</p>
                ) : (
                  <BreakdownBars
                    rows={analytics.byCity.slice(0, 5).map((entry) => ({
                      label: entry.city,
                      value: entry.revenue,
                      display: formatMoney(money(entry.revenue, "KES")),
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Operational metrics appear only once they exist — a row of zeros
          teaches nothing. */}
      {dashboard.checkIns > 0 || dashboard.guestsConfirmed > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Operations</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <li>
              <MetricCard
                label="Check-in rate"
                value={`${
                  dashboard.guestsConfirmed === 0
                    ? 0
                    : Math.round((dashboard.checkIns / dashboard.guestsConfirmed) * 100)
                }%`}
                hint={`${dashboard.checkIns} of ${dashboard.guestsConfirmed} confirmed guests`}
              />
            </li>
            <li>
              <MetricCard
                label="Guests confirmed"
                value={dashboard.guestsConfirmed.toLocaleString("en-KE")}
              />
            </li>
            <li>
              <MetricCard
                label="Upcoming events"
                value={dashboard.upcomingEvents.toLocaleString("en-KE")}
              />
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function delta(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "No sales either period";
  if (previous === 0) return "New this period";
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "Level with prior 30 days";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs prior 30 days`;
}
