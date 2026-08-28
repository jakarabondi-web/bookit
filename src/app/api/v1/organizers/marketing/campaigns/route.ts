import { z } from "zod";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { created, handler, ok, parseBody } from "@/server/http/envelope";
import { ALL_SEGMENTS } from "@/server/services/crm-service";

export const dynamic = "force-dynamic";

const CampaignSchema = z.object({
  segments: z.array(z.enum(ALL_SEGMENTS as [string, ...string[]])).min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  subject: z.string().min(1, "Give your message a subject").max(150),
  body: z.string().min(1, "Write something to send").max(4000),
});

/** POST /api/v1/organizers/marketing/campaigns — message a CRM segment. */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, CampaignSchema);
  const { marketing } = getContainer();

  const { campaign, skipped } = await marketing.createCampaign(
    await currentOrganizerId(),
    input,
  );

  return created({
    id: campaign.id,
    recipientCount: campaign.recipientCount,
    skipped,
    sentAt: campaign.sentAt,
  });
});

/** GET /api/v1/organizers/marketing/campaigns — send history. */
export const GET = handler(async () => {
  const campaigns = await getContainer().marketing.listCampaigns(await currentOrganizerId());
  return ok(campaigns, { count: campaigns.length });
});
