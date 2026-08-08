/**
 * Money is represented everywhere as an integer number of minor units (cents),
 * paired with an ISO-4217 currency code. Floating point money is never stored,
 * transported or summed anywhere in the system.
 *
 * KES has 2 minor units, so `{ amount: 250000, currency: "KES" }` is KES 2,500.
 */

export type Currency = "KES" | "USD" | "UGX" | "TZS" | "RWF";

export interface Money {
  /** Integer minor units. May be negative (e.g. a refund line). */
  readonly amount: number;
  readonly currency: Currency;
}

const MINOR_UNITS: Record<Currency, number> = {
  KES: 2,
  USD: 2,
  UGX: 0,
  TZS: 2,
  RWF: 0,
};

export function money(amount: number, currency: Currency = "KES"): Money {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`Money amount must be an integer minor-unit value, got ${amount}`);
  }
  return { amount, currency };
}

export const zero = (currency: Currency = "KES"): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(a: Money, factor: number): Money {
  return money(Math.round(a.amount * factor), a.currency);
}

export function sum(items: readonly Money[], currency: Currency = "KES"): Money {
  return items.reduce((acc, item) => add(acc, item), zero(currency));
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isPositive(a: Money): boolean {
  return a.amount > 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
}

/**
 * Splits `total` into `parts` shares whose sum is exactly `total`, distributing
 * the remainder one minor unit at a time. Used for fee allocation so rounding
 * never creates or destroys money.
 */
export function allocate(total: Money, parts: number): Money[] {
  if (parts <= 0) throw new RangeError("parts must be > 0");
  const base = Math.trunc(total.amount / parts);
  let remainder = total.amount - base * parts;
  const step = remainder >= 0 ? 1 : -1;
  return Array.from({ length: parts }, () => {
    let share = base;
    if (remainder !== 0) {
      share += step;
      remainder -= step;
    }
    return money(share, total.currency);
  });
}

/** Applies a percentage expressed in basis points (250 bps = 2.5%). */
export function percentageOf(a: Money, basisPoints: number): Money {
  return money(Math.round((a.amount * basisPoints) / 10_000), a.currency);
}

export function formatMoney(
  value: Money,
  options: { showDecimals?: boolean; locale?: string } = {},
): string {
  const { showDecimals = false, locale = "en-KE" } = options;
  const minor = MINOR_UNITS[value.currency];
  const major = value.amount / 10 ** minor;
  const fractionDigits = showDecimals ? minor : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    currencyDisplay: "code",
  })
    .format(major)
    .replace(/ /g, " ");
}

/** Convenience for seed data and tests: `kes(2500)` → KES 2,500.00. */
export const kes = (major: number): Money => money(Math.round(major * 100), "KES");
