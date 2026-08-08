import { LedgerAccountType } from "@/domain/enums";
import { DomainError } from "@/domain/errors";
import type { Currency, Money } from "@/domain/money";
import { money } from "@/domain/money";
import type { LedgerAccount, LedgerEntry, LedgerTransaction, OrganizerId } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { LedgerRepository } from "../repositories/types";

/**
 * Double-entry ledger.
 *
 * Organizer balances are read from this ledger, never by summing payments —
 * a payment that has been captured but sits behind a payout reserve is a very
 * different thing from money the organizer can withdraw, and only the ledger
 * knows the difference.
 */

/** Stable account codes. Organizer-scoped accounts append the organizer id. */
export const ACCOUNT = {
  /** Cash we actually hold at the PSP / bank. */
  CUSTOMER_FUNDS: "1000-CUSTOMER-FUNDS",
  /** Fees the PSP charges us. */
  PSP_FEES: "5000-PSP-FEES",
  /** Bookit's fee revenue. */
  PLATFORM_FEE_REVENUE: "4000-PLATFORM-FEE-REVENUE",
  /** VAT and other tax we owe. */
  TAX_LIABILITY: "2200-TAX-LIABILITY",
  /** Money returned to customers. */
  REFUNDS: "5100-REFUNDS",
  /** Cash paid out of the platform. */
  PAYOUTS_CLEARING: "1100-PAYOUTS-CLEARING",
  organizerPayable: (organizerId: OrganizerId) => `2000-ORGANIZER-PAYABLE-${organizerId}`,
  organizerReserve: (organizerId: OrganizerId) => `2010-ORGANIZER-RESERVE-${organizerId}`,
  sellerPayable: (userId: string) => `2100-SELLER-PAYABLE-${userId}`,
  contributions: (eventId: string) => `2300-CONTRIBUTIONS-${eventId}`,
} as const;

const ACCOUNT_TYPES: Array<{ prefix: string; type: LedgerAccountType; name: string }> = [
  { prefix: "1000", type: LedgerAccountType.ASSET, name: "Customer funds" },
  { prefix: "1100", type: LedgerAccountType.ASSET, name: "Payouts clearing" },
  { prefix: "2000", type: LedgerAccountType.LIABILITY, name: "Organizer payable" },
  { prefix: "2010", type: LedgerAccountType.LIABILITY, name: "Organizer reserve" },
  { prefix: "2100", type: LedgerAccountType.LIABILITY, name: "Resale seller payable" },
  { prefix: "2200", type: LedgerAccountType.LIABILITY, name: "Tax liability" },
  { prefix: "2300", type: LedgerAccountType.LIABILITY, name: "Contributions held" },
  { prefix: "4000", type: LedgerAccountType.REVENUE, name: "Platform fee revenue" },
  { prefix: "5000", type: LedgerAccountType.EXPENSE, name: "PSP fees" },
  { prefix: "5100", type: LedgerAccountType.EXPENSE, name: "Refunds" },
];

function accountTypeFor(code: string): { type: LedgerAccountType; name: string } {
  const prefix = code.slice(0, 4);
  const match = ACCOUNT_TYPES.find((entry) => entry.prefix === prefix);
  if (!match) {
    throw new DomainError("INTERNAL_ERROR", `Unknown ledger account code ${code}`);
  }
  return { type: match.type, name: match.name };
}

export interface PostTransactionInput {
  reference: string;
  kind: LedgerTransaction["kind"];
  entries: Array<{
    accountCode: string;
    side: "DEBIT" | "CREDIT";
    amount: Money;
    memo?: string;
    organizerId?: OrganizerId;
  }>;
  metadata?: Record<string, string>;
}

export class LedgerService {
  constructor(
    private readonly repo: LedgerRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async ensureAccount(code: string, currency: Currency = "KES", organizerId?: OrganizerId) {
    const existing = await this.repo.findAccountByCode(code);
    if (existing) return existing;
    const { type, name } = accountTypeFor(code);
    const account: LedgerAccount = {
      id: newId("acct"),
      code,
      name,
      type,
      ownerOrganizerId: organizerId ?? null,
      currency,
    };
    return this.repo.ensureAccount(account);
  }

  /**
   * Posts a balanced transaction.
   *
   * Two invariants are enforced here rather than left to callers:
   * debits must equal credits, and `reference` must be unique — which makes
   * posting idempotent for retried webhooks and replayed jobs.
   */
  async post(input: PostTransactionInput): Promise<LedgerTransaction> {
    const existing = await this.repo.findByReference(input.reference);
    if (existing) return existing;

    if (input.entries.length < 2) {
      throw new DomainError("LEDGER_UNBALANCED", "A ledger transaction needs at least two entries");
    }

    let debits = 0;
    let credits = 0;
    const currency = input.entries[0]!.amount.currency;

    const entries: LedgerEntry[] = [];
    for (const entry of input.entries) {
      if (entry.amount.amount <= 0) {
        throw new DomainError(
          "LEDGER_UNBALANCED",
          "Ledger entry amounts must be positive; direction is carried by `side`",
        );
      }
      if (entry.amount.currency !== currency) {
        throw new DomainError(
          "LEDGER_UNBALANCED",
          "All entries in a ledger transaction must share one currency",
        );
      }
      const account = await this.ensureAccount(entry.accountCode, currency, entry.organizerId);
      if (entry.side === "DEBIT") debits += entry.amount.amount;
      else credits += entry.amount.amount;
      entries.push({
        accountId: account.id,
        amount: entry.amount,
        side: entry.side,
        memo: entry.memo ?? null,
      });
    }

    if (debits !== credits) {
      throw new DomainError("LEDGER_UNBALANCED", "Debits and credits must balance", {
        debits,
        credits,
        reference: input.reference,
      });
    }

    return this.repo.post({
      id: newId("ltx"),
      reference: input.reference,
      kind: input.kind,
      entries,
      postedAt: this.clock.nowIso(),
      metadata: input.metadata ?? {},
    });
  }

  async balance(code: string, currency: Currency = "KES"): Promise<Money> {
    const account = await this.repo.findAccountByCode(code);
    if (!account) return money(0, currency);
    return money(await this.repo.balanceOf(account.id), account.currency);
  }

  /** What an organizer could withdraw today: payable minus held reserve. */
  async organizerAvailableBalance(organizerId: OrganizerId): Promise<Money> {
    const payable = await this.balance(ACCOUNT.organizerPayable(organizerId));
    const reserve = await this.balance(ACCOUNT.organizerReserve(organizerId));
    return money(Math.max(0, payable.amount - reserve.amount), payable.currency);
  }

  /** Verifies every posted transaction still balances. Used by tests and jobs. */
  async assertAllBalanced(): Promise<void> {
    const transactions = await this.repo.listTransactions();
    for (const transaction of transactions) {
      const debits = transaction.entries
        .filter((entry) => entry.side === "DEBIT")
        .reduce((total, entry) => total + entry.amount.amount, 0);
      const credits = transaction.entries
        .filter((entry) => entry.side === "CREDIT")
        .reduce((total, entry) => total + entry.amount.amount, 0);
      if (debits !== credits) {
        throw new DomainError("LEDGER_UNBALANCED", `Transaction ${transaction.reference} is unbalanced`, {
          debits,
          credits,
        });
      }
    }
  }
}
