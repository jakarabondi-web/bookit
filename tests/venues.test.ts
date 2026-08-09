import { describe, expect, it } from "vitest";
import { EventVisibility } from "@/domain/enums";
import { createContainer } from "@/server/container";
import { freshContainer } from "./helpers";

/**
 * Venue pages are a discovery surface, so the interesting cases are about what
 * they must *not* show, plus the regression that started this: venue cards
 * used to link to `/events?city=…`, so clicking a venue produced a city-wide
 * event list and looked like the click had done nothing.
 *
 * These use the seeded container rather than `freshContainer` because the
 * point is the real demo dataset — including a private event that has to stay
 * hidden.
 */
const seeded = () => createContainer();

describe("venue detail", () => {
  it("returns null for an unknown venue, so the route 404s", async () => {
    expect(await freshContainer().catalog.venueDetail("ven_nope")).toBeNull();
  });

  it("lists only events held at that venue", async () => {
    const detail = await seeded().catalog.venueDetail("ven_bicc");

    expect(detail).not.toBeNull();
    expect(detail!.venue.name).toBe("Bomas International Convention Centre");

    const all = [...detail!.upcoming, ...detail!.past];
    expect(all.length).toBeGreaterThan(0);
    for (const entry of all) expect(entry.event.venueId).toBe("ven_bicc");
  });

  it("never exposes a private event on a venue's public page", async () => {
    const container = seeded();

    // The wedding reception at Safari Park is INVITE_LINK_REQUIRED — it has no
    // public event page, which is exactly why linking to one 404'd.
    const wedding = await container.uow.repos.events.findById("evt_wedding");
    expect(wedding).not.toBeNull();
    expect(wedding!.visibility).not.toBe(EventVisibility.PUBLIC);

    const detail = await container.catalog.venueDetail(wedding!.venueId);
    const all = [...detail!.upcoming, ...detail!.past];

    expect(all.some((entry) => entry.event.id === "evt_wedding")).toBe(false);
    for (const entry of all) {
      expect(entry.event.visibility).toBe(EventVisibility.PUBLIC);
    }
  });

  it("splits events into upcoming and past by end time", async () => {
    const container = seeded();
    const now = new Date().toISOString();

    for (const venueId of ["ven_kicc", "ven_nyayo", "ven_sarit"]) {
      const detail = await container.catalog.venueDetail(venueId);
      if (!detail) continue;
      for (const entry of detail.upcoming) expect(entry.event.endsAt >= now).toBe(true);
      for (const entry of detail.past) expect(entry.event.endsAt < now).toBe(true);
    }
  });

  it("finds a venue page for every seeded venue, so no card can link to a 404", async () => {
    const container = seeded();
    const venues = await container.uow.repos.venues.list();

    expect(venues.length).toBeGreaterThan(0);
    for (const venue of venues) {
      expect(await container.catalog.venueDetail(venue.id)).not.toBeNull();
    }
  });
});
