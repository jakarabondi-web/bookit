import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { BookingIllustration } from "./booking-illustration";

/**
 * "Make a Booking" panel.
 *
 * This is load-bearing for positioning: without it Bookit reads as a
 * concert-ticketing site. It sits directly under Popular Events so the
 * reservation capability is visible before a visitor scrolls.
 */
export function BookingCta() {
  return (
    <section className="page-shell py-8 lg:py-10">
      <div className="overflow-hidden rounded-hero border border-primary/15 bg-primary-tint">
        <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:p-10">
          <div>
            <h2 className="text-2xl font-bold text-ink lg:text-3xl">Make a Booking</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-secondary lg:text-base">
              Create reservations for meetings, banquets, ceremonies and private events. Manage
              your guest list, assign tables and track RSVPs in one place.
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {[
                { icon: "rsvp" as const, label: "Guest lists & RSVPs" },
                { icon: "seat" as const, label: "Table assignment" },
                { icon: "gift" as const, label: "Contributions" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-ink-secondary">
                  <BookitIcon name={item.icon} className="size-4 text-primary" />
                  {item.label}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-6">
              <Link href="/bookings">Create Booking</Link>
            </Button>
          </div>

          <div className="rounded-card-lg border border-white/60 bg-white/50 p-4">
            <BookingIllustration className="h-auto w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
