import { notFound } from "@/domain/errors";
import { currentOrganizerActor, getContainer } from "@/server/container";
import { handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/organizers/events/:id/private-page
 *
 * The body is the page document. It is not validated field-by-field with Zod
 * because it is a large nested content object the host owns outright; the
 * service enforces the parts that matter — that the caller owns the event and
 * that the event is genuinely private.
 */
export const PATCH = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const container = getContainer();

    const event = await container.uow.repos.events.findById(id);
    if (!event) throw notFound("Event", id);

    const body = (await request.json()) as Record<string, unknown>;
    // `eventId` and `updatedAt` are set by the service, never by the client.
    delete body.eventId;
    delete body.updatedAt;

    const saved = await container.privateEvents.savePage(
      currentOrganizerActor(event.organizerId),
      id,
      body,
    );

    return ok({ updatedAt: saved.updatedAt, themeId: saved.themeId });
  },
);
