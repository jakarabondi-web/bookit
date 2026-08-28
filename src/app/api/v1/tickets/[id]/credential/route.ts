import { getContainer } from "@/server/container";
import { actorFor, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/tickets/:id/credential — mints a fresh short-lived QR credential.
 *
 * The client re-requests this every few seconds while the QR is on screen. The
 * response is explicitly uncacheable: a cached credential is a replayable one.
 */
export const GET = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const { tickets } = getContainer();
    const credential = await tickets.issueCredential(await actorFor(request), id);

    const response = ok({
      token: credential.token,
      expiresAt: credential.expiresAt,
      ticketId: id,
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  },
);
