import Link from "next/link";
import { Check } from "lucide-react";
import type { EventType } from "@/domain/enums";
import { EVENT_TYPE_BEHAVIOUR } from "@/domain/event-type-policy";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { cn } from "@/lib/utils";
import { BOOKING_KINDS } from "./booking-kinds";

/**
 * The five kinds of gathering, as a row of controls rather than a poster grid.
 *
 * These tiles used to be decorative — the page read `?type=` but nothing on it
 * could set the parameter. They are now the filter itself: plain links, so the
 * whole page stays a server component, the selection is shareable, and it
 * survives a refresh. Same convention as `/events`, where state lives in the
 * URL.
 */

export interface BookingKindFilterProps {
  selected: EventType | null;
  /** Where the tiles link to. The kind is appended as `?type=`. */
  basePath: string;
}

export function BookingKindFilter({ selected, basePath }: BookingKindFilterProps) {
  return (
    <div role="group" aria-label="Filter by kind of gathering">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-bold text-ink lg:text-2xl">Five kinds of gathering</h2>
        {selected ? (
          <Link
            href={basePath}
            className="text-sm font-medium text-primary hover:text-primary-hover hover:underline"
          >
            Show all kinds
          </Link>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BOOKING_KINDS.map(({ type, label, icon, examples }) => {
          const active = selected === type;
          return (
            <li key={type}>
              <Link
                href={active ? basePath : `${basePath}?type=${type}`}
                aria-pressed={active}
                className={cn(
                  // Not `transition-colors`: see the note in booking-register.
                  "flex h-full flex-col rounded-card border p-4 transition-[background-color,border-color]",
                  active
                    ? "border-primary bg-primary-tint"
                    : "border-line bg-surface hover:border-primary/40 hover:bg-surface-secondary",
                )}
              >
                <span className="flex items-center justify-between">
                  <BookitIcon
                    name={icon}
                    className={cn("size-5", active ? "text-primary" : "text-muted")}
                  />
                  {active ? (
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  ) : null}
                </span>

                <span
                  className={cn(
                    "mt-3 font-display text-sm font-bold",
                    active ? "text-primary-hover" : "text-ink",
                  )}
                >
                  {label}
                </span>

                <span className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                  {EVENT_TYPE_BEHAVIOUR[type].blurb}
                </span>

                <span className="mt-auto pt-3 text-[11px] leading-snug text-muted">
                  {examples}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
