"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Cancels a booking from the account area.
 *
 * Cancelling is destructive and, for a confirmed booking with a full
 * guest list, not something a stray click should do — so this opens a
 * confirmation dialog rather than firing the DELETE straight from the
 * card's button.
 */
export function CancelBookingButton({
  bookingId,
  eventTitle,
}: {
  bookingId: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmCancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/bookings/${bookingId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "Could not cancel that booking");
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
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-error hover:bg-error-tint"
        onClick={() => setOpen(true)}
      >
        Cancel Booking
      </Button>
      <Dialog open={open} onOpenChange={(next) => (busy ? null : setOpen(next))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              This withdraws your place at {eventTitle}. If the event has a waitlist, your spot
              goes to the next guest in line. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={confirmCancel} disabled={busy}>
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
