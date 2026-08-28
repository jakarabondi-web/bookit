import { getContainer } from "@/server/container";
import { actorFor, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v1/transfers/:id — the sender calls off a pending transfer.
 *
 * This is not optional politeness: `initiateTransfer` suspends the ticket, so
 * without a cancel path a mistyped email would strand the ticket until the
 * 72-hour expiry. `cancelTransfer` restores it to ACTIVE and bumps the
 * credential version, so any QR issued in between stops scanning.
 */
export const DELETE = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const transfer = await getContainer().tickets.cancelTransfer(await actorFor(request), id);
    return ok({ id: transfer.id, status: transfer.status });
  },
);
