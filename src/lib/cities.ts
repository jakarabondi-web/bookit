/** Cities Bookit operates in, in the order they appear across the UI. */
export const CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] as const;

export type City = (typeof CITIES)[number];

export const DEFAULT_CITY: City = "Nairobi";

/**
 * Hero image used on each city card in "Explore by City". Each photo says
 * something true about the city — the skyline for Nairobi, the beach for
 * Mombasa, each town's own ground for the rest — never a generic crowd.
 */
export const CITY_IMAGE: Record<City, string> = {
  Nairobi: "/assets/images/city-nairobi.jpg",
  Mombasa: "/assets/images/venue-beach.jpg",
  Kisumu: "/assets/images/venue-sports-ground.jpg",
  Nakuru: "/assets/images/venue-club-lawn.jpg",
  Eldoret: "/assets/images/venue-fairway.jpg",
};
