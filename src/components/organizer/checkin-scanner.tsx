"use client";

import { useState } from "react";
import { CheckCircle2, ScanLine, ShieldAlert, XCircle } from "lucide-react";
import { CheckInResult } from "@/domain/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Gate check-in console.
 *
 * Two modes, because a real gate needs both: scanning a QR credential, and
 * looking a guest up by booking reference when their phone is dead. Every scan
 * returns one of a fixed set of outcomes and the console shows exactly which —
 * "already used at 7:42 PM" is the answer a gate steward actually needs, not a
 * generic failure.
 */

interface ScanOutcome {
  result: CheckInResult;
  message: string;
  holderName?: string;
  ticketTypeName?: string;
  seatLabel?: string | null;
  guestCount?: number;
  at: string;
}

const RESULT_STYLE: Record<
  CheckInResult,
  { tone: "success" | "error" | "warning"; icon: typeof CheckCircle2; label: string }
> = {
  ADMITTED: { tone: "success", icon: CheckCircle2, label: "Admitted" },
  ALREADY_USED: { tone: "warning", icon: ShieldAlert, label: "Already used" },
  INVALID_CREDENTIAL: { tone: "error", icon: XCircle, label: "Invalid code" },
  WRONG_EVENT: { tone: "error", icon: XCircle, label: "Wrong event" },
  NOT_YET_VALID: { tone: "warning", icon: ShieldAlert, label: "Not yet valid" },
  REVOKED: { tone: "error", icon: XCircle, label: "Revoked" },
  REQUIRES_OVERRIDE: { tone: "warning", icon: ShieldAlert, label: "Needs supervisor" },
};

export interface CheckinScannerProps {
  events: Array<{ id: string; title: string }>;
}

export function CheckinScanner({ events }: CheckinScannerProps) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [credential, setCredential] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ScanOutcome[]>([]);

  async function submit(mode: "credential" | "booking") {
    if (!eventId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/v1/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "credential"
            ? { mode, eventId, credential, deviceId: "gate-console" }
            : { mode, eventId, reference, deviceId: "gate-console" },
        ),
      });
      const payload = await response.json();

      const outcome: ScanOutcome = response.ok
        ? { ...payload.data, at: new Date().toISOString() }
        : {
            result: CheckInResult.INVALID_CREDENTIAL,
            message: payload?.error?.message ?? "Scan failed",
            at: new Date().toISOString(),
          };

      setHistory((current) => [outcome, ...current].slice(0, 20));
      if (mode === "credential") setCredential("");
      else setReference("");
    } catch {
      setHistory((current) =>
        [
          {
            result: CheckInResult.INVALID_CREDENTIAL,
            message: "Offline — the scan was not recorded. Reconnect and try again.",
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20),
      );
    } finally {
      setBusy(false);
    }
  }

  const latest = history[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Event</span>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger aria-label="Event being scanned">
              <SelectValue placeholder="Choose an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="qr">
          <TabsList className="w-full">
            <TabsTrigger value="qr" className="flex-1">
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex-1">
              Guest lookup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit("credential");
              }}
              className="flex flex-col gap-4"
            >
              <Field
                label="Ticket credential"
                htmlFor="scan-credential"
                hint="A hardware scanner types the code here. Credentials expire in seconds, so a screenshot will not scan."
                required
              >
                <Input
                  value={credential}
                  onChange={(event) => setCredential(event.target.value)}
                  placeholder="BK1.…"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Button type="submit" size="lg" block disabled={busy || !credential}>
                <ScanLine className="size-4" />
                {busy ? "Checking…" : "Admit"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="lookup">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit("booking");
              }}
              className="flex flex-col gap-4"
            >
              <Field
                label="Booking reference"
                htmlFor="scan-reference"
                hint="For guests on a list rather than holding a ticket."
                required
              >
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="BK-RUR1000"
                  autoComplete="off"
                />
              </Field>
              <Button type="submit" size="lg" block disabled={busy || !reference}>
                {busy ? "Checking…" : "Check in guest"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {latest ? <OutcomeBanner outcome={latest} /> : null}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-ink">Recent scans</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Scans from this console appear here. Every scan is recorded against the event,
              whether it was admitted or refused.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {history.map((outcome, index) => {
                const style = RESULT_STYLE[outcome.result];
                return (
                  <li
                    key={`${outcome.at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-card-sm border border-line px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {outcome.holderName ?? outcome.message}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(outcome.at).toLocaleTimeString("en-KE")}
                        {outcome.seatLabel ? ` · Seat ${outcome.seatLabel}` : ""}
                      </p>
                    </div>
                    <Badge tone={style.tone}>{style.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OutcomeBanner({ outcome }: { outcome: ScanOutcome }) {
  const style = RESULT_STYLE[outcome.result];
  const Icon = style.icon;

  const toneClass =
    style.tone === "success"
      ? "border-success/25 bg-success-tint"
      : style.tone === "warning"
        ? "border-warning/25 bg-warning-tint"
        : "border-error/25 bg-error-tint";

  const iconClass =
    style.tone === "success"
      ? "text-success"
      : style.tone === "warning"
        ? "text-warning"
        : "text-error";

  return (
    <div role="status" className={`flex items-start gap-3 rounded-card border p-4 ${toneClass}`}>
      <Icon className={`mt-0.5 size-6 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink">{style.label}</p>
        <p className="mt-0.5 text-sm text-ink-secondary">{outcome.message}</p>
        {outcome.holderName ? (
          <p className="mt-2 text-sm text-ink">
            <strong>{outcome.holderName}</strong>
            {outcome.ticketTypeName ? ` · ${outcome.ticketTypeName}` : ""}
            {outcome.seatLabel ? ` · Seat ${outcome.seatLabel}` : ""}
            {outcome.guestCount && outcome.guestCount > 1
              ? ` · ${outcome.guestCount} guests`
              : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
