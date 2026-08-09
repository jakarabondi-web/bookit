import type { Metadata } from "next";
import { KeyRound, ShieldCheck, Timer } from "lucide-react";
import { formatMoney } from "@/domain/money";
import type { Payout } from "@/domain/types";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { MetricCard } from "@/components/organizer/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Payouts" };

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
  PENDING: "warning",
  UNDER_REVIEW: "warning",
  APPROVED: "info",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "error",
  REVERSED: "error",
};

const CONTROLS = [
  {
    icon: ShieldCheck,
    title: "Step-up authentication",
    body: "Requesting a payout or changing where money is sent requires re-confirming your identity, even in an active session.",
  },
  {
    icon: KeyRound,
    title: "Maker-checker approval",
    body: "A payout cannot be approved by the person who requested it. High-value payouts need a finance manager on a separate account.",
  },
  {
    icon: Timer,
    title: "Cooling period",
    body: "Changing your settlement account notifies your existing contacts, raises a risk event and holds payouts for a cooling period.",
  },
];

export default async function PayoutsPage() {
  const { payouts } = getContainer();

  const [balance, history] = await Promise.all([
    payouts.balanceFor(DEMO_ORGANIZER_ID),
    payouts.listForOrganizer(DEMO_ORGANIZER_ID),
  ]);

  const columns: Column<Payout>[] = [
    {
      key: "requested",
      header: "Requested",
      hideOnMobile: true,
      render: (payout) => formatDateTime(payout.requestedAt),
    },
    {
      key: "amount",
      header: "Amount",
      render: (payout) => (
        <span className="tabular font-medium text-ink">{formatMoney(payout.amount)}</span>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      render: (payout) => <span className="font-mono text-xs">{payout.destinationMasked}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (payout) => (
        <Badge tone={STATUS_TONE[payout.status] ?? "neutral"}>
          {payout.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "hold",
      header: "Notes",
      render: (payout) => payout.holdReason ?? (payout.paidAt ? "Paid" : "—"),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Withdraw your available balance to your settlement account.
        </p>
      </header>

      <section aria-label="Balance">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <li>
            <MetricCard
              label="Available now"
              value={formatMoney(balance.available)}
              tone="brand"
              hint={balance.releasePolicy}
            />
          </li>
          <li>
            <MetricCard label="Held in reserve" value={formatMoney(balance.reserved)} />
          </li>
          <li>
            <MetricCard label="Total owed" value={formatMoney(balance.payable)} />
          </li>
        </ul>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Request a payout</h2>
            <p className="mt-1 text-sm text-muted">
              Funds reach an M-PESA or bank settlement account within one business day once
              approved.
            </p>
          </div>
          {/* `PayoutService.requestPayout` exists but has no route or UI
              yet, so this stays disabled rather than looking live and doing
              nothing with real money. */}
          <Button size="lg" disabled title="Not available yet">
            {balance.available.amount === 0
              ? "Nothing available yet"
              : `Withdraw ${formatMoney(balance.available)}`}
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Security controls</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CONTROLS.map((control) => (
            <li key={control.title}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <control.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{control.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-secondary">{control.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Payout history</h2>
        <DataTable
          columns={columns}
          rows={history}
          rowKey={(payout) => payout.id}
          caption="Payout history"
          mobileTitle={(payout) => formatMoney(payout.amount)}
          emptyState={
            <EmptyState
              title="No payouts yet"
              description="Once your first event settles, your payouts will be listed here with their full approval trail."
            />
          }
        />
      </section>
    </div>
  );
}
