import { z } from "zod";
import { getContainer } from "@/server/container";
import { actorFor, created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const TransferSchema = z.object({
  toEmail: z.email("Enter the recipient's email address"),
});

/**
 * POST /api/v1/tickets/:id/transfers — hand a ticket to someone else.
 *
 * Ownership, event policy, resale conflicts and risk are all enforced by
 * `TicketService.initiateTransfer` inside a transaction; this route only
 * validates the shape of the request. The ticket is suspended while the
 * transfer is pending, which is why the response returns the transfer rather
 * than the ticket — the sender's next action is to wait or cancel.
 */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const { toEmail } = await parseBody(request, TransferSchema);

    const transfer = await getContainer().tickets.initiateTransfer(await actorFor(request), {
      ticketId: id,
      toEmail,
    });

    return created({
      id: transfer.id,
      ticketId: transfer.ticketId,
      toEmail: transfer.toEmail,
      status: transfer.status,
      expiresAt: transfer.expiresAt,
    });
  },
);
