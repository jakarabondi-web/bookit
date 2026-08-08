"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Percent, Plus, Tag, X } from "lucide-react";
import type { AffiliateLink, PromoCode } from "@/domain/types";
import { formatMoney } from "@/domain/money";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventOption {
  id: string;
  title: string;
}

/** Human summary of a code's discount: "20% off" or "KES 500 off". */
function discountLabel(promo: PromoCode): string {
  if (promo.kind === "PERCENT") return `${(promo.percentBps! / 100).toFixed(0)}% off`;
  return `${formatMoney(promo.fixedAmount!)} off`;
}

/**
 * Real promo-code and affiliate-link management, grouped by event. Every
 * count and status shown here is live: redemptions come from actual
 * checkouts (see `redeemPromoCode` in the checkout transaction), clicks come
 * from real visits to `/go/:code`.
 */
export function PromotionsPanel({
  events,
  promoCodes,
  affiliateLinks,
  origin,
}: {
  events: EventOption[];
  promoCodes: PromoCode[];
  affiliateLinks: AffiliateLink[];
  origin: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => {
        const codes = promoCodes.filter((promo) => promo.eventId === event.id);
        const links = affiliateLinks.filter((link) => link.eventId === event.id);
        return (
          <li
            key={event.id}
            className="rounded-card border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-ink">{event.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <PromoCodeDialog eventId={event.id} />
                <AffiliateLinkDialog eventId={event.id} />
              </div>
            </div>

            {codes.length === 0 && links.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No promo codes or affiliate links yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {codes.map((promo) => (
                  <PromoCodeRow key={promo.id} promo={promo} />
                ))}
                {links.map((link) => (
                  <AffiliateLinkRow key={link.id} link={link} origin={origin} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PromoCodeRow({ promo }: { promo: PromoCode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const expired = promo.endsAt !== null && promo.endsAt < new Date().toISOString();
  const exhausted = promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions;
  const inactive = Boolean(promo.disabledAt) || expired || exhausted;

  async function disable() {
    setBusy(true);
    try {
      await fetch(`/api/v1/organizers/promo-codes/${promo.id}`, { method: "PATCH" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card-sm border border-line bg-surface-secondary px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
        <Percent className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="tabular font-mono text-sm font-semibold text-ink">{promo.code}</p>
        <p className="text-xs text-muted">
          {discountLabel(promo)} ·{" "}
          {promo.maxRedemptions !== null
            ? `${promo.redemptionCount} / ${promo.maxRedemptions} used`
            : `${promo.redemptionCount} used`}
        </p>
      </div>
      {promo.disabledAt ? (
        <Badge>Disabled</Badge>
      ) : expired ? (
        <Badge tone="warning">Expired</Badge>
      ) : exhausted ? (
        <Badge tone="warning">Fully redeemed</Badge>
      ) : (
        <Badge tone="success">Active</Badge>
      )}
      {!inactive ? (
        <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
          <X className="size-3.5" /> Disable
        </Button>
      ) : null}
    </div>
  );
}

function AffiliateLinkRow({ link, origin }: { link: AffiliateLink; origin: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${origin}/go/${link.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access denied — the URL is still visible to copy by hand.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card-sm border border-line bg-surface-secondary px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
        <Tag className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{link.label}</p>
        <p className="truncate text-xs text-muted">{url}</p>
      </div>
      <Badge tone="brand">{link.clickCount} clicks</Badge>
      <Button size="sm" variant="ghost" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function PromoCodeDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const numericValue = Number(value);
      const response = await fetch("/api/v1/organizers/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          code,
          kind,
          percentBps: kind === "PERCENT" ? Math.round(numericValue * 100) : undefined,
          fixedAmountMinor: kind === "FIXED" ? Math.round(numericValue * 100) : undefined,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create that code");
        return;
      }
      setOpen(false);
      setCode("");
      setValue("");
      setMaxRedemptions("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-3.5" /> Add code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New promo code</DialogTitle>
          <DialogDescription>
            Buyers enter this at checkout. The discount comes off before service fees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <Field label="Code" htmlFor="promo-code" hint="Letters, numbers and dashes.">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="EARLYBIRD"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" htmlFor="promo-kind">
              <Select value={kind} onValueChange={(next) => setKind(next as "PERCENT" | "FIXED")}>
                <SelectTrigger aria-label="Discount type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={kind === "PERCENT" ? "Percent off" : "KES off"}
              htmlFor="promo-value"
            >
              <Input
                type="number"
                min="1"
                max={kind === "PERCENT" ? "100" : undefined}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={kind === "PERCENT" ? "20" : "500"}
                required
              />
            </Field>
          </div>
          <Field
            label="Redemption limit"
            htmlFor="promo-max"
            hint="Leave blank for unlimited."
          >
            <Input
              type="number"
              min="1"
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="Unlimited"
            />
          </Field>
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AffiliateLinkDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/organizers/affiliate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, label }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create that link");
        return;
      }
      setOpen(false);
      setLabel("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-3.5" /> Add link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New affiliate link</DialogTitle>
          <DialogDescription>
            A short, trackable link to this event. Clicks are counted the moment someone follows
            it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <Field label="Who's this for?" htmlFor="affiliate-label" hint="You'll see this label, not your visitors.">
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="DJ Mo — Instagram story"
              required
            />
          </Field>
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
