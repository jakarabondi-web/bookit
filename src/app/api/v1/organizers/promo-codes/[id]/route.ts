import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/** PATCH /api/v1/organizers/promo-codes/:id — disable a code. */
export const PATCH = handler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const promo = await getContainer().promotions.disablePromoCode(
      await currentOrganizerId(),
      id,
    );
    return ok(promo);
  },
);
