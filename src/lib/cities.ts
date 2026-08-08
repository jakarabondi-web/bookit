/** Cities Bookit operates in, in the order they appear across the UI. */
export const CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] as const;

export type City = (typeof CITIES)[number];

export const DEFAULT_CITY: City = "Nairobi";

/** Hero image used on each city card in "Explore by City". */
export const CITY_IMAGE: Record<City, string> = {
  Nairobi: "/assets/images/city-nairobi.jpg",
  Mombasa: "/assets/images/hero-concert.jpg",
  Kisumu: "/assets/images/event-football.jpg",
  Nakuru: "/assets/images/event-conference.jpg",
  Eldoret: "/assets/images/event-dinner.jpg",
};
