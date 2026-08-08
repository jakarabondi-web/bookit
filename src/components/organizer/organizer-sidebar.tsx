"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  Receipt,
  ScanLine,
  Settings,
  Ticket,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/organizer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizer/events", label: "Events", icon: CalendarDays },
  { href: "/organizer/bookings", label: "Bookings", icon: Receipt },
  { href: "/organizer/guests", label: "Guest Lists", icon: UsersRound },
  { href: "/organizer/orders", label: "Orders", icon: Receipt },
  { href: "/organizer/tickets", label: "Tickets", icon: Ticket },
  { href: "/organizer/customers", label: "Customers", icon: Users },
  { href: "/organizer/marketing", label: "Marketing", icon: Megaphone },
  { href: "/organizer/checkin", label: "Check-In", icon: ScanLine },
  { href: "/organizer/finance", label: "Finance", icon: CreditCard },
  { href: "/organizer/payouts", label: "Payouts", icon: Wallet },
  { href: "/organizer/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/organizer/team", label: "Team", icon: Users },
  { href: "/organizer/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/organizer" ? pathname === "/organizer" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-tint text-primary-hover"
                  : "text-ink-secondary hover:bg-surface-secondary hover:text-ink",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Fixed sidebar on desktop, drawer below `lg`. */
export function OrganizerSidebar({ organizerName }: { organizerName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-[72px] max-h-[calc(100vh-72px)] overflow-y-auto p-4">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {organizerName}
          </p>
          <nav aria-label="Organizer">
            <NavList />
          </nav>
        </div>
      </aside>

      <div className="border-b border-line bg-surface px-4 py-3 sm:px-6 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink"
            >
              <Menu className="size-4" aria-hidden="true" />
              Organizer menu
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-5">
            <SheetTitle className="mb-1 text-base font-semibold text-ink">
              {organizerName}
            </SheetTitle>
            <p className="mb-5 text-xs text-muted">Organizer tools</p>
            <nav aria-label="Organizer">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
