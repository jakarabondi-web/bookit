import { z } from "zod";
import { getContainer } from "@/server/container";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const RsvpSchema = z.object({
  attending: z.boolean(),
  guestCount: z.number().int().min(0).max(50),
  guestNames: z.array(z.string().min(1)).optional(),
  mealChoice: z.string().max(80).optional(),
  dietary: z.string().max(300).optional(),
  message: z.string().max(1000).optional(),
  songRequest: z.string().max(200).optional(),
  phone: z
    .string()
    .regex(/^(\+?254|0)\d{9}$/, "Enter a Kenyan phone number")
    .optional(),
  email: z.email("Enter a valid email address").optional(),
});

/**
 * POST /api/v1/invites/:token/rsvp
 *
 * The invitation token is the only credential. There is no session and no
 * event id in the body — the service resolves both from the token, so a guest
 * can only ever respond to their own invitation.
 */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ token: string }> }) => {
    const { token } = await context.params;
    const body = await parseBody(request, RsvpSchema);

    const result = await getContainer().privateEvents.respondToInvite(token, {
      attending: body.attending,
      guestCount: body.attending ? Math.max(1, body.guestCount) : 0,
      guestNames: body.guestNames,
      mealChoice: body.mealChoice,
      dietary: body.dietary,
      message: body.message,
      songRequest: body.songRequest,
      phone: body.phone,
      email: body.email,
    });

    const response = ok({
      status: result.status,
      reference: result.booking?.reference ?? null,
      guestCount: result.booking?.guestCount ?? 0,
    });
    // A guest's response must never be cached by a proxy.
    response.headers.set("Cache-Control", "no-store");
    return response;
  },
);
