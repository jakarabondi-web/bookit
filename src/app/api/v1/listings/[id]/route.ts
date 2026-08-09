import { getContainer } from "@/server/container";
import { actorFor, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v1/listings/:id — take a ticket back off the marketplace.
 *
 * Listing sets the ticket to LISTED, so a seller who changes their mind needs
 * this to get a usable ticket back. `cancelListing` restores it to ACTIVE.
 */
export const DELETE = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const listing = await getContainer().resale.cancelListing(actorFor(request), id);
    return ok({ id: listing.id, status: listing.status });
  },
);
