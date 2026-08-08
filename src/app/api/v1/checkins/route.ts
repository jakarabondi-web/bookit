import { z } from "zod";
import { getContainer } from "@/server/container";
import { actorFor, handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const ScanSchema = z.union([
  z.object({
    mode: z.literal("credential"),
    eventId: z.string().min(1),
    credential: z.string().min(1),
    deviceId: z.string().optional(),
  }),
  z.object({
    mode: z.literal("booking"),
    eventId: z.string().min(1),
    reference: z.string().min(1),
    deviceId: z.string().optional(),
  }),
]);

/** POST /api/v1/checkins — admit a ticket by QR or a guest by booking reference. */
export const POST = handler(async (request: Request) => {
  const body = await parseBody(request, ScanSchema);
  const { checkin } = getContainer();
  const actor = actorFor(request);

  const result =
    body.mode === "credential"
      ? await checkin.scan(actor, {
          eventId: body.eventId,
          credential: body.credential,
          deviceId: body.deviceId,
        })
      : await checkin.checkInBooking(actor, {
          eventId: body.eventId,
          reference: body.reference,
          deviceId: body.deviceId,
        });

  return ok(result);
});
