"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { EventCategory, EventType } from "@/domain/enums";
import { EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

const ANY = "__any__";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  CONCERTS: "Concerts",
  SPORTS: "Sports",
  COMEDY: "Comedy",
  CONFERENCES: "Conferences",
  PARTIES: "Parties",
  WEDDINGS: "Weddings",
  MEETINGS: "Meetings",
  COMMUNITY: "Community",
};

const QUICK_VIEWS = [
  { id: "", label: "All Events" },
  { id: "weekend", label: "This Weekend" },
  { id: "free", label: "Free / RSVP" },
  { id: "bookings", label: "Bookings" },
] as const;

/**
 * Search and filter controls for `/events`.
 *
 * State lives entirely in the URL so results are shareable, survive a refresh
 * and can be rendered on the server.
 */
export function EventFilters({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const push = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      next.delete("cursor");
      const search = next.toString();
      router.push(search ? `${pathname}?${search}` : pathname);
    },
    [params, pathname, router],
  );

  const setParam = (key: string, value: string | null) =>
    push((next) => {
      if (value === null || value === "" || value === ANY) next.delete(key);
      else next.set(key, value);
    });

  const activeView = params.get("view") ?? (params.get("type") === EventType.FREE_RSVP ? "free" : "");
  const hasFilters = ["q", "city", "category", "type", "view"].some((key) => params.get(key));

  function submit(event: FormEvent) {
    event.preventDefault();
    setParam("q", query.trim() || null);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        role="search"
        aria-label="Filter events"
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <div className="relative flex-1">
          <BookitIcon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted"
          />
          <label htmlFor="events-search" className="sr-only">
            Search events
          </label>
          <Input
            id="events-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, artists, venues or categories..."
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex lg:w-auto">
          <Select
            value={params.get("city") ?? ANY}
            onValueChange={(value) => setParam("city", value)}
          >
            <SelectTrigger aria-label="City" className="lg:w-40">
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All cities</SelectItem>
              {CITIES.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.get("category") ?? ANY}
            onValueChange={(value) => setParam("category", value)}
          >
            <SelectTrigger aria-label="Category" className="lg:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All categories</SelectItem>
              {Object.values(EventCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.get("type") ?? ANY}
            onValueChange={(value) => setParam("type", value)}
          >
            <SelectTrigger aria-label="Event type" className="lg:w-48">
              <SelectValue placeholder="All event types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All event types</SelectItem>
              {Object.values(EventType).map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" className="lg:px-8">
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick views">
          {QUICK_VIEWS.map((view) => {
            const active = activeView === view.id;
            return (
              <button
                key={view.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  push((next) => {
                    next.delete("view");
                    next.delete("type");
                    if (view.id === "free") next.set("type", EventType.FREE_RSVP);
                    else if (view.id) next.set("view", view.id);
                  })
                }
                className={cn(
                  "rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-primary",
                )}
              >
                {view.label}
              </button>
            );
          })}
        </div>

        <p className="ml-auto text-sm text-muted" aria-live="polite">
          {resultCount} {resultCount === 1 ? "event" : "events"}
          {hasFilters ? (
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="ml-3 font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </p>
      </div>
    </div>
  );
}
