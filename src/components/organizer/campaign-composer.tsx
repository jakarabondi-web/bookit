"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { SEGMENT_LABEL, type Segment } from "@/server/services/crm-service";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SegmentCount {
  segment: Segment;
  count: number;
}

/**
 * The audience composer — pick one or more CRM segments, watch the reach
 * total add up live, write the message, send.
 *
 * Reach is summed client-side from the segment counts the server already
 * computed for the page (no extra round trip); the actual send re-derives
 * the real membership server-side at request time, so what gets a message
 * is always current even if this number is a few minutes stale.
 */
export function CampaignComposer({
  segmentCounts,
  initialSegments = [],
}: {
  segmentCounts: SegmentCount[];
  initialSegments?: Segment[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<Segment>>(new Set(initialSegments));
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reach = useMemo(
    () =>
      segmentCounts
        .filter((entry) => selected.has(entry.segment))
        .reduce((sum, entry) => sum + entry.count, 0),
    [segmentCounts, selected],
  );

  function toggle(segment: Segment) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(segment)) next.delete(segment);
      else next.add(segment);
      return next;
    });
  }

  async function send() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const response = await fetch("/api/v1/organizers/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [...selected],
          channel,
          subject,
          body,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not send that campaign");
        return;
      }
      const skippedNote =
        payload.data.skipped > 0
          ? ` (${payload.data.skipped} had no ${channel === "SMS" ? "phone number" : "email"} on file)`
          : "";
      setResult(`Sent to ${payload.data.recipientCount} customers${skippedNote}.`);
      setSubject("");
      setBody("");
      router.refresh();
    } catch {
      setError("You appear to be offline. Try again once you're reconnected.");
    } finally {
      setBusy(false);
    }
  }

  const canSend = selected.size > 0 && subject.trim() !== "" && body.trim() !== "" && !busy;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-ink">Send to</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {segmentCounts.map((entry) => {
            const on = selected.has(entry.segment);
            return (
              <li key={entry.segment}>
                <button
                  type="button"
                  onClick={() => toggle(entry.segment)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {SEGMENT_LABEL[entry.segment]}
                  <span className={on ? "tabular text-primary-foreground/80" : "tabular text-muted"}>
                    {entry.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-card-sm border border-line bg-surface-secondary px-4 py-3">
        <p className="text-sm text-ink-secondary">
          Reach: <span className="tabular font-semibold text-ink">{reach.toLocaleString("en-KE")}</span>{" "}
          {reach === 1 ? "customer" : "customers"}
          {selected.size === 0 ? " — select a segment above" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Channel" htmlFor="campaign-channel">
          <Select value={channel} onValueChange={(value) => setChannel(value as "EMAIL" | "SMS")}>
            <SelectTrigger aria-label="Channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subject" htmlFor="campaign-subject">
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={channel === "SMS" ? "Kept short for SMS" : "What's this about?"}
            maxLength={150}
          />
        </Field>
      </div>

      <Field label="Message" htmlFor="campaign-body">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Write the message this segment will receive…"
        />
      </Field>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="text-sm text-success" role="status">
          {result}
        </p>
      ) : null}

      <Button onClick={send} disabled={!canSend} className="self-start">
        <Send className="size-4" />
        {busy ? "Sending…" : `Send to ${reach.toLocaleString("en-KE")}`}
      </Button>
    </div>
  );
}
