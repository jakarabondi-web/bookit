import { z } from "zod";
import { getContainer } from "@/server/container";
import { actorFor, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const CancelSchema = z.object({ reason: z.string().max(300).optional() });

/**
 * DELETE /api/v1/bookings/:id — the guest who made a booking withdraws it.
 *
 * A body is optional: the account page sends none, but the schema accepts an
 * optional `reason` for callers (e.g. a future "why are you cancelling"
 * prompt) that want to pass one along.
 */
export const DELETE = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    let reason: string | undefined;
    const raw = await request.text();
    if (raw) {
      const parsed = CancelSchema.parse(JSON.parse(raw));
      reason = parsed.reason;
    }

    const booking = await getContainer().bookings.cancelBooking(await actorFor(request), id, reason);
    return ok({ id: booking.id, status: booking.status });
  },
);
