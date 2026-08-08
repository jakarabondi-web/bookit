import Link from "next/link";
import { Logo } from "./logo";
import { CITIES } from "@/lib/cities";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/events", label: "All events" },
      { href: "/events?type=PAID_TICKET", label: "Paid events" },
      { href: "/events?type=FREE_RSVP", label: "Free & RSVP" },
      { href: "/events?view=weekend", label: "This weekend" },
      { href: "/venues", label: "Venues" },
    ],
  },
  {
    title: "Book",
    links: [
      { href: "/bookings", label: "Make a booking" },
      { href: "/bookings?type=BANQUET", label: "Banquets & ceremonies" },
      { href: "/bookings?type=RECURRING_MEETING", label: "Recurring meetings" },
      { href: "/bookings?type=PRIVATE_INVITATION", label: "Private invitations" },
    ],
  },
  {
    title: "Organizers",
    links: [
      { href: "/organizer", label: "Organizer dashboard" },
      { href: "/organizer/events/new", label: "Create an event" },
      { href: "/organizer/events", label: "Manage events" },
      { href: "/organizer/finance", label: "Payouts & finance" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/help/refunds", label: "Refund policy" },
      { href: "/help/resale", label: "Verified resale" },
      { href: "/help/contact", label: "Contact us" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="page-shell py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Kenya&apos;s event platform for tickets, RSVPs, private invitations, bookings and
              banquets — with verified ticket ownership and resale.
            </p>
            <p className="mt-4 text-sm text-muted">
              Nairobi, Kenya ·{" "}
              <a href="mailto:hello@bookit.co.ke" className="text-primary hover:underline">
                hello@bookit.co.ke
              </a>
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 text-sm font-semibold text-ink">{column.title}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <h2 className="sr-only">Cities</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {CITIES.map((city) => (
              <li key={city}>
                <Link
                  href={`/events?city=${encodeURIComponent(city)}`}
                  className="text-sm text-muted transition-colors hover:text-primary"
                >
                  Events in {city}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Bookit. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/legal/terms" className="text-sm text-muted hover:text-primary">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="text-sm text-muted hover:text-primary">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="text-sm text-muted hover:text-primary">
                Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
