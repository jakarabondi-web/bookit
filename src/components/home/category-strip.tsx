import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { EventCategory } from "@/domain/enums";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";

interface CategoryEntry {
  label: string;
  href: string;
  icon: BookitIconName | "more";
}

const CATEGORIES: CategoryEntry[] = [
  { label: "Concerts", href: `/events?category=${EventCategory.CONCERTS}`, icon: "concerts" },
  { label: "Sports", href: `/events?category=${EventCategory.SPORTS}`, icon: "sports" },
  { label: "Comedy", href: `/events?category=${EventCategory.COMEDY}`, icon: "comedy" },
  {
    label: "Conferences",
    href: `/events?category=${EventCategory.CONFERENCES}`,
    icon: "conference",
  },
  { label: "Parties", href: `/events?category=${EventCategory.PARTIES}`, icon: "party" },
  { label: "Weddings", href: `/events?category=${EventCategory.WEDDINGS}`, icon: "wedding" },
  { label: "Meetings", href: `/events?category=${EventCategory.MEETINGS}`, icon: "meeting" },
  { label: "Community", href: `/events?category=${EventCategory.COMMUNITY}`, icon: "community" },
  { label: "More", href: "/events", icon: "more" },
];

function CategoryTile({ entry }: { entry: CategoryEntry }) {
  return (
    <Link
      href={entry.href}
      className="group flex w-[5.5rem] flex-col items-center gap-2 rounded-card-sm border border-line bg-surface px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-primary-tint sm:w-auto"
    >
      <span className="text-ink-secondary transition-colors group-hover:text-primary">
        {entry.icon === "more" ? (
          <LayoutGrid className="size-6" aria-hidden="true" />
        ) : (
          <BookitIcon name={entry.icon} />
        )}
      </span>
      <span className="text-xs font-medium text-ink">{entry.label}</span>
    </Link>
  );
}

/** One row on desktop, horizontal scroller on mobile. */
export function CategoryStrip() {
  return (
    <nav aria-label="Browse by category" className="page-shell py-8">
      <ul className="hidden gap-3 sm:grid sm:grid-cols-9">
        {CATEGORIES.map((entry) => (
          <li key={entry.label}>
            <CategoryTile entry={entry} />
          </li>
        ))}
      </ul>
      <ul className="scroll-rail sm:hidden">
        {CATEGORIES.map((entry) => (
          <li key={entry.label}>
            <CategoryTile entry={entry} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
