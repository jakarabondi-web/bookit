import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { CheckinScanner } from "@/components/organizer/checkin-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Check-In" };

export default async function CheckInPage() {
  const { catalog } = getContainer();
  const events = await catalog.organizerEvents(DEMO_ORGANIZER_ID);

  const now = new Date().toISOString();
  const scannable = events
    .filter((summary) => summary.event.endsAt >= now && summary.event.status !== "CANCELLED")
    .map((summary) => ({ id: summary.event.id, title: summary.event.title }));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Check-In</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Admit ticket holders by QR or look guests up by booking reference. Every scan is atomic —
          two gates cannot admit the same ticket at the same moment.
        </p>
      </header>

      {scannable.length === 0 ? (
        <EmptyState
          title="No events to scan"
          description="Check-in opens for events that have not finished yet."
          action={{ label: "View events", href: "/organizer/events" }}
        />
      ) : (
        <CheckinScanner events={scannable} />
      )}

      <Card className="border-info/20 bg-info-tint/50">
        <CardContent className="flex items-start gap-3 p-5">
          <WifiOff className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-ink">If the venue Wi-Fi drops</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Registered scanner devices hold an encrypted, event-scoped validation package and
              keep admitting offline against a local consumed-set. Scans sync in batches when the
              connection returns; the earliest scan wins and later duplicates are flagged for
              review.
            </p>
            <p className="mt-2 text-sm text-ink-secondary">
              Two devices that are <em>both</em> fully offline can still admit the same code — no
              design prevents that. Bookit narrows the window with short credential lifetimes,
              per-gate device partitioning and aggressive sync, and the reconciliation report tells
              you exactly which codes were double-scanned.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
