import {
  BOTANICAL_ATELIER,
  CONTEMPORARY_AFRICAN_WOVEN,
  EDITORIAL_IVORY,
  MIDNIGHT_GILDED,
  MODERN_MONOGRAM,
  SCULPTED_ARCH,
} from "./collection-a";
import {
  BLACK_WHITE_SOCIETY,
  CONTEMPORARY_AFRICAN_GEOMETRY,
  MINIMALIST_VOW,
  REGAL_CEREMONY,
  RURACIO_HERITAGE,
  SWAHILI_COAST,
} from "./collection-b";
import type { BookitTemplate, DesignDirection, EventKind } from "../types";

/**
 * The library.
 *
 * Twelve master designs, deliberately. The brief for this feature was explicit
 * that a hundred mediocre templates is worth less than twelve exceptional ones,
 * and these twelve are what the design language is argued from — the variant
 * system that scales them is only worth building once they hold up.
 */
export const TEMPLATES: BookitTemplate[] = [
  MIDNIGHT_GILDED,
  EDITORIAL_IVORY,
  BOTANICAL_ATELIER,
  MODERN_MONOGRAM,
  SCULPTED_ARCH,
  CONTEMPORARY_AFRICAN_WOVEN,
  CONTEMPORARY_AFRICAN_GEOMETRY,
  RURACIO_HERITAGE,
  SWAHILI_COAST,
  REGAL_CEREMONY,
  MINIMALIST_VOW,
  BLACK_WHITE_SOCIETY,
];

export function templateBySlug(slug: string): BookitTemplate | null {
  return TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function templateById(id: string | null | undefined): BookitTemplate {
  if (!id) return TEMPLATES[0]!;
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0]!;
}

/** Every collection represented in the library, in library order. */
export function collections(): string[] {
  return [...new Set(TEMPLATES.map((template) => template.collection))];
}

export interface TemplateFilter {
  direction?: DesignDirection | null;
  event?: EventKind | null;
  query?: string;
}

export function filterTemplates(filter: TemplateFilter): BookitTemplate[] {
  const needle = filter.query?.trim().toLowerCase();

  return TEMPLATES.filter((template) => {
    if (filter.direction && !template.directions.includes(filter.direction)) return false;
    if (filter.event && !template.events.includes(filter.event)) return false;
    if (!needle) return true;
    return (
      template.name.toLowerCase().includes(needle) ||
      template.collection.toLowerCase().includes(needle) ||
      template.tagline.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle) ||
      (template.culturalTags ?? []).some((tag) => tag.toLowerCase().includes(needle))
    );
  });
}

export {
  MIDNIGHT_GILDED,
  EDITORIAL_IVORY,
  BOTANICAL_ATELIER,
  MODERN_MONOGRAM,
  SCULPTED_ARCH,
  CONTEMPORARY_AFRICAN_WOVEN,
  CONTEMPORARY_AFRICAN_GEOMETRY,
  RURACIO_HERITAGE,
  SWAHILI_COAST,
  REGAL_CEREMONY,
  MINIMALIST_VOW,
  BLACK_WHITE_SOCIETY,
};
