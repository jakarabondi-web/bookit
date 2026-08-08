"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { EventType } from "@/domain/enums";
import { behaviourFor } from "@/domain/event-type-policy";
import { add, money, percentageOf, type Money } from "@/domain/money";
import type { Event, TicketType } from "@/domain/types";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The event detail sidebar. Its entire shape is driven by the event's type
 * through `behaviourFor`, so a banquet asks about tables and meal choices while
 * a stadium show asks for a ticket tier and quantity — and neither is a special
 * case bolted onto the other.
 */

export interface BookingPanelProps {
  event: Pick<Event, "id" | "type" | "title" | "capacity" | "policies" | "slug">;
  ticketTypes: TicketType[];
  availability: Record<string, number>;
  remainingCapacity: number | null;
  tablesAvailable: number | null;
  soldOut: boolean;
  serviceFeeBps: number;
}

type Status = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

export function BookingPanel(props: BookingPanelProps) {
  const behaviour = behaviourFor(props.event.type);

  if (props.event.type === EventType.HYBRID) {
    return (
      <PanelShell event={props.event}>
        <Tabs defaultValue="tickets">
          <TabsList className="w-full">
            <TabsTrigger value="tickets" className="flex-1">
              Buy Tickets
            </TabsTrigger>
            <TabsTrigger value="rsvp" className="flex-1">
              RSVP
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tickets" className="mt-5">
            <TicketPurchase {...props} />
          </TabsContent>
          <TabsContent value="rsvp" className="mt-5">
            <BookingForm {...props} mode="RSVP" />
          </TabsContent>
        </Tabs>
      </PanelShell>
    );
  }

  return (
    <PanelShell event={props.event}>
      {behaviour.issuesTickets ? (
        <TicketPurchase {...props} />
      ) : props.event.type === EventType.PRIVATE_INVITATION ? (
        <BookingForm {...props} mode="INVITE" />
      ) : props.event.type === EventType.BANQUET ? (
        <BookingForm {...props} mode="TABLE" />
      ) : props.event.type === EventType.RECURRING_MEETING ? (
        <BookingForm {...props} mode="SERIES" />
      ) : props.event.type === EventType.BOOKING ? (
        <BookingForm {...props} mode="RESERVE" />
      ) : (
        <BookingForm {...props} mode="RSVP" />
      )}
    </PanelShell>
  );
}

function PanelShell({
  event,
  children,
}: {
  event: BookingPanelProps["event"];
  children: React.ReactNode;
}) {
  const behaviour = behaviourFor(event.type);

  return (
    <div className="rounded-card-lg border border-line bg-surface p-5 shadow-card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{behaviour.primaryCta}</h2>
        <p className="mt-1 text-sm text-muted">{behaviour.blurb}</p>
      </div>
      {children}
      <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        Every Bookit ticket is verified against our records. Your QR refreshes automatically and
        stops working the moment a ticket is transferred or resold.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Paid tickets                                                                */
/* -------------------------------------------------------------------------- */

function TicketPurchase({
  event,
  ticketTypes,
  availability,
  soldOut,
  serviceFeeBps,
}: BookingPanelProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const currency = ticketTypes[0]?.price.currency ?? "KES";

  const { subtotal, fees, total, count } = useMemo(() => {
    let sub = money(0, currency);
    let items = 0;
    for (const ticketType of ticketTypes) {
      const quantity = quantities[ticketType.id] ?? 0;
      if (quantity === 0) continue;
      items += quantity;
      sub = add(sub, money(ticketType.price.amount * quantity, currency));
    }
    const fee = percentageOf(sub, serviceFeeBps);
    return { subtotal: sub, fees: fee, total: add(sub, fee), count: items };
  }, [quantities, ticketTypes, currency, serviceFeeBps]);

  const perAccountLimit = event.policies.maxTicketsPerAccount;
  const overLimit = count > perAccountLimit;

  function setQuantity(ticketType: TicketType, next: number) {
    const available = availability[ticketType.id] ?? 0;
    const clamped = Math.max(0, Math.min(next, Math.min(ticketType.maxPerOrder, available)));
    setQuantities((current) => ({ ...current, [ticketType.id]: clamped }));
  }

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setStatus({ kind: "busy" });

    const lines = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Makes a double-submit safe end to end.
          "Idempotency-Key": `${event.id}:${email}:${JSON.stringify(lines)}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          lines,
          buyerEmail: email,
          buyerPhone: phone || undefined,
          method: "MPESA",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", message: payload?.error?.message ?? "Checkout failed" });
        return;
      }
      setStatus({ kind: "ok", message: payload.data.customerMessage });
    } catch {
      setStatus({ kind: "error", message: "We could not reach Bookit. Check your connection." });
    }
  }

  if (soldOut) {
    return (
      <div className="rounded-card-sm border border-line bg-surface-secondary p-4 text-center">
        <p className="text-sm font-medium text-ink">This event is sold out</p>
        <p className="mt-1 text-sm text-muted">
          Tickets sometimes reappear when holders resell them at face value. Turn on alerts and we
          will tell you.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" block>
          <BookitIcon name="bell" className="size-4" />
          Notify me
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Choose your tickets</legend>
        {ticketTypes.map((ticketType) => {
          const available = availability[ticketType.id] ?? 0;
          const quantity = quantities[ticketType.id] ?? 0;
          const exhausted = available === 0;

          return (
            <div
              key={ticketType.id}
              className={cn(
                "rounded-card-sm border p-3.5 transition-colors",
                quantity > 0 ? "border-primary bg-primary-tint/40" : "border-line",
                exhausted && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{ticketType.name}</p>
                  {ticketType.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {ticketType.description}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-sm font-semibold text-primary">
                    {formatPrice(ticketType.price)}
                  </p>
                </div>

                {exhausted ? (
                  <span className="shrink-0 text-xs font-medium text-muted">Sold out</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(ticketType, quantity - 1)}
                      disabled={quantity === 0}
                      aria-label={`Remove one ${ticketType.name}`}
                      className="flex size-8 items-center justify-center rounded-lg border border-line text-ink-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span
                      className="w-7 text-center text-sm font-semibold text-ink"
                      aria-live="polite"
                      aria-label={`${quantity} ${ticketType.name}`}
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(ticketType, quantity + 1)}
                      disabled={quantity >= Math.min(ticketType.maxPerOrder, available)}
                      aria-label={`Add one ${ticketType.name}`}
                      className="flex size-8 items-center justify-center rounded-lg border border-line text-ink-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {available > 0 && available <= 20 ? (
                <p className="mt-2 text-xs font-medium text-warning">
                  Only {available} left at this price
                </p>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      {count > 0 ? (
        <>
          <dl className="flex flex-col gap-1.5 rounded-card-sm bg-surface-secondary p-3.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-ink">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Service fee</dt>
              <dd className="text-ink">{formatPrice(fees)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="text-ink">{formatPrice(total)}</dd>
            </div>
          </dl>

          <Field label="Email address" htmlFor="buyer-email" required>
            <Input
              type="email"
              value={email}
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
              placeholder="you@example.co.ke"
              autoComplete="email"
              required
            />
          </Field>

          <Field
            label="M-PESA phone number"
            htmlFor="buyer-phone"
            hint="We will send an STK push to this number."
            required
          >
            <Input
              type="tel"
              value={phone}
              onChange={(changeEvent) => setPhone(changeEvent.target.value)}
              placeholder="0712 345 678"
              autoComplete="tel"
              required
            />
          </Field>
        </>
      ) : null}

      {overLimit ? (
        <p role="alert" className="text-sm font-medium text-error">
          This event allows a maximum of {perAccountLimit} tickets per account.
        </p>
      ) : null}

      <StatusMessage status={status} />

      <Button
        type="submit"
        size="lg"
        block
        disabled={count === 0 || overLimit || status.kind === "busy"}
      >
        {status.kind === "busy"
          ? "Starting checkout…"
          : count === 0
            ? "Select tickets"
            : `Pay ${formatPrice(total)}`}
      </Button>

      <p className="text-center text-xs text-muted">
        Seats are held for 10 minutes while you pay.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Bookings, RSVPs, invitations                                                */
/* -------------------------------------------------------------------------- */

type BookingMode = "RSVP" | "RESERVE" | "INVITE" | "TABLE" | "SERIES";

const MODE_COPY: Record<BookingMode, { cta: string; guestLabel: string; help: string }> = {
  RSVP: {
    cta: "Confirm RSVP",
    guestLabel: "How many people are coming?",
    help: "Free to attend. We will email your confirmation and a reminder before the event.",
  },
  RESERVE: {
    cta: "Reserve Spot",
    guestLabel: "How many people is this for?",
    help: "The organizer confirms reservations, usually within a day.",
  },
  INVITE: {
    cta: "Confirm attendance",
    guestLabel: "How many guests are you bringing?",
    help: "Enter the code on your invitation. Your invitation sets how many guests you may bring.",
  },
  TABLE: {
    cta: "Reserve Seats",
    guestLabel: "How many seats do you need?",
    help: "Seats are grouped into tables. The host assigns your table once you confirm.",
  },
  SERIES: {
    cta: "Confirm attendance",
    guestLabel: "Attending in person",
    help: "You are confirming for the next meeting in the series.",
  },
};

function BookingForm({
  event,
  remainingCapacity,
  tablesAvailable,
  mode,
}: BookingPanelProps & { mode: BookingMode }) {
  const copy = MODE_COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [inviteToken, setInviteToken] = useState("");
  const [mealChoice, setMealChoice] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const full = remainingCapacity !== null && remainingCapacity <= 0;

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setStatus({ kind: "busy" });

    try {
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          primaryGuestName: name,
          email: email || undefined,
          phone: phone || undefined,
          guestCount,
          inviteToken: inviteToken || undefined,
          mealChoice: mealChoice || undefined,
          notes: notes || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", message: payload?.error?.message ?? "We could not save that" });
        return;
      }
      setStatus({
        kind: "ok",
        message:
          payload.data.status === "WAITLISTED"
            ? `You are on the waitlist. Reference ${payload.data.reference} — we will email you if a place opens up.`
            : payload.data.status === "PENDING"
              ? `Request sent. Reference ${payload.data.reference} — the organizer will confirm shortly.`
              : `Confirmed. Your reference is ${payload.data.reference}.`,
      });
    } catch {
      setStatus({ kind: "error", message: "We could not reach Bookit. Check your connection." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === "INVITE" ? (
        <Field
          label="Invitation code"
          htmlFor="invite-code"
          hint="It is printed on your invitation."
          required
        >
          <Input
            value={inviteToken}
            onChange={(changeEvent) => setInviteToken(changeEvent.target.value)}
            placeholder="Enter your code"
            autoComplete="off"
            required
          />
        </Field>
      ) : null}

      <Field label="Full name" htmlFor="guest-name" required>
        <Input
          value={name}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          placeholder="Njeri Kamau"
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Email address" htmlFor="guest-email">
        <Input
          type="email"
          value={email}
          onChange={(changeEvent) => setEmail(changeEvent.target.value)}
          placeholder="you@example.co.ke"
          autoComplete="email"
        />
      </Field>

      <Field
        label="Phone number"
        htmlFor="guest-phone"
        hint="Give us at least one way to reach you."
      >
        <Input
          type="tel"
          value={phone}
          onChange={(changeEvent) => setPhone(changeEvent.target.value)}
          placeholder="0712 345 678"
          autoComplete="tel"
        />
      </Field>

      {mode !== "SERIES" ? (
        <Field label={copy.guestLabel} htmlFor="guest-count" required>
          <Input
            type="number"
            min={1}
            max={50}
            value={guestCount}
            onChange={(changeEvent) => setGuestCount(Number(changeEvent.target.value) || 1)}
            required
          />
        </Field>
      ) : null}

      {mode === "TABLE" ? (
        <Field
          label="Meal choice"
          htmlFor="meal-choice"
          hint={
            tablesAvailable !== null
              ? `${tablesAvailable} ${tablesAvailable === 1 ? "table has" : "tables have"} space left.`
              : undefined
          }
        >
          <Input
            value={mealChoice}
            onChange={(changeEvent) => setMealChoice(changeEvent.target.value)}
            placeholder="Chicken, beef, fish or vegetarian"
          />
        </Field>
      ) : null}

      {mode === "RESERVE" || mode === "TABLE" ? (
        <Field label="Anything the host should know?" htmlFor="booking-notes">
          <Textarea
            value={notes}
            onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            placeholder="Accessibility needs, arrival time, dietary requirements…"
            rows={3}
          />
        </Field>
      ) : null}

      {full ? (
        <p className="rounded-card-sm bg-warning-tint px-3 py-2.5 text-sm text-warning">
          This event is at capacity. You can still confirm — you will be added to the waitlist and
          promoted automatically if a place opens up.
        </p>
      ) : remainingCapacity !== null ? (
        <p className="text-xs text-muted">{remainingCapacity} places left</p>
      ) : null}

      <StatusMessage status={status} />

      <Button type="submit" size="lg" block disabled={status.kind === "busy"}>
        {status.kind === "busy" ? "Sending…" : copy.cta}
      </Button>

      <p className="text-center text-xs text-muted">{copy.help}</p>
    </form>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (status.kind === "ok") {
    return (
      <p
        role="status"
        className="rounded-card-sm border border-success/20 bg-success-tint px-3 py-2.5 text-sm text-success"
      >
        {status.message}
      </p>
    );
  }
  if (status.kind === "error") {
    return (
      <p
        role="alert"
        className="rounded-card-sm border border-error/20 bg-error-tint px-3 py-2.5 text-sm text-error"
      >
        {status.message}
      </p>
    );
  }
  return null;
}

export type { Money };
