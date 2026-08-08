"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tickets", label: "My Tickets" },
  { href: "/account/bookings", label: "My Bookings" },
  { href: "/account/listings", label: "My Listings" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account">
      <ul className="scroll-rail sm:flex sm:flex-wrap sm:gap-2 sm:overflow-visible">
        {LINKS.map((link) => {
          const active =
            link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex whitespace-nowrap rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
