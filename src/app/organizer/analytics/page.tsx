import type { Metadata } from "next";
import { formatMoney, money } from "@/domain/money";
import { EventType } from "@/domain/enums";
import { EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { MetricCard } from "@/components/organizer/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { catalog, uow } = getContainer();
  const [metrics, events] = await Promise.all([
    catalog.organizerDashboard(DEMO_ORGANIZER_ID),
    catalog.organizerEvents(DEMO_ORGANIZER_ID),
  ]);

  // Revenue by event, so the bar chart has something honest to show.
  const perEvent: Array<{ title: string; revenue: number; type: EventType }> = [];
  for (const summary of events) {
    const orders = await uow.repos.orders.listByEvent(summary.event.id);
    const revenue = orders
      .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
      .reduce((total, order) => total + order.total.amount, 0);
    perEvent.push({ title: summary.event.title, revenue, type: summary.event.type });
  }
  perEvent.sort((a, b) => b.revenue - a.revenue);

  const top = perEvent.filter((entry) => entry.revenue > 0).slice(0, 8);
  const peak = top[0]?.revenue ?? 0;

  const byType = new Map<EventType, number>();
  for (const summary of events) {
    byType.set(summary.event.type, (byType.get(summary.event.type) ?? 0) + 1);
  }
  const typeTotal = events.length || 1;

  const conversion =
    metrics.ticketsSold + metrics.bookings === 0
      ? 0
      : Math.round(
          (metrics.guestsConfirmed / (metrics.ticketsSold + metrics.bookings)) * 100,
        );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          How your events are performing across every ticket type and booking mode.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li>
          <MetricCard
            label="Gross revenue"
            value={formatMoney(metrics.grossRevenue)}
            tone="brand"
          />
        </li>
        <li>
          <MetricCard
            label="Average order"
            value={formatMoney(
              money(
                metrics.ticketsSold === 0
                  ? 0
                  : Math.round(metrics.grossRevenue.amount / metrics.ticketsSold),
                "KES",
              ),
            )}
            hint="Per ticket sold"
          />
        </li>
        <li>
          <MetricCard
            label="Check-in rate"
            value={`${
              metrics.guestsConfirmed === 0
                ? 0
                : Math.round((metrics.checkIns / metrics.guestsConfirmed) * 100)
            }%`}
            hint={`${metrics.checkIns} of ${metrics.guestsConfirmed} confirmed`}
          />
        </li>
        <li>
          <MetricCard label="Confirmation rate" value={`${conversion}%`} />
        </li>
      </ul>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Revenue by event</h2>
        <Card>
          <CardContent className="p-5">
            {top.length === 0 ? (
              <EmptyState
                title="No revenue yet"
                description="Once tickets sell, this chart ranks your events by gross revenue."
              />
            ) : (
              <ul className="flex flex-col gap-3.5">
                {top.map((entry) => (
                  <li key={entry.title}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm text-ink">{entry.title}</p>
                      <p className="tabular shrink-0 text-sm font-semibold text-ink">
                        {formatMoney(money(entry.revenue, "KES"))}
                      </p>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-secondary"
                      role="img"
                      aria-label={`${entry.title}: ${formatMoney(money(entry.revenue, "KES"))}`}
                    >
                      <div
                        className="h-full rounded-pill bg-primary"
                        style={{ width: `${peak === 0 ? 0 : (entry.revenue / peak) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Event mix</h2>
        <Card>
          <CardContent className="p-5">
            <ul className="flex flex-col gap-3.5">
              {[...byType.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <li key={type}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-ink">{EVENT_TYPE_LABEL[type]}</p>
                      <p className="tabular text-sm text-muted">
                        {count} · {Math.round((count / typeTotal) * 100)}%
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-secondary">
                      <div
                        className="h-full rounded-pill bg-primary/60"
                        style={{ width: `${(count / typeTotal) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              A healthy mix matters: ticketed events drive revenue, while RSVP and booking events
              build the audience you sell to next time.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
