import { notFound } from "@/domain/errors";
import { behaviourFor } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/** GET /api/v1/events/:slug */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const { catalog } = getContainer();
    const detail = await catalog.getBySlug(slug);
    if (!detail) throw notFound("Event", slug);

    return ok({
      event: detail.event,
      behaviour: behaviourFor(detail.event.type),
      organizer: detail.organizer,
      venue: detail.venue,
      ticketTypes: detail.ticketTypes,
      occurrences: detail.occurrences,
      fromPrice: detail.fromPrice,
      soldOut: detail.soldOut,
      remainingCapacity: detail.remainingCapacity,
      tablesAvailable: detail.tablesAvailable,
      resaleListings: detail.resaleListings.map((listing) => ({
        id: listing.id,
        askPrice: listing.askPrice,
        facePrice: listing.facePrice,
      })),
    });
  },
);
