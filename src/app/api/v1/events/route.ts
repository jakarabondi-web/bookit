import { getContainer } from "@/server/container";
import { handler, ok, pagination } from "@/server/http/envelope";
import type { EventQuery } from "@/server/repositories/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/events — cursor-paginated, filterable event search. */
export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const { cursor, limit } = pagination(request);
  const { catalog } = getContainer();

  const query: EventQuery = {
    search: url.searchParams.get("q") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    types: url.searchParams.getAll("type").length
      ? url.searchParams.getAll("type")
      : undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    freeOnly: url.searchParams.get("free") === "true",
    cursor,
    limit,
  };

  const { items, nextCursor } = await catalog.search(query);

  return ok(
    items.map((summary) => ({
      id: summary.event.id,
      slug: summary.event.slug,
      title: summary.event.title,
      type: summary.event.type,
      status: summary.event.status,
      category: summary.event.category,
      startsAt: summary.event.startsAt,
      endsAt: summary.event.endsAt,
      image: summary.event.cardImage,
      organizer: { id: summary.organizer.id, name: summary.organizer.name },
      venue: { id: summary.venue.id, name: summary.venue.name, city: summary.venue.city },
      fromPrice: summary.fromPrice,
      soldOut: summary.soldOut,
      remainingCapacity: summary.remainingCapacity,
    })),
    { nextCursor, count: items.length },
  );
});
