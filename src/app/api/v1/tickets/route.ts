import { getContainer } from "@/server/container";
import { actorFor, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/** GET /api/v1/tickets — tickets owned by the signed-in user. */
export const GET = handler(async (request: Request) => {
  const actor = await actorFor(request);
  const { catalog } = getContainer();
  const rows = await catalog.ticketsForUser(actor.userId ?? "");

  return ok(
    rows.map(({ ticket, event, venue, ticketType }) => ({
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      seatLabel: ticket.seatLabel,
      facePrice: ticket.facePrice,
      ticketType: ticketType?.name ?? null,
      event: { id: event.id, slug: event.slug, title: event.title, startsAt: event.startsAt },
      venue: { name: venue.name, city: venue.city },
    })),
    { count: rows.length },
  );
});
