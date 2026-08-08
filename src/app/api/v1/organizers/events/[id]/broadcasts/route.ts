import { z } from "zod";
import { notFound } from "@/domain/errors";
import { currentOrganizerActor, getContainer } from "@/server/container";
import { created, handler, ok } from "@/server/http/envelope";
import { parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const BroadcastSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  audience: z.enum([
    "ALL",
    "CONFIRMED",
    "PENDING",
    "DECLINED",
    "NOT_RESPONDED",
    "WAITLISTED",
  ]),
  subject: z.string().min(1, "Give your message a subject").max(150),
  body: z.string().min(1, "Write something to send").max(4000),
});

/** POST /api/v1/organizers/events/:id/broadcasts — message a guest segment. */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const input = await parseBody(request, BroadcastSchema);
    const container = getContainer();

    const event = await container.uow.repos.events.findById(id);
    if (!event) throw notFound("Event", id);

    const broadcast = await container.privateEvents.sendBroadcast(
      currentOrganizerActor(event.organizerId),
      id,
      input,
    );

    return created({
      id: broadcast.id,
      recipientCount: broadcast.recipientCount,
      sentAt: broadcast.sentAt,
    });
  },
);

/** GET /api/v1/organizers/events/:id/broadcasts */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const broadcasts = await getContainer().privateEvents.listBroadcasts(id);
    return ok(broadcasts, { count: broadcasts.length });
  },
);
