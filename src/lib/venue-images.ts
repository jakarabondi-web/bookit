import type { VenueId } from "@/domain/types";

/**
 * Photography for venue cards.
 *
 * Venues do not carry an image column — imagery is presentation, not domain
 * data, and the photo for a venue changes with the design, not with the
 * database. The mapping lives here instead, keyed by venue id, exactly like
 * `CITY_IMAGE` in `lib/cities.ts`.
 *
 * KICC Grounds reuses the Nairobi skyline photograph deliberately: the tower
 * in that frame is the venue's landmark, and no generic "grounds" photo says
 * CBD the way the skyline does.
 */
const VENUE_IMAGE: Record<string, string> = {
  ven_nyayo: "/assets/images/venue-stadium-bowl.jpg",
  ven_kasarani: "/assets/images/venue-stadium-aerial.jpg",
  ven_kasarani_indoor: "/assets/images/venue-arena.jpg",
  ven_kicc: "/assets/images/city-nairobi.jpg",
  ven_uhuru: "/assets/images/venue-gardens.jpg",
  ven_sarit: "/assets/images/venue-expo.jpg",
  ven_safari_park: "/assets/images/venue-ballroom.jpg",
  ven_kiambu_home: "/assets/images/venue-homestead.jpg",
  ven_mombasa_beach: "/assets/images/venue-beach.jpg",
  ven_kisumu: "/assets/images/venue-sports-ground.jpg",
  ven_nakuru: "/assets/images/venue-club-lawn.jpg",
  ven_eldoret: "/assets/images/venue-fairway.jpg",
  ven_westlands_office: "/assets/images/venue-boardroom.jpg",
};

/** Fallback for venues created after seeding, until they get a photo here. */
const DEFAULT_VENUE_IMAGE = "/assets/images/venue-gardens.jpg";

export function venueImage(id: VenueId): string {
  return VENUE_IMAGE[id] ?? DEFAULT_VENUE_IMAGE;
}
