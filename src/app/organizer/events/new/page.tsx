import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EventWizard } from "@/components/organizer/event-wizard";

export const metadata: Metadata = { title: "Create event" };

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Create an event</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Bookit adapts to what you are hosting. Tell us the kind of event and the rest of this
          form changes to match.
        </p>
      </div>

      <EventWizard />
    </div>
  );
}
