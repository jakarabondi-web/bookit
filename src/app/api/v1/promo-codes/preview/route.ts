import { z } from "zod";
import { money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const PreviewSchema = z.object({
  eventId: z.string().min(1),
  code: z.string().min(1),
  subtotalMinor: z.number().int().min(0),
});

/**
 * POST /api/v1/promo-codes/preview — public, no auth. Lets the checkout form
 * show a discount before the buyer pays. This never redeems: the buyer can
 * "Apply" a code as many times as they change their cart, and the real
 * redemption happens exactly once, atomically, inside checkout.
 */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, PreviewSchema);
  const { promotions } = getContainer();

  const applied = await promotions.preview({
    eventId: input.eventId,
    code: input.code,
    subtotal: money(input.subtotalMinor, "KES"),
  });

  return ok({ discount: applied.discount });
});
