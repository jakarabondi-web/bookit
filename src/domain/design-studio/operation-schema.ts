import { z } from "zod";
import { COLOUR_MOVES } from "./colour";
import type { DesignOperation } from "./operations";
import { KNOWN_MOTIFS, KNOWN_ORNAMENTS } from "./prompting";

/**
 * The closed set, as a schema.
 *
 * This is the airlock between a language model and a host's design. The model
 * is asked for operations and nothing else; anything it returns that is not one
 * of these — a motif that does not exist, a role that is not on the board, a
 * free-form instruction it invented — fails validation and never reaches the
 * design engine. The worst a bad completion can do is produce no change and an
 * apology.
 */

const ROLE = z.enum([
  "ground",
  "frame",
  "pattern",
  "ornament",
  "divider",
  "monogram",
  "photo",
  "names",
  "joiner",
  "occasion",
  "hosts",
  "date",
  "venue",
  "detail",
  "rsvp",
]);

const EFFECT = z.enum([
  "none",
  "foil-gold",
  "foil-silver",
  "foil-rose",
  "letterpress",
  "emboss",
  "deboss",
]);

const PAPER = z.enum(["none", "cotton", "handmade", "linen", "vellum"]);

export const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("palette"), paletteId: z.string().min(1).max(64) }),
  z.object({ kind: z.literal("colour"), move: z.enum([...COLOUR_MOVES, "invert"] as const) }),
  z.object({ kind: z.literal("type"), pairingId: z.string().min(1).max(48) }),
  z.object({ kind: z.literal("scale"), role: ROLE, factor: z.number().min(0.5).max(2) }),
  z.object({ kind: z.literal("tracking"), role: ROLE, delta: z.number().min(-0.2).max(0.2) }),
  z.object({ kind: z.literal("case"), role: ROLE, uppercase: z.boolean() }),
  z.object({ kind: z.literal("effect"), role: ROLE, effect: EFFECT }),
  z.object({ kind: z.literal("align"), align: z.enum(["left", "center", "right"]) }),
  z.object({ kind: z.literal("space"), factor: z.number().min(0.8).max(1.25) }),
  z.object({ kind: z.literal("visibility"), role: ROLE, hidden: z.boolean() }),
  z.object({
    kind: z.literal("pattern"),
    motif: z.enum(KNOWN_MOTIFS as [string, ...string[]]).optional(),
    opacity: z.number().min(0.02).max(0.35).optional(),
    remove: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("ornament"),
    art: z.enum(KNOWN_ORNAMENTS as [string, ...string[]]).optional(),
    remove: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("monogram"),
    style: z.enum(["plain", "circle", "diamond", "shield", "stacked", "slashed", "seal"]).optional(),
    remove: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("photo"),
    mask: z.enum(["none", "arch", "circle", "rounded"]).optional(),
    remove: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("paper"), stock: PAPER }),
  z.object({ kind: z.literal("content"), role: ROLE, text: z.string().min(1).max(120) }),
]);

/** At most six changes in one turn: a prompt is an instruction, not a redesign. */
export const operationsSchema = z.array(operationSchema).max(6);

export const assistantReplySchema = z.object({
  operations: operationsSchema,
  /** One sentence, in a stationer's voice, on what was done and why. */
  reply: z.string().min(1).max(400),
});

export type AssistantReply = z.infer<typeof assistantReplySchema>;

/** Narrows validated JSON back to the engine's own type. */
export function asOperations(parsed: z.infer<typeof operationsSchema>): DesignOperation[] {
  return parsed as DesignOperation[];
}
