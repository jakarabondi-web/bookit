import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Logo } from "./logo";
import { LocationSelector } from "./location-selector";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/events?view=discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/bookings", label: "Bookings" },
  { href: "/venues", label: "Venues" },
  { href: "/organizer", label: "For Organizers" },
] as const;

/** Sticky header, ~72px on desktop. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="page-shell flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LocationSelector />
          <Link
            href="/account/bookings"
            className="relative rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink"
            aria-label="Your booking basket"
          >
            <ShoppingBag className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/account">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/account">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile: logo, search, cart/profile, hamburger. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href="/events"
            className="rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-surface-secondary"
            aria-label="Search events"
          >
            <BookitIcon name="search" className="size-5" />
          </Link>
          <Link
            href="/account"
            className="rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-surface-secondary"
            aria-label="Your account"
          >
            <BookitIcon name="user" className="size-5" />
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
