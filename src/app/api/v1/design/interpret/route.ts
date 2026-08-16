import { z } from "zod";
import { assistantAvailable, interpretWithModel } from "@/server/design/assistant";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
  design: z.object({
    template: z.string().max(80),
    collection: z.string().max(80),
    directions: z.array(z.string().max(40)).max(8),
    colourway: z.string().max(60),
    colourways: z.array(z.object({ id: z.string().max(64), name: z.string().max(60) })).max(12),
    typePairings: z
      .array(
        z.object({
          id: z.string().max(48),
          name: z.string().max(48),
          description: z.string().max(160),
        }),
      )
      .max(40),
    roles: z.array(z.string().max(24)).max(20),
    designerMode: z.boolean(),
  }),
  history: z
    .array(z.object({ prompt: z.string().max(500), reply: z.string().max(500) }))
    .max(6)
    .optional(),
});

/**
 * POST /api/v1/design/interpret
 *
 * The prompt console's escalation path, and only that. The console resolves the
 * design vocabulary in the browser; it reaches here for the sentences that
 * vocabulary cannot place.
 *
 * The route never touches a design. It returns operations for the client to
 * apply through the same engine, under the same Designer Mode rules, that a
 * locally-resolved prompt goes through — so the model's reach is exactly the
 * reach of a host typing a well-understood instruction, and no further.
 */
export const POST = handler(async (request: Request) => {
  const body = await parseBody(request, bodySchema);

  if (!assistantAvailable()) {
    return ok({ available: false, operations: [], reply: null });
  }

  const result = await interpretWithModel(body);
  if (!result) {
    return ok({ available: true, operations: [], reply: null });
  }

  return ok({ available: true, operations: result.operations, reply: result.reply });
});
