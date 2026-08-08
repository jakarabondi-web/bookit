import { z } from "zod";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
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

  const link = await promotions.createAffiliateLink(DEMO_ORGANIZER_ID, input.eventId, {
    label: input.label,
  });

  return created(link);
});

/** GET /api/v1/organizers/affiliate-links — every link across your events. */
export const GET = handler(async () => {
  const links = await getContainer().promotions.listAffiliateLinks(DEMO_ORGANIZER_ID);
  return ok(links, { count: links.length });
});
