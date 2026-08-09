"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Tag, Wallet } from "lucide-react";
import { TicketStatus } from "@/domain/enums";
import type { Money } from "@/domain/money";
import type {
  Event,
  ResaleListing,
  Ticket,
  TicketTransfer,
  TicketType,
  Venue,
} from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
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
import { formatDateTime, formatPrice } from "@/lib/format";

/**
 * Shown on controls whose flow is genuinely unbuilt. Transfer and resale are
 * now real; "Add to Wallet" needs Apple/Google pass signing, which is a
 * credentialed integration rather than a UI gap.
 */
const NOT_YET = "Not available yet";

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "error" | "neutral"> = {
  ACTIVE: "success",
  LISTED: "info",
  CHECKED_IN: "success",
  CONSUMED: "neutral",
  TRANSFERRED: "neutral",
  SOLD: "neutral",
  REFUNDED: "error",
  VOIDED: "error",
  CANCELLED: "error",
  SUSPENDED: "warning",
};

export interface TicketCardProps {
  ticket: Ticket;
  event: Event;
  venue: Venue;
  ticketType: TicketType | null;
  pendingTransfer?: TicketTransfer | null;
  activeListing?: ResaleListing | null;
  /** Face value plus the organizer's markup cap. */
  maxResalePrice?: Money;
  /** False when resale is off, or outside the organizer's window. */
  resaleOpen?: boolean;
}

export function TicketCard({
  ticket,
  event,
  venue,
  ticketType,
  pendingTransfer = null,
  activeListing = null,
  maxResalePrice,
  resaleOpen = false,
}: TicketCardProps) {
  const canAct = ticket.status === TicketStatus.ACTIVE;

  // The service layer rejects each of these too; mirroring the rules here just
  // keeps the UI from offering an action that is certain to fail.
  const canTransfer = canAct && event.policies.transferAllowed && !activeListing;
  const canSell = canAct && resaleOpen && Boolean(maxResalePrice) && !pendingTransfer;

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card-sm sm:aspect-square sm:w-32">
        <Image src={event.cardImage} alt="" fill sizes="128px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink">
              <Link href={`/events/${event.slug}`} className="hover:text-primary">
                {event.title}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {ticketType?.name ?? "Ticket"} · {ticket.code}
            </p>
          </div>
          <Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>
            {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase().replace("_", " ")}
          </Badge>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-secondary">
          <div>
            <dt className="sr-only">Date</dt>
            <dd>{formatDateTime(event.startsAt)}</dd>
          </div>
          <div>
            <dt className="sr-only">Venue</dt>
            <dd>
              <Link href={`/venues/${venue.id}`} className="hover:text-primary">
                {venue.name}
              </Link>
              , {venue.city}
            </dd>
          </div>
          {ticket.seatLabel ? (
            <div>
              <dt className="sr-only">Seat</dt>
              <dd className="font-medium text-ink">Seat {ticket.seatLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Price paid</dt>
            <dd>{formatPrice(ticket.facePrice)}</dd>
          </div>
        </dl>

        {/* In-flight state comes before the actions: someone whose ticket is
            suspended mid-transfer needs to know why it has no QR. */}
        {pendingTransfer ? (
          <PendingTransferNotice transfer={pendingTransfer} />
        ) : activeListing ? (
          <ActiveListingNotice listing={activeListing} />
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canAct ? (
            <QrDialog ticket={ticket} event={event} />
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/events/${event.slug}`}>View Event</Link>
          </Button>
          {canTransfer ? <TransferDialog ticket={ticket} event={event} /> : null}
          {canSell ? (
            <SellDialog ticket={ticket} event={event} maxResalePrice={maxResalePrice} />
          ) : null}
          {canAct ? (
            <Button size="sm" variant="ghost" disabled title={NOT_YET}>
              <Wallet className="size-4" />
              Add to Wallet
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * The QR dialog.
 *
 * The credential is fetched from the server, expires in seconds and is
 * re-fetched on a timer while the dialog is open. That is the whole point: a
 * screenshot of this dialog is worthless within a minute, and the code dies
 * instantly if the ticket changes hands.
 */
function QrDialog({ ticket, event }: { ticket: Ticket; event: Event }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/tickets/${ticket.id}/credential`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not refresh your code");
        return;
      }
      setToken(payload.data.token);
      setError(null);
      setSecondsLeft(
        Math.max(
          1,
          Math.round((new Date(payload.data.expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    } catch {
      setError("You appear to be offline. Your code will refresh when you reconnect.");
    }
  }, [ticket.id]);

  // The first fetch hangs off the open handler rather than an effect: it
  // answers the user opening the dialog, so it belongs with that event.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void refresh();
    },
    [refresh],
  );

  // While the dialog is open, count the credential down and replace it as it
  // expires.
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          void refresh();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, refresh]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <BookitIcon name="qr" className="size-4" />
          Show QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            Show this at the gate. It refreshes automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto flex aspect-square w-56 items-center justify-center rounded-card-lg border border-line bg-surface-secondary p-4">
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : token ? (
            <QrPlaceholder token={token} />
          ) : (
            <div className="skeleton size-full rounded-card-sm" />
          )}
        </div>

        <p className="mt-4 text-sm font-medium text-ink">{ticket.code}</p>
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {token ? `Refreshes in ${secondsLeft}s` : "Generating your code…"}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Screenshots will not scan. If you transfer or sell this ticket, this code stops working
          immediately.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders the credential as a deterministic block pattern.
 *
 * Bookit's scanners read the signed credential string, not this rendering — the
 * production build swaps this for a real QR encoder without any change to how
 * credentials are issued or verified.
 */
function QrPlaceholder({ token }: { token: string }) {
  const cells = 21;
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  const filled = Array.from({ length: cells * cells }, (_, index) => {
    const mixed = (hash ^ (index * 2654435761)) >>> 0;
    return ((mixed >>> (index % 16)) & 1) === 1;
  });

  return (
    <div
      className="grid size-full gap-px"
      style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }}
      role="img"
      aria-label="Ticket QR code"
    >
      {filled.map((on, index) => (
        <span
          key={index}
          className={on ? "bg-ink" : "bg-transparent"}
          style={{ aspectRatio: "1 / 1" }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Transfer                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Hands a ticket to someone else by email.
 *
 * The consequence is stated before the action, not after: transferring
 * suspends the ticket and kills the current QR, so a user who is about to walk
 * into a venue should understand that before they submit.
 */
function TransferDialog({ ticket, event }: { ticket: Ticket; event: Event }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/tickets/${ticket.id}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not start that transfer");
        return;
      }
      setOpen(false);
      setEmail("");
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <ArrowRightLeft className="size-4" />
          Transfer Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer this ticket</DialogTitle>
          <DialogDescription>
            {event.title} · {ticket.code}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <Field
            label="Recipient's email"
            htmlFor="transfer-email"
            hint="They get a link to accept. It expires in 72 hours."
          >
            <Input
              id="transfer-email"
              type="email"
              value={email}
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
              placeholder="friend@example.co.ke"
              autoComplete="email"
              required
            />
          </Field>

          <p className="rounded-card-sm border border-warning/25 bg-warning-tint p-3 text-xs leading-relaxed text-ink-secondary">
            Your QR code stops working as soon as you send this. If they do not accept, you can
            cancel and get the ticket back.
          </p>

          {error ? (
            <p role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A pending transfer, with the escape hatch — the ticket is suspended. */
function PendingTransferNotice({ transfer }: { transfer: TicketTransfer }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/transfers/${transfer.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Could not cancel that transfer");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-card-sm border border-info/25 bg-info-tint p-3">
      <p className="text-xs leading-relaxed text-ink-secondary">
        <span className="font-semibold text-ink">Waiting for {transfer.toEmail}</span> to accept.
        This ticket is on hold until they do, and the invitation expires{" "}
        {formatDateTime(transfer.expiresAt)}.
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
      <Button size="sm" variant="ghost" className="mt-1.5" onClick={cancel} disabled={busy}>
        {busy ? "Cancelling…" : "Cancel transfer and keep my ticket"}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resale                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Lists a ticket for resale.
 *
 * The organizer's price ceiling is shown and enforced in the input, because
 * "your price is too high" after the fact is a worse experience than never
 * being able to type it. The service still re-checks — this is convenience,
 * not trust.
 */
function SellDialog({
  ticket,
  event,
  maxResalePrice,
}: {
  ticket: Ticket;
  event: Event;
  maxResalePrice?: Money;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capMinor = maxResalePrice?.amount ?? ticket.facePrice.amount;
  const capMajor = capMinor / 100;
  const atFaceValueOnly = capMinor === ticket.facePrice.amount;

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          askPriceMinor: Math.round(Number(price) * 100),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not list that ticket");
        return;
      }
      setOpen(false);
      setPrice("");
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Tag className="size-4" />
          Sell Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List this ticket for resale</DialogTitle>
          <DialogDescription>
            {event.title} · {ticket.code}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <dl className="flex justify-between rounded-card-sm bg-surface-secondary p-3 text-sm">
            <dt className="text-muted">You paid</dt>
            <dd className="tabular font-medium text-ink">{formatPrice(ticket.facePrice)}</dd>
          </dl>

          <Field
            label="Your asking price"
            htmlFor="ask-price"
            hint={
              atFaceValueOnly
                ? `${event.organizerId ? "This organizer" : "The organizer"} caps resale at face value — ${formatPrice(ticket.facePrice)}.`
                : `Maximum ${formatPrice(maxResalePrice!)}, set by the organizer.`
            }
          >
            <Input
              id="ask-price"
              type="number"
              min="0"
              max={String(capMajor)}
              step="1"
              value={price}
              onChange={(changeEvent) => setPrice(changeEvent.target.value)}
              placeholder={String(capMajor)}
              required
            />
          </Field>

          <p className="rounded-card-sm border border-line bg-surface-secondary p-3 text-xs leading-relaxed text-muted">
            Your ticket is held while it is listed, so you cannot use it until you either sell it
            or take it off the market. The buyer gets a fresh QR; yours stops working.
          </p>

          {error ? (
            <p role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Listing…" : "List for resale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** An active listing, with the way back off the marketplace. */
function ActiveListingNotice({ listing }: { listing: ResaleListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/listings/${listing.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Could not cancel that listing");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-card-sm border border-primary/25 bg-primary-tint p-3">
      <p className="text-xs leading-relaxed text-ink-secondary">
        <span className="font-semibold text-ink">
          Listed for {formatPrice(listing.askPrice)}
        </span>{" "}
        on the resale marketplace. You cannot use this ticket while it is listed.
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
      <Button size="sm" variant="ghost" className="mt-1.5" onClick={cancel} disabled={busy}>
        {busy ? "Removing…" : "Remove from resale"}
      </Button>
    </div>
  );
}
