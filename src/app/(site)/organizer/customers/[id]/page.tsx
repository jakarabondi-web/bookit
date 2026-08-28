import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, ReceiptText, RotateCcw } from "lucide-react";
import { formatMoney } from "@/domain/money";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { SEGMENT_PLAY } from "@/server/services/crm-service";
import { SegmentBadge } from "@/components/organizer/segment-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Customer" };

/**
 * A single customer's file: who they are, what they're worth, how they buy,
 * and the full purchase history — with the segment's recommended play stated
 * in words, because a CRM that only scores people leaves the "so what" to
 * the reader.
 */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { crm } = getContainer();
  const organizerId = await currentOrganizerId();
  const record = await crm.customer(organizerId, id);
  if (!record) notFound();

  const { profile, timeline } = record;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/organizer/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-primary"
        >
          <ArrowLeft className="size-4" /> All customers
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-tint text-lg font-bold text-primary">
            {initials(profile.name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-ink">{profile.name}</h1>
              <SegmentBadge segment={profile.segment} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {profile.email}
              </span>
              {profile.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {profile.phone}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a href={`mailto:${profile.email}`}>Email {profile.name.split(" ")[0]}</a>
        </Button>
      </header>

      {/* The segment's play, in words. */}
      <Card className="border-primary/25 bg-primary-tint">
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold">Suggested play — </span>
            {SEGMENT_PLAY[profile.segment]}
          </p>
        </CardContent>
      </Card>

      <section aria-label="Lifetime value">
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {[
            ["Lifetime spend", formatMoney(profile.spend)],
            ["Orders", String(profile.orders)],
            ["Tickets", String(profile.tickets)],
            ["Events", String(profile.eventsBought)],
            ["Customer since", formatDate(profile.firstOrderAt)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-card border border-line bg-surface p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {label}
              </dt>
              <dd className="tabular mt-1 text-lg font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-ink">RFM profile</h2>
          <p className="text-xs text-muted">scored 1–5 · drives the segment</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Recency", profile.rfm.recency, `last purchase ${formatDate(profile.lastOrderAt)}`],
            ["Frequency", profile.rfm.frequency, `${profile.orders} paid orders`],
            ["Monetary", profile.rfm.monetary, `${formatMoney(profile.spend)} lifetime`],
          ].map(([label, score, hint]) => (
            <div key={String(label)} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="tabular text-sm font-bold text-primary">{score}/5</p>
              </div>
              <div
                className="mt-2.5 flex gap-1"
                role="img"
                aria-label={`${label} score ${score} of 5`}
              >
                {[1, 2, 3, 4, 5].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-pill ${
                      step <= Number(score) ? "bg-primary" : "bg-surface-secondary"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Purchase history</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-line p-2">
            {timeline.map((entry) => (
              <div
                key={`${entry.reference}-${entry.at}`}
                className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    entry.kind === "REFUND"
                      ? "bg-warning-tint text-warning"
                      : "bg-primary-tint text-primary"
                  }`}
                >
                  {entry.kind === "REFUND" ? (
                    <RotateCcw className="size-4" />
                  ) : (
                    <ReceiptText className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {entry.kind === "REFUND" ? "Refund — " : ""}
                    {entry.eventTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(entry.at)} · {entry.reference} ·{" "}
                    {entry.quantity} {entry.quantity === 1 ? "ticket" : "tickets"}
                  </p>
                </div>
                <p
                  className={`tabular shrink-0 text-sm font-semibold ${
                    entry.kind === "REFUND" ? "text-warning" : "text-ink"
                  }`}
                >
                  {entry.kind === "REFUND" ? "−" : ""}
                  {formatMoney(entry.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
