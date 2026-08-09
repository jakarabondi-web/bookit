"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Takes a listing back off the resale marketplace.
 *
 * Its own client component so the listings page can stay a server component —
 * only the button needs interactivity, not the table around it.
 */
export function CancelListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/listings/${listingId}`, { method: "DELETE" });
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
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={cancel}
        disabled={busy}
        className="text-error hover:bg-error-tint"
      >
        {busy ? "Cancelling…" : "Cancel listing"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
