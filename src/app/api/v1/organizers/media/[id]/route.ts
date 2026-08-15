import { currentOrganizerActor, getContainer } from "@/server/container";
import { handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v1/organizers/media/:id
 *
 * Removes the asset and its bytes. Ownership is checked in the service, so a
 * guessed id belonging to another organizer is a 403 rather than a deletion.
 *
 * Nothing rewrites pages that referenced the image: a private page is a content
 * document the host owns, and silently editing it from a delete would be a
 * surprise. The studio's own preview shows a missing image immediately.
 */
export const DELETE = handler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    await getContainer().media.remove(currentOrganizerActor(), id);
    return ok({ id, deleted: true });
  },
);
