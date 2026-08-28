import { z } from "zod";
import { money } from "@/domain/money";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { actorFor, created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const RequestPayoutSchema = z.object({
  amountMinor: z.number().int().positive(),
});

/**
 * POST /api/v1/organizers/payouts — draw down the available balance.
 *
 * The destination is not caller-supplied: the demo has no "change settlement
 * account" flow yet (that stays disabled in the UI, deliberately — see
 * `PayoutService.changePayoutDestination`), so every payout settles to the
 * account on file for this organizer's support contact.
 */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, RequestPayoutSchema);
  const { payouts, uow } = getContainer();

  const organizer = await uow.repos.organizers.findById(DEMO_ORGANIZER_ID);
  const destinationMasked = organizer
    ? `M-PESA •••• ${organizer.supportPhone.slice(-4)}`
    : "M-PESA on file";

  const payout = await payouts.requestPayout(await actorFor(request), {
    organizerId: DEMO_ORGANIZER_ID,
    amount: money(input.amountMinor, "KES"),
    destinationMasked,
  });

  return created({
    id: payout.id,
    status: payout.status,
    amount: payout.amount,
    destinationMasked: payout.destinationMasked,
    requestedAt: payout.requestedAt,
  });
});
