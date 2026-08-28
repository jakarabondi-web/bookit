import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { ACCOUNT } from "@/server/services/ledger-service";
import { MetricCard } from "@/components/organizer/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";
import type { LedgerTransaction } from "@/domain/types";

export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage() {
  const { ledger, payouts, uow } = getContainer();
  const organizerId = await currentOrganizerId();

  const [balance, transactions, accounts] = await Promise.all([
    payouts.balanceFor(organizerId),
    uow.repos.ledger.listTransactions(),
    uow.repos.ledger.listAccounts(),
  ]);

  const feeRevenue = await ledger.balance(ACCOUNT.PLATFORM_FEE_REVENUE);
  const customerFunds = await ledger.balance(ACCOUNT.CUSTOMER_FUNDS);

  const accountName = (accountId: string) =>
    accounts.find((account) => account.id === accountId)?.name ?? accountId;

  const columns: Column<LedgerTransaction>[] = [
    {
      key: "reference",
      header: "Reference",
      hideOnMobile: true,
      render: (transaction) => (
        <span className="font-mono text-xs text-ink">{transaction.reference}</span>
      ),
    },
    {
      key: "kind",
      header: "Type",
      render: (transaction) => <Badge>{transaction.kind.replace("_", " ").toLowerCase()}</Badge>,
    },
    {
      key: "posted",
      header: "Posted",
      render: (transaction) => formatDateTime(transaction.postedAt),
    },
    {
      key: "entries",
      header: "Entries",
      render: (transaction) => (
        <ul className="flex flex-col gap-0.5 text-xs">
          {transaction.entries.map((entry, index) => (
            <li key={index} className="flex items-center gap-2">
              <span
                className={
                  entry.side === "DEBIT"
                    ? "font-medium text-info"
                    : "font-medium text-warning"
                }
              >
                {entry.side === "DEBIT" ? "Dr" : "Cr"}
              </span>
              <span className="text-ink-secondary">{accountName(entry.accountId)}</span>
              <span className="ml-auto tabular text-ink">{formatMoney(entry.amount)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Finance</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Every shilling on Bookit is recorded as a balanced double-entry transaction. Your
            available balance is read from this ledger — not by adding up payments.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/payouts">Payouts</Link>
        </Button>
      </header>

      <section aria-label="Balances">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <li>
            <MetricCard
              label="Owed to you"
              value={formatMoney(balance.payable)}
              hint="Ticket revenue less platform fees"
              tone="brand"
            />
          </li>
          <li>
            <MetricCard label="Held in reserve" value={formatMoney(balance.reserved)} />
          </li>
          <li>
            <MetricCard
              label="Available now"
              value={formatMoney(balance.available)}
              hint={`Trust tier: ${balance.trustTier.toLowerCase()}`}
            />
          </li>
          <li>
            <MetricCard
              label="Platform fees charged"
              value={formatMoney(money(Math.abs(feeRevenue.amount), feeRevenue.currency))}
            />
          </li>
        </ul>
      </section>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-ink">How your balance is released</h2>
          <p className="mt-2 text-sm text-ink-secondary">{balance.releasePolicy}</p>
          <p className="mt-3 text-sm text-muted">
            Reserves protect ticket buyers if an event does not go ahead. As your event history
            builds, your trust tier improves and more of each sale is available before the event.
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Ledger</h2>
          <p className="tabular text-sm text-muted">
            Customer funds held: {formatMoney(customerFunds)}
          </p>
        </div>

        <DataTable
          columns={columns}
          rows={transactions.slice(-40).reverse()}
          rowKey={(transaction) => transaction.id}
          caption="Ledger transactions"
          mobileTitle={(transaction) => transaction.reference}
          emptyState={
            <EmptyState
              title="No ledger activity yet"
              description="Once tickets sell, every sale, fee, refund and payout is posted here as a balanced transaction."
            />
          }
        />
      </section>
    </div>
  );
}
