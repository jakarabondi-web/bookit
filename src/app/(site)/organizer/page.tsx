import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import type { EventHealth } from "@/server/services/catalog-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime, formatTime } from "@/lib/format";
import { formatMoney } from "@/domain/money";

export const metadata: Metadata = { title: "Organizer overview" };

/**
 * The USIKU overview — a control room, not a mirror.
 *
 * Hierarchy over democracy: one show-night card when a gate matters right
 * now, three KPIs that each carry a week-over-week comparison, event health
 * rows with sold bars and pace, and money as a first-class panel with the
 * payout action where the number is. The old eight-tile grid — four of them
 * zeros — moved its long tail to the pages that own those numbers.
 */
export default async function OrganizerDashboardPage() {
  const { catalog, payouts, risk } = getContainer();

  const [overview, balance, recentRisk] = await Promise.all([
    catalog.organizerOverview(DEMO_ORGANIZER_ID),
    payouts.balanceFor(DEMO_ORGANIZER_ID),
    risk.listRecent(3),
  ]);

  const { tonight } = overview;
  const health = overview.health.slice(0, 5);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Everything happening across your events right now.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/organizer/checkin">
              <ScanLine className="size-4" /> Scan gate
            </Link>
          </Button>
          <Button asChild>
            <Link href="/organizer/events/new">Create event</Link>
          </Button>
        </div>
      </header>

      {/* Show-night takeover: only exists while a gate matters. */}
      {tonight ? <TonightCard entry={tonight} /> : null}

      <section aria-label="Key metrics">
        <ul className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <li>
            <KpiCard
              label="Net revenue · 7 days"
              value={formatMoney(overview.revenue7d)}
              delta={deltaLabel(overview.revenue7d.amount, overview.revenuePrev7d.amount)}
              deltaTone={toneFor(overview.revenue7d.amount, overview.revenuePrev7d.amount)}
              spark={overview.revenueByDay}
            />
          </li>
          <li>
            <KpiCard
              label="Tickets sold · 7 days"
              value={overview.tickets7d.toLocaleString("en-KE")}
              delta={deltaLabel(overview.tickets7d, overview.ticketsPrev7d)}
              deltaTone={toneFor(overview.tickets7d, overview.ticketsPrev7d)}
            />
          </li>
          <li>
            <KpiCard
              label="Available to pay out"
              value={formatMoney(balance.available)}
              delta={`of ${formatMoney(balance.payable)} owed to you`}
              deltaTone="neutral"
              accent
            />
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Event health — sold %, capacity bar, weekly pace. */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Event health</h2>
            <Link
              href="/organizer/events"
              className="text-sm font-medium text-primary hover:underline"
            >
              All events
            </Link>
          </div>

          {health.length === 0 && !tonight ? (
            <EmptyState
              title="No upcoming events"
              description="Create your first event to start selling tickets or taking bookings."
              action={{ label: "Create event", href: "/organizer/events/new" }}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col divide-y divide-line p-2">
                {health.map((entry) => (
                  <HealthRow key={entry.event.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Money — the panel the whole page is really about. */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Money</h2>
          <Card>
            <CardContent className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Available now
              </p>
              <p className="tabular mt-1 text-3xl font-bold text-primary">
                {formatMoney(balance.available)}
              </p>

              <dl className="mt-4 flex flex-col text-sm">
                <div className="flex justify-between border-t border-line py-2.5">
                  <dt className="text-muted">Owed to you</dt>
                  <dd className="tabular font-medium text-ink">{formatMoney(balance.payable)}</dd>
                </div>
                <div className="flex justify-between border-t border-line py-2.5">
                  <dt className="text-muted">Held in reserve</dt>
                  <dd className="tabular font-medium text-ink">{formatMoney(balance.reserved)}</dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted">{balance.releasePolicy}</p>

              <Button className="mt-4" block asChild>
                <Link href="/organizer/payouts">Request payout</Link>
              </Button>

              {/* Risk surfaces here because this is where it blocks money. */}
              {recentRisk.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {recentRisk.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start justify-between gap-3 rounded-card-sm border border-warning/25 bg-warning-tint p-3"
                    >
                      <p className="min-w-0 text-xs leading-relaxed text-ink-secondary">
                        <span className="font-semibold text-ink">
                          {event.subjectType.toLowerCase()} · score {event.score}
                        </span>{" "}
                        — {event.reasonCodes.join(", ") || "no triggers"}
                      </p>
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
              ) : (
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Nothing is holding your money. Risk decisions from checkout, resale and payouts
                  appear here when they do.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The show-night card. Committed to the dark treatment in both themes — it is
 * night photography with a gate readout, the USIKU signature.
 */
function TonightCard({ entry }: { entry: EventHealth }) {
  const soldPct = entry.capacity ? Math.round((entry.sold / entry.capacity) * 100) : null;
  const scannedPct =
    entry.sold > 0 ? Math.min(100, Math.round((entry.scanned / entry.sold) * 100)) : 0;

  return (
    <section
      aria-label={entry.live ? "Live now" : "Tonight"}
      className="relative isolate overflow-hidden rounded-hero bg-[#0A0B14]"
    >
      <Image
        src={entry.event.heroImage}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 66vw"
        className="object-cover opacity-45"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0A0B14]/95 via-[#0A0B14]/60 to-[#2A1745]/40"
        aria-hidden="true"
      />

      <div className="relative grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          {entry.live ? (
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#3ADFA0]">
              <span className="size-1.5 rounded-full bg-[#3ADFA0] shadow-[0_0_10px_#3ADFA0]" />
              Live now
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFC981]">
              <span className="size-1.5 rounded-full bg-[#FFA028] shadow-[0_0_10px_#FFA028]" />
              Tonight · doors {formatTime(entry.event.startsAt)}
            </p>
          )}
          <h2 className="mt-2 font-poster text-2xl font-normal uppercase leading-none text-[#F2F1EC] sm:text-3xl">
            {entry.event.title}
          </h2>
          <p className="mt-1.5 text-sm text-white/60">
            {entry.venue.name} · {formatDateTime(entry.event.startsAt)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            {entry.capacity !== null ? "Sold" : "Confirmed"}
          </p>
          <p className="tabular mt-1 text-3xl font-extrabold text-white">
            {entry.sold.toLocaleString("en-KE")}
            {entry.capacity !== null ? (
              <span className="text-base font-medium text-white/50">
                {" "}
                / {entry.capacity.toLocaleString("en-KE")}
              </span>
            ) : null}
          </p>
          {soldPct !== null ? (
            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-white/15"
              role="img"
              aria-label={`${soldPct}% sold`}
            >
              <div
                className="h-full rounded-pill bg-gradient-to-r from-[#FFA028] to-[#FFC981]"
                style={{ width: `${Math.min(100, soldPct)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            Gate
          </p>
          {entry.scanned > 0 ? (
            <>
              <p className="tabular mt-1 text-3xl font-extrabold text-white">
                {entry.scanned.toLocaleString("en-KE")}
                <span className="text-base font-medium text-white/50"> scanned</span>
              </p>
              <p className="mt-1 text-xs text-[#3ADFA0]">{scannedPct}% of ticket holders inside</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-white/60">
              {entry.live ? "No scans yet — gate is open." : "Opens with doors."}
            </p>
          )}
          <Button size="sm" className="mt-3" asChild>
            <Link href="/organizer/checkin">
              Open check-in <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  spark,
  accent = false,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: "up" | "down" | "neutral";
  spark?: number[];
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary-tint" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {label}
            </p>
            <p className={`tabular mt-1.5 text-[1.7rem] font-bold leading-none ${accent ? "text-primary" : "text-ink"}`}>
              {value}
            </p>
            <p
              className={`mt-2 text-xs font-medium ${
                deltaTone === "up"
                  ? "text-success"
                  : deltaTone === "down"
                    ? "text-error"
                    : "text-muted"
              }`}
            >
              {delta}
            </p>
          </div>
          {spark && spark.some((point) => point > 0) ? <Sparkline points={spark} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Tiny single-series area sparkline; ends on an emphasized point. */
function Sparkline({ points }: { points: number[] }) {
  const width = 96;
  const height = 36;
  const max = Math.max(...points, 1);
  const step = width / (points.length - 1 || 1);
  const coords = points.map(
    (point, index) => [index * step, height - 4 - (point / max) * (height - 10)] as const,
  );
  const path = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      role="img"
      aria-label="Daily revenue, last 7 days"
    >
      <polygon
        points={`0,${height} ${path} ${width},${height}`}
        fill="var(--color-primary)"
        opacity="0.12"
      />
      <polyline
        points={path}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-primary)" />
    </svg>
  );
}

function HealthRow({ entry }: { entry: EventHealth }) {
  const soldPct =
    entry.capacity && entry.capacity > 0 ? Math.round((entry.sold / entry.capacity) * 100) : null;
  const pace = paceLabel(entry.sold7d, entry.soldPrev7d);

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-card-sm">
        <Image src={entry.event.cardImage} alt="" fill sizes="44px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/organizer/events/${entry.event.id}`}
          className="line-clamp-1 text-sm font-semibold text-ink hover:text-primary"
        >
          {entry.event.title}
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
          {formatDateTime(entry.event.startsAt)} · {entry.venue.name}
        </p>
      </div>

      <div className="w-36 shrink-0">
        {soldPct !== null ? (
          <>
            <p className="tabular text-xs text-ink-secondary">
              {entry.sold.toLocaleString("en-KE")} / {entry.capacity!.toLocaleString("en-KE")} ·{" "}
              {soldPct}%
            </p>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-pill bg-surface-secondary"
              role="img"
              aria-label={`${soldPct}% of capacity sold`}
            >
              <div
                className="h-full rounded-pill bg-primary"
                style={{ width: `${Math.min(100, soldPct)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="tabular text-xs text-muted">
            {entry.sold > 0 ? `${entry.sold.toLocaleString("en-KE")} confirmed` : "Open capacity"}
          </p>
        )}
      </div>

      <p
        className={`w-28 shrink-0 text-right text-xs font-medium ${
          pace.tone === "up" ? "text-success" : pace.tone === "down" ? "text-warning" : "text-muted"
        }`}
      >
        {pace.text}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function deltaLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "No sales in either week";
  if (previous === 0) return "New this week";
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "Level with last week";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs prior 7 days`;
}

function toneFor(current: number, previous: number): "up" | "down" | "neutral" {
  if (previous === 0 || current === previous) return "neutral";
  return current > previous ? "up" : "down";
}

function paceLabel(sold7d: number, soldPrev7d: number): { text: string; tone: "up" | "down" | "neutral" } {
  if (sold7d === 0 && soldPrev7d === 0) return { text: "No sales this week", tone: "neutral" };
  if (soldPrev7d === 0) return { text: `▲ ${sold7d} this week`, tone: "up" };
  const pct = Math.round(((sold7d - soldPrev7d) / soldPrev7d) * 100);
  if (pct === 0) return { text: "Level week", tone: "neutral" };
  return {
    text: `${pct > 0 ? "▲" : "▼"} pace ${pct > 0 ? "+" : ""}${pct}% wk`,
    tone: pct > 0 ? "up" : "down",
  };
}
