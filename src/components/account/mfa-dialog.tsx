"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
 * Turns two-factor authentication on.
 *
 * Two steps in one dialog: enrolling (fetching a secret the instant the
 * dialog opens) and verifying (proving the authenticator app actually has
 * it). Nothing is "enabled" server-side until the code checks out.
 */
export function EnableMfaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ manualEntry: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");

  async function startEnrollment() {
    setLoading(true);
    setError(null);
    setSecret(null);
    setCode("");
    try {
      const response = await fetch("/api/v1/auth/mfa/enroll", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not start setup");
        return;
      }
      setSecret({ manualEntry: payload.data.manualEntry, otpauthUrl: payload.data.otpauthUrl });
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "That code didn't match");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void startEnrollment();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="mt-2">
          Turn on 2FA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Turn on two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan-free setup: add this account to an authenticator app (Google Authenticator,
            Authy, 1Password, …) using manual entry, then enter the 6-digit code it shows.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Setting up…</p>
        ) : secret ? (
          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <div className="rounded-card-sm border border-line bg-surface-secondary p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Manual entry code
              </p>
              <p className="tabular mt-1 break-all font-mono text-sm text-ink">
                {secret.manualEntry}
              </p>
            </div>

            <Field label="6-digit code" htmlFor="mfa-code" hint="From your authenticator app.">
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(changeEvent) => setCode(changeEvent.target.value.replace(/\D/g, ""))}
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="text-sm font-medium text-error">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? "Verifying…" : "Turn on"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p role="alert" className="text-sm font-medium text-error">
            {error ?? "Could not start setup"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Turns two-factor authentication off — still requires a current code. */
export function DisableMfaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "That code didn't match");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCode("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="mt-2 text-error hover:bg-error-tint">
          Turn off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Turn off two-factor authentication</DialogTitle>
          <DialogDescription>
            Enter a current code from your authenticator app to confirm.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="6-digit code" htmlFor="mfa-disable-code">
            <Input
              id="mfa-disable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(changeEvent) => setCode(changeEvent.target.value.replace(/\D/g, ""))}
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={busy || code.length !== 6}>
              {busy ? "Turning off…" : "Turn off 2FA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
