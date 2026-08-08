"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CITIES } from "@/lib/cities";

const LINKS = [
  { href: "/events?view=discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/bookings", label: "Bookings" },
  { href: "/venues", label: "Venues" },
  { href: "/organizer", label: "For Organizers" },
];

const ACCOUNT_LINKS = [
  { href: "/account/tickets", label: "My Tickets" },
  { href: "/account/bookings", label: "My Bookings" },
  { href: "/account/listings", label: "My Listings" },
  { href: "/account/profile", label: "Profile" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-surface-secondary"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="p-6">
        <SheetTitle className="mb-6 text-lg font-semibold text-ink">Menu</SheetTitle>

        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-base font-medium text-ink transition-colors hover:bg-surface-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr className="my-5 border-line" />

          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Your account
          </p>
          <ul className="flex flex-col gap-1">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr className="my-5 border-line" />

          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Cities
          </p>
          <ul className="flex flex-wrap gap-2 px-3">
            {CITIES.map((city) => (
              <li key={city}>
                <Link
                  href={`/events?city=${encodeURIComponent(city)}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex rounded-pill border border-line px-3 py-1.5 text-sm text-ink-secondary hover:border-primary hover:text-primary"
                >
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col gap-2">
          <Button asChild block>
            <Link href="/account" onClick={() => setOpen(false)}>
              Sign Up
            </Link>
          </Button>
          <Button variant="secondary" asChild block>
            <Link href="/account" onClick={() => setOpen(false)}>
              Log in
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
