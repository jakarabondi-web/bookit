import { existsSync } from "node:fs";
import path from "node:path";
import type { VenueId } from "@/domain/types";
import { venueImage } from "@/lib/venue-images";

/**
 * Server-side venue media resolution.
 *
 * Some venues have richer media on the way than the single card photo — the
 * Bomas International Convention Centre has official renders (exterior,
 * auditorium, boardroom, council chamber) that arrive as files under
 * `public/assets/images/`. Everything here is gated on the file actually
 * existing, so the code ships ahead of the assets: the moment
 * `npm run assets` emits a listed file, the card photo upgrades and the
 * "Inside the venue" gallery appears, with no further code change.
 */

interface GalleryEntry {
  /** Basename without extension, as emitted by scripts/prepare-assets.mjs. */
  base: string;
  caption: string;
}

/** Preferred card/hero image per venue, tried before the standing mapping. */
const PREFERRED_HERO: Partial<Record<string, string>> = {
  ven_bicc: "venue-bicc-exterior",
};

const GALLERY: Partial<Record<string, GalleryEntry[]>> = {
  ven_bicc: [
    { base: "venue-bicc-exterior", caption: "The convention complex from the gardens" },
    { base: "venue-bicc-auditorium", caption: "Main Auditorium" },
    { base: "venue-bicc-boardroom", caption: "Executive boardroom" },
    { base: "venue-bicc-council", caption: "Council chamber" },
  ],
};

const IMAGES_DIR = path.join(process.cwd(), "public/assets/images");

function published(base: string): boolean {
  return existsSync(path.join(IMAGES_DIR, `${base}.jpg`));
}

/** Card/hero photo for a venue — official media when present, else the standing mapping. */
export function venueHeroImage(venueId: VenueId): string {
  const preferred = PREFERRED_HERO[venueId];
  if (preferred && published(preferred)) return `/assets/images/${preferred}.jpg`;
  return venueImage(venueId);
}

/** Gallery images that actually exist on disk for this venue. */
export function venueGallery(venueId: VenueId): Array<{ src: string; caption: string }> {
  return (GALLERY[venueId] ?? [])
    .filter((entry) => published(entry.base))
    .map((entry) => ({ src: `/assets/images/${entry.base}.jpg`, caption: entry.caption }));
}
