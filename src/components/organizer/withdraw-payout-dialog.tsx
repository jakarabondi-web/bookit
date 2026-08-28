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
  // Set only when the payout request comes back STEP_UP_REQUIRED — the same
  // request retries automatically once a step-up code is confirmed.
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState("");

  const availableMajor = available.amount / 100;

  async function requestPayout() {
    const response = await fetch("/api/v1/organizers/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMinor: Math.round(Number(amount) * 100) }),
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload?.error?.code === "STEP_UP_REQUIRED") {
        setNeedsStepUp(true);
        return;
      }
      setError(payload?.error?.message ?? "Could not request that payout");
      return;
    }
    setSuccess(
      payload.data.status === "UNDER_REVIEW"
        ? "Submitted — this one needs a quick review before it moves."
        : "Payout requested — it will settle within one business day once approved.",
    );
    router.refresh();
  }

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPayout();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function submitStepUp(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: stepUpCode }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "That code didn't match");
        return;
      }
      setNeedsStepUp(false);
      setStepUpCode("");
      await requestPayout();
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
      setNeedsStepUp(false);
      setStepUpCode("");
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
        ) : needsStepUp ? (
          <form onSubmit={submitStepUp} className="flex flex-col gap-4">
            <p className="text-sm text-ink-secondary">
              Requesting a payout requires confirming your identity. Enter the current code from
              your authenticator app.
            </p>
            <Field label="6-digit code" htmlFor="payout-stepup-code">
              <Input
                id="payout-stepup-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={stepUpCode}
                onChange={(changeEvent) =>
                  setStepUpCode(changeEvent.target.value.replace(/\D/g, ""))
                }
                required
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm font-medium text-error">
                {error}
                {error === "Turn on two-factor authentication first" ? (
                  <>
                    {" "}
                    <a href="/account/profile" className="underline">
                      Set it up on your profile
                    </a>
                    .
                  </>
                ) : null}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || stepUpCode.length !== 6}>
                {busy ? "Confirming…" : "Confirm and request payout"}
              </Button>
            </DialogFooter>
          </form>
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
