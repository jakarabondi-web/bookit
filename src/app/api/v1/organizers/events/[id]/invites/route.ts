import { z } from "zod";
import { notFound } from "@/domain/errors";
import { currentOrganizerActor, getContainer } from "@/server/container";
import { addDays } from "@/server/lib/clock";
import { created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const IssueSchema = z.object({
  guests: z
    .array(
      z.object({
        name: z.string().min(2, "Enter the guest's name"),
        email: z.email("Enter a valid email address").optional(),
        phone: z.string().min(9).optional(),
        maxGuests: z.number().int().min(1).max(20).optional(),
      }),
    )
    .min(1)
    .max(500),
  /** Deliver the invitation immediately as well as returning the link. */
  send: z.boolean().optional(),
  expiresAt: z.iso.datetime().optional(),
});

/**
 * POST /api/v1/organizers/events/:id/invites
 *
 * Returns each raw invitation link exactly once. The link is derived from a
 * random token whose hash is all that is stored, so this response cannot be
 * reproduced later — the studio warns the host to copy them now.
 */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const body = await parseBody(request, IssueSchema);
    const container = getContainer();

    const event = await container.uow.repos.events.findById(id);
    if (!event) throw notFound("Event", id);

    const issued = await container.privateEvents.issueInvitations(
      currentOrganizerActor(event.organizerId),
      id,
      body.guests,
      {
        // Default: invitations stay valid until the day after the event.
        expiresAt: body.expiresAt ?? addDays(event.endsAt, 1),
        send: body.send,
      },
    );

    return created(issued);
  },
);
