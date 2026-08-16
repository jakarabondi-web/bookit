import {
  assistantReplySchema,
  operationsSchema,
  type AssistantReply,
} from "@/domain/design-studio/operation-schema";
import { KNOWN_MOTIFS, KNOWN_ORNAMENTS } from "@/domain/design-studio/prompting";
import { config } from "@/server/config";

/**
 * The model escalation.
 *
 * The studio's prompt console is not built on a model — it resolves a design
 * vocabulary locally, instantly and free. This is the fallback for the sentence
 * that vocabulary cannot place: "make it feel like the coast at dusk", "my
 * mother thinks it's too loud".
 *
 * The model is given no ability to edit anything. It is asked to choose from
 * the same closed operation set the console already uses, its answer is
 * validated against that schema, and the operations are then applied by the
 * same design engine with the same Designer Mode rules. A hallucinated motif
 * fails validation; an instruction the rules forbid is refused on application
 * exactly as it would be if a host had typed it. The worst outcome is no change
 * and a sentence saying so.
 */

export interface AssistantRequest {
  prompt: string;
  /** What the host is looking at, in as few tokens as it can be described. */
  design: {
    template: string;
    collection: string;
    directions: string[];
    colourway: string;
    colourways: { id: string; name: string }[];
    typePairings: { id: string; name: string; description: string }[];
    roles: string[];
    designerMode: boolean;
  };
  /** Earlier turns, so "a bit less" means something. */
  history?: { prompt: string; reply: string }[];
}

const SYSTEM = `You are the design assistant inside Bookit Design Studio, a premium invitation studio for weddings, traditional ceremonies and private events in Kenya.

A host describes what they want in ordinary language. You translate it into design operations. You do not write copy, you do not have opinions about the event, and you never edit anything directly — you choose operations and the studio applies them under its own design rules.

Principles:
- Restraint. One instruction is usually one to three operations. A host asking for "warmer" does not want the type changed as well.
- Work from the designer's colourway rather than inventing colour. The colour operations nudge; they do not replace.
- Print finishes belong on the names, the heading or the monogram. Never on body text.
- Cultural references are interpretations, never claims of ceremonial authenticity. Never describe a design as authentic, traditional-accurate, or as belonging to a community.
- If an instruction is about content rather than design ("change the venue"), return no operations and say the details panel is where that lives.
- If you genuinely cannot map the request, return no operations and ask one short question.

Your reply is one sentence, in the voice of a stationer talking to a client: plain, specific, unhurried. No exclamation marks, no "Great choice!", no emoji.`;

const TOOL = {
  name: "apply_design_changes",
  description: "Apply a set of design operations to the host's invitation and explain them.",
  input_schema: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        maxItems: 6,
        description: "The changes to make, in order. Empty when the request cannot be mapped.",
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: [
                "palette",
                "colour",
                "type",
                "scale",
                "tracking",
                "case",
                "effect",
                "align",
                "space",
                "visibility",
                "pattern",
                "ornament",
                "monogram",
                "photo",
                "paper",
                "content",
              ],
            },
            paletteId: { type: "string", description: "For kind=palette. An id from colourways." },
            move: {
              type: "string",
              enum: ["warmer", "cooler", "deeper", "lighter", "softer", "richer", "invert"],
              description: "For kind=colour.",
            },
            pairingId: { type: "string", description: "For kind=type. An id from typePairings." },
            role: {
              type: "string",
              enum: [
                "names",
                "joiner",
                "occasion",
                "hosts",
                "date",
                "venue",
                "detail",
                "rsvp",
                "monogram",
                "ornament",
                "pattern",
                "photo",
                "frame",
                "divider",
              ],
              description: "Which part of the design the change applies to.",
            },
            factor: { type: "number", description: "For kind=scale (0.5–2) or kind=space (0.8–1.25)." },
            delta: { type: "number", description: "For kind=tracking, in em (-0.2–0.2)." },
            uppercase: { type: "boolean" },
            effect: {
              type: "string",
              enum: ["none", "foil-gold", "foil-silver", "foil-rose", "letterpress", "emboss", "deboss"],
            },
            align: { type: "string", enum: ["left", "center", "right"] },
            hidden: { type: "boolean" },
            motif: { type: "string", enum: KNOWN_MOTIFS },
            opacity: { type: "number", description: "Pattern strength, 0.02–0.35." },
            art: { type: "string", enum: KNOWN_ORNAMENTS },
            style: {
              type: "string",
              enum: ["plain", "circle", "diamond", "shield", "stacked", "slashed", "seal"],
            },
            mask: { type: "string", enum: ["none", "arch", "circle", "rounded"] },
            stock: { type: "string", enum: ["none", "cotton", "handmade", "linen", "vellum"] },
            remove: { type: "boolean" },
            text: { type: "string", maxLength: 120 },
          },
          required: ["kind"],
        },
      },
      reply: {
        type: "string",
        description: "One sentence to the host explaining what you did, or what you need to know.",
      },
    },
    required: ["operations", "reply"],
  },
} as const;

export function assistantAvailable(): boolean {
  return config.designAssistant.enabled;
}

/**
 * Asks the model for operations. Returns null when no key is configured or the
 * call fails — the console then falls back to its own guidance rather than
 * showing an error, because a design tool that breaks when a network call fails
 * is not a design tool.
 */
export async function interpretWithModel(
  request: AssistantRequest,
): Promise<AssistantReply | null> {
  const apiKey = config.designAssistant.apiKey;
  if (!apiKey) return null;

  const messages = [
    ...(request.history ?? []).flatMap((turn) => [
      { role: "user" as const, content: turn.prompt },
      { role: "assistant" as const, content: turn.reply },
    ]),
    {
      role: "user" as const,
      content: `The host is looking at this design:\n${JSON.stringify(request.design, null, 2)}\n\nThey said: "${request.prompt}"`,
    },
  ];

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.designAssistant.model,
        max_tokens: 1024,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[bookit] design assistant unreachable", error);
    return null;
  }

  if (!response.ok) {
    console.error("[bookit] design assistant returned", response.status);
    return null;
  }

  const body = (await response.json()) as {
    content?: { type: string; name?: string; input?: unknown }[];
  };
  const call = body.content?.find((block) => block.type === "tool_use" && block.name === TOOL.name);
  if (!call?.input) return null;

  const parsed = assistantReplySchema.safeParse(call.input);
  if (parsed.success) return parsed.data;

  // A partially valid answer is still worth something: keep the operations that
  // validate and drop the rest rather than losing the whole turn.
  const raw = call.input as { operations?: unknown[]; reply?: unknown };
  const salvaged = operationsSchema.safeParse(
    (raw.operations ?? []).filter((operation) => operationsSchema.safeParse([operation]).success),
  );
  if (!salvaged.success || salvaged.data.length === 0) return null;

  return {
    operations: salvaged.data,
    reply: typeof raw.reply === "string" ? raw.reply : "Made the change.",
  };
}
