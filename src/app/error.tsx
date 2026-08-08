"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * It shows what went wrong in general terms and offers a retry. The `digest` is
 * displayed so a user can quote it to support and we can find the matching
 * server-side log entry — the message itself never reaches the browser.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[bookit] route error", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-error-tint text-error">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-ink lg:text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-ink-secondary">
        This is our fault, not yours. Nothing you were part-way through has been charged — holds
        release automatically if a checkout does not complete.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <a href="/help/contact">Contact support</a>
        </Button>
      </div>
    </div>
  );
}
