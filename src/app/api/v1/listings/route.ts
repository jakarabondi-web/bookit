import { z } from "zod";
import { money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { actorFor, created, handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const ListingSchema = z.object({
  ticketId: z.string().min(1),
  /** Minor units, so no floating-point money crosses the wire. */
  askPriceMinor: z.number().int().min(0),
});

/**
 * POST /api/v1/listings — list a ticket for resale.
 *
 * The markup cap, resale window, per-account listing limit and anti-flipping
 * checks all live in `ResaleService.createListing`. The client is told the cap
 * up front (see `CatalogService.ticketsForUser`) so this should rarely reject,
 * but the service remains the authority — the UI is not a security boundary.
 */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, ListingSchema);

  const listing = await getContainer().resale.createListing(await actorFor(request), {
    ticketId: input.ticketId,
    askPrice: money(input.askPriceMinor, "KES"),
  });

  return created({
    id: listing.id,
    ticketId: listing.ticketId,
    askPrice: listing.askPrice,
    facePrice: listing.facePrice,
    status: listing.status,
  });
});

/** GET /api/v1/listings — the signed-in user's own listings. */
export const GET = handler(async (request: Request) => {
  const actor = await actorFor(request);
  const listings = await getContainer().resale.listForSeller(actor.userId ?? "");
  return ok(listings, { count: listings.length });
});
