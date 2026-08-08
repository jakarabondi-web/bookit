"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";

/** City switcher in the header. Changing it filters the events listing. */
export function LocationSelector({ className }: { className?: string }) {
  const router = useRouter();
  const [city, setCity] = useState<string>(DEFAULT_CITY);

  return (
    <Select
      value={city}
      onValueChange={(next) => {
        setCity(next);
        router.push(`/events?city=${encodeURIComponent(next)}`);
      }}
    >
      <SelectTrigger
        aria-label="Choose your city"
        className={className ?? "h-10 w-auto min-w-[9.5rem] gap-1.5 border-line"}
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
  );
}
