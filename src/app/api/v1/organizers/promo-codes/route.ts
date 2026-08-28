import { z } from "zod";
import { money } from "@/domain/money";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { created, handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  eventId: z.string().min(1),
  code: z.string().min(3).max(24),
  kind: z.enum(["PERCENT", "FIXED"]),
  percentBps: z.number().int().min(1).max(10_000).optional(),
  fixedAmountMinor: z.number().int().min(1).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  endsAt: z.string().optional(),
});

/** POST /api/v1/organizers/promo-codes — create a code for one of your events. */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, CreateSchema);
  const { promotions } = getContainer();
  const organizerId = await currentOrganizerId();

  const promo = await promotions.createPromoCode(organizerId, input.eventId, {
    code: input.code,
    kind: input.kind,
    percentBps: input.percentBps,
    fixedAmount:
      input.kind === "FIXED" && input.fixedAmountMinor
        ? money(input.fixedAmountMinor, "KES")
        : undefined,
    maxRedemptions: input.maxRedemptions ?? null,
    endsAt: input.endsAt ?? null,
  });

  return created(promo);
});

/** GET /api/v1/organizers/promo-codes — every code across your events. */
export const GET = handler(async () => {
  const codes = await getContainer().promotions.listPromoCodes(await currentOrganizerId());
  return ok(codes, { count: codes.length });
});
