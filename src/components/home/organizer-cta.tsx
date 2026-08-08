import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrganizerPhoneIllustration } from "./booking-illustration";

const POINTS = [
  "Sell paid tickets, collect free RSVPs or take reservations — one dashboard for all of it.",
  "Guest lists with tables, meal choices, waitlists and CSV import/export.",
  "Fast check-in that keeps working when the venue Wi-Fi does not.",
  "Transparent settlement with a real ledger behind every shilling.",
];

export function OrganizerCta() {
  return (
    <section className="page-shell py-10">
      <div className="overflow-hidden rounded-hero border border-line bg-surface">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              For organizers
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink lg:text-3xl">
              Run your event on Bookit
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-secondary">
              Whether you are filling a stadium, hosting a ruracio or running a monthly chama
              meeting, Bookit gives you the tools built for that job — not a ticketing form bent
              into shape.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/organizer/events/new">Create an event</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/organizer">Open the dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center bg-gradient-to-br from-surface-secondary to-primary-tint/60 p-6">
            <OrganizerPhoneIllustration className="h-auto w-full max-w-[18rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}
