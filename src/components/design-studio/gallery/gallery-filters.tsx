import Link from "next/link";
import type { DesignDirection, EventKind } from "@/domain/design-studio/types";
import { cn } from "@/lib/utils";

/**
 * Gallery filters.
 *
 * Links rather than client state: the whole page stays a server component, a
 * filtered gallery is a shareable URL, and the back button behaves. The filter
 * set is deliberately short — a long row of pills is the dashboard look this
 * feature is meant to avoid.
 */

const DIRECTIONS: Array<{ id: DesignDirection; label: string }> = [
  { id: "editorial", label: "Editorial" },
  { id: "modern-luxury", label: "Modern luxury" },
  { id: "black-tie", label: "Black tie" },
  { id: "contemporary-african", label: "Contemporary African" },
  { id: "traditional", label: "Traditional" },
  { id: "botanical", label: "Botanical" },
  { id: "minimal", label: "Minimal" },
  { id: "architectural", label: "Architectural" },
  { id: "coastal", label: "Coastal" },
  { id: "regal", label: "Regal" },
  { id: "photography-led", label: "Photographic" },
];

const EVENTS: Array<{ id: EventKind; label: string }> = [
  { id: "wedding", label: "Wedding" },
  { id: "traditional-wedding", label: "Traditional" },
  { id: "ruracio", label: "Ruracio" },
  { id: "engagement", label: "Engagement" },
  { id: "birthday", label: "Birthday" },
  { id: "banquet", label: "Banquet" },
  { id: "corporate", label: "Corporate" },
  { id: "religious", label: "Religious" },
];

export interface GalleryFiltersProps {
  direction: DesignDirection | null;
  event: EventKind | null;
  query: string;
}

function href(params: Record<string, string | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const suffix = search.toString();
  return `/design${suffix ? `?${suffix}` : ""}#gallery`;
}

export function GalleryFilters({ direction, event, query }: GalleryFiltersProps) {
  return (
    <div className="mt-6 flex flex-col gap-4 border-y border-line py-5">
      <Row label="Style">
        <Chip href={href({ event, q: query })} active={!direction}>
          All
        </Chip>
        {DIRECTIONS.map((option) => (
          <Chip
            key={option.id}
            href={href({ direction: option.id, event, q: query })}
            active={direction === option.id}
          >
            {option.label}
          </Chip>
        ))}
      </Row>

      <Row label="Occasion">
        <Chip href={href({ direction, q: query })} active={!event}>
          All
        </Chip>
        {EVENTS.map((option) => (
          <Chip
            key={option.id}
            href={href({ direction, event: option.id, q: query })}
            active={event === option.id}
          >
            {option.label}
          </Chip>
        ))}
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-x-5 gap-y-2">{children}</div>
    </div>
  );
}

/**
 * Filters read as a line of type, not as buttons.
 *
 * A pill for every option is what makes a page look like an admin screen; an
 * underline on the active one says the same thing and leaves the gallery as
 * the only thing with weight on the page.
 */
function Chip({
  href: to,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "text-sm transition-colors",
        active
          ? "font-medium text-ink underline decoration-primary decoration-2 underline-offset-[6px]"
          : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
