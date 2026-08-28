import { z } from "zod";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { created, handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  eventId: z.string().min(1),
  label: z.string().min(1).max(80),
});

/** POST /api/v1/organizers/affiliate-links — create a trackable share link. */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, CreateSchema);
  const { promotions } = getContainer();
  const organizerId = await currentOrganizerId();

  const link = await promotions.createAffiliateLink(organizerId, input.eventId, {
    label: input.label,
  });

  return created(link);
});

/** GET /api/v1/organizers/affiliate-links — every link across your events. */
export const GET = handler(async () => {
  const links = await getContainer().promotions.listAffiliateLinks(await currentOrganizerId());
  return ok(links, { count: links.length });
});
