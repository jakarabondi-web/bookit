"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Money } from "@/domain/money";
import { formatMoney } from "@/domain/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";

/**
 * Draws down the organizer's available balance.
 *
 * `PayoutService.requestPayout` is the real guard — step-up auth, the
 * available-balance cap, risk scoring — this dialog only has to collect an
 * amount and surface whatever the service decides in plain language.
 */
export function WithdrawPayoutDialog({
  available,
  destinationMasked,
}: {
  available: Money;
  destinationMasked: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(available.amount / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableMajor = available.amount / 100;

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/organizers/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMinor: Math.round(Number(amount) * 100) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not request that payout");
        return;
      }
      setSuccess(
        payload.data.status === "UNDER_REVIEW"
          ? "Submitted — this one needs a quick review before it moves."
          : "Payout requested — it will settle within one business day once approved.",
      );
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setError(null);
      setSuccess(null);
      setAmount(String(availableMajor));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" disabled={available.amount === 0}>
          {available.amount === 0
            ? "Nothing available yet"
            : `Withdraw ${formatMoney(available)}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a payout</DialogTitle>
          <DialogDescription>
            Settles to {destinationMasked}. Funds reach your account within one business day once
            approved.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-card-sm border border-line bg-surface-secondary p-3 text-sm text-ink">
              {success}
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <dl className="flex justify-between rounded-card-sm bg-surface-secondary p-3 text-sm">
              <dt className="text-muted">Available now</dt>
              <dd className="tabular font-medium text-ink">{formatMoney(available)}</dd>
            </dl>

            <Field label="Amount to withdraw" htmlFor="payout-amount" hint="In KES">
              <Input
                id="payout-amount"
                type="number"
                min="1"
                max={String(availableMajor)}
                step="1"
                value={amount}
                onChange={(changeEvent) => setAmount(changeEvent.target.value)}
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="text-sm font-medium text-error">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || available.amount === 0}>
                {busy ? "Requesting…" : "Request payout"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
