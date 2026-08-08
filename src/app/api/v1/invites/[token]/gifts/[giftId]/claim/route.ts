import { z } from "zod";
import { money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const ClaimSchema = z.object({
  /** Number of an item gift being claimed. */
  quantity: z.number().int().min(1).max(10).optional(),
  /** Minor units pledged towards a cash fund. */
  amount: z.number().int().min(1).optional(),
  message: z.string().max(500).optional(),
  anonymous: z.boolean().optional(),
});

/**
 * POST /api/v1/invites/:token/gifts/:giftId/claim
 *
 * Claiming decrements the remaining count inside a transaction, so two guests
 * clicking "I'll get this" at the same moment cannot both claim the last one.
 */
export const POST = handler(
  async (
    request: Request,
    context: { params: Promise<{ token: string; giftId: string }> },
  ) => {
    const { token, giftId } = await context.params;
    const body = await parseBody(request, ClaimSchema);

    const claim = await getContainer().privateEvents.claimGift(token, {
      giftId,
      quantity: body.quantity,
      amount: body.amount ? money(body.amount, "KES") : undefined,
      message: body.message,
      anonymous: body.anonymous,
    });

    return created({
      id: claim.id,
      giftId: claim.giftId,
      quantity: claim.quantity,
      amount: claim.amount,
    });
  },
);
