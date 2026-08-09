"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Tag, Wallet } from "lucide-react";
import { TicketStatus } from "@/domain/enums";
import type { Event, Ticket, TicketType, Venue } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime, formatPrice } from "@/lib/format";

/**
 * Shown on controls whose service layer exists but whose flow is unbuilt.
 * `TicketService.initiateTransfer` and `ResaleService` are both real, but
 * neither has an API route or UI yet — so these are disabled rather than
 * live-looking and inert.
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
}

export function TicketCard({ ticket, event, venue, ticketType }: TicketCardProps) {
  const canAct = ticket.status === TicketStatus.ACTIVE;

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

        <div className="mt-4 flex flex-wrap gap-2">
          {canAct ? (
            <QrDialog ticket={ticket} event={event} />
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/events/${event.slug}`}>View Event</Link>
          </Button>
          {canAct && event.policies.transferAllowed ? (
            <Button size="sm" variant="ghost" disabled title={NOT_YET}>
              <ArrowRightLeft className="size-4" />
              Transfer Ticket
            </Button>
          ) : null}
          {canAct && event.policies.resaleEnabled ? (
            <Button size="sm" variant="ghost" disabled title={NOT_YET}>
              <Tag className="size-4" />
              Sell Ticket
            </Button>
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
