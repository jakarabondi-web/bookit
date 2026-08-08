import Image from "next/image";
import Link from "next/link";
import { CITIES, CITY_IMAGE } from "@/lib/cities";
import { pluralise } from "@/lib/format";

export function CityExplorer({ counts }: { counts: Array<{ city: string; count: number }> }) {
  const countFor = (city: string) => counts.find((entry) => entry.city === city)?.count ?? 0;

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {CITIES.map((city) => (
        <li key={city}>
          <Link
            href={`/events?city=${encodeURIComponent(city)}`}
            className="group relative block aspect-[4/3] overflow-hidden rounded-card border border-line"
          >
            <Image
              src={CITY_IMAGE[city]}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="text-base font-semibold text-white">{city}</h3>
              <p className="text-xs text-white/80">{pluralise(countFor(city), "event")}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
