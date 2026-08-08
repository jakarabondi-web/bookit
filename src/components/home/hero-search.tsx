"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
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
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { cn } from "@/lib/utils";

/** Filter pills below the hero search. `All Events` is active by default. */
const FILTERS = [
  { id: "all", label: "All Events", query: "" },
  { id: "paid", label: "Paid Events", query: "type=PAID_TICKET" },
  { id: "free", label: "Free / RSVP", query: "type=FREE_RSVP" },
  { id: "bookings", label: "Bookings", query: "view=bookings" },
  { id: "weekend", label: "This Weekend", query: "view=weekend" },
] as const;

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("city", city);
    const filter = FILTERS.find((entry) => entry.id === activeFilter);
    if (filter?.query) {
      for (const [key, value] of new URLSearchParams(filter.query)) params.set(key, value);
    }
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div>
      <form
        onSubmit={submit}
        role="search"
        aria-label="Search events"
        className="flex flex-col gap-2 rounded-[20px] border border-white/60 bg-surface p-2 shadow-[0_24px_60px_-16px_rgb(17_24_39_/_0.45)] sm:flex-row sm:items-center sm:gap-1"
      >
        <div className="relative flex-1">
          <BookitIcon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          />
          <label htmlFor="hero-search" className="sr-only">
            Search events, artists, venues or categories
          </label>
          <Input
            id="hero-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, artists or venues…"
            className="h-12 border-0 pl-11 text-base focus:ring-0 sm:h-13"
          />
        </div>

        {/* Hairline divider between the query and the city, desktop only. */}
        <span className="hidden h-7 w-px shrink-0 bg-line sm:block" aria-hidden="true" />

        <div className="flex gap-2 sm:gap-1">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger
              aria-label="City"
              className="h-12 w-full min-w-[9rem] gap-1.5 border-0 font-medium focus:ring-0 sm:h-13 sm:w-auto"
            >
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            size="lg"
            className="h-12 shrink-0 rounded-[14px] px-8 text-base shadow-[0_6px_16px_-4px_rgb(249_115_22_/_0.5)] sm:h-13"
          >
            Search
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick filters">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "rounded-pill border px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_rgb(249_115_22_/_0.5)]"
                  : "border-white/25 bg-white/10 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/20",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
