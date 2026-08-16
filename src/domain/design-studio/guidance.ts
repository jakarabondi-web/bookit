import type { StudioDesign } from "./operations";
import { roleOf } from "./semantics";
import type { BookitTemplate, DesignDirection } from "./types";

/**
 * Guidance.
 *
 * A blank prompt box is the worst interface ever inflicted on someone who does
 * not already know the vocabulary. Most hosts have never had to say what they
 * want from a piece of stationery — they know it when they see it, and they
 * know the occasion, and that is all.
 *
 * So the console is never empty. It opens with prompts written for the design
 * in front of them, it answers a change with the two or three moves a stationer
 * would suggest next, and it keeps a plain-language index of everything it
 * understands. The guidance is the part that teaches the vocabulary; the
 * interpreter is only the part that acts on it.
 */

export interface PromptGroup {
  title: string;
  /** One line on what this category of instruction does. */
  hint: string;
  examples: string[];
}

/** The index: everything the studio understands, in the words a host would use. */
export const PROMPT_GUIDE: PromptGroup[] = [
  {
    title: "Colour",
    hint: "Nudge the designer's colourway rather than picking hex values. The studio keeps text readable as it moves.",
    examples: [
      "warmer",
      "deeper and moodier",
      "softer, more muted",
      "richer colour",
      "reverse it out — light type on dark",
    ],
  },
  {
    title: "Typography",
    hint: "One decision — which voice — and the second face is already settled.",
    examples: [
      "more classical type",
      "set it in a modern face",
      "editorial, like a magazine",
      "make the names bigger",
      "set the names in capitals",
      "open up the letter-spacing",
    ],
  },
  {
    title: "Finish",
    hint: "Print finishes, simulated the way they actually behave on paper.",
    examples: [
      "gold foil on the names",
      "letterpress the heading",
      "silver instead of gold",
      "flat ink, no foil",
      "print it on handmade paper",
    ],
  },
  {
    title: "Ornament",
    hint: "Ornaments and fields drawn from the palette, never applied as stickers.",
    examples: [
      "add a eucalyptus sprig",
      "corner brackets on all four corners",
      "a quiet beadwork field behind it",
      "remove the flourishes",
      "quieter pattern",
    ],
  },
  {
    title: "Layout",
    hint: "The composition moves as a whole, so the rhythm the designer set survives.",
    examples: [
      "give it more air",
      "tighter, fill the card",
      "flush left",
      "centre everything",
    ],
  },
  {
    title: "Photography & marks",
    hint: "Add the pieces a design was left room for.",
    examples: [
      "add a photograph in an arch",
      "add our monogram",
      "a wax seal monogram",
      "remove the photo",
    ],
  },
  {
    title: "Whole moods",
    hint: "A direction in one sentence — the studio makes the coordinated set of changes a stationer would.",
    examples: [
      "make it feel black tie",
      "strip it back, minimal",
      "more romantic",
      "traditional ceremony feel",
      "coastal",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Starters                                                                    */
/* -------------------------------------------------------------------------- */

const BY_DIRECTION: Partial<Record<DesignDirection, string[]>> = {
  "black-tie": ["deeper and moodier", "gold foil on the names", "open up the letter-spacing"],
  "modern-luxury": ["set it in a modern face", "give it more air", "reverse it out"],
  editorial: ["flush left", "make the date bigger", "flat ink, no foil"],
  romantic: ["softer, more muted", "add a eucalyptus sprig", "more romantic"],
  minimal: ["strip it back, minimal", "give it more air", "smaller names"],
  botanical: ["add a eucalyptus sprig", "a quiet botanical field", "warmer"],
  "contemporary-african": ["a quiet beadwork field behind it", "richer colour", "warmer"],
  traditional: ["traditional ceremony feel", "warmer", "more classical type"],
  regal: ["gold foil on the names", "add our monogram", "deeper"],
  coastal: ["coastal", "cooler", "a zellige field, kept quiet"],
  architectural: ["corner brackets on all four corners", "tighter", "set it in a modern face"],
  monochrome: ["reverse it out", "editorial, like a magazine", "flush left"],
  "photography-led": ["add a photograph in an arch", "give it more air", "softer"],
  glamorous: ["richer colour", "gold foil on the names", "set the names in capitals"],
  garden: ["add a eucalyptus sprig", "lighter", "more romantic"],
  artistic: ["richer colour", "reverse it out", "strip it back, minimal"],
};

/**
 * Opening prompts for a specific design.
 *
 * Drawn from what the design already is, so the first suggestion a host sees is
 * a move that suits the card in front of them rather than a generic sample.
 */
export function starterPrompts(template: BookitTemplate): string[] {
  const seen = new Set<string>();
  const starters: string[] = [];

  for (const direction of template.directions) {
    for (const example of BY_DIRECTION[direction] ?? []) {
      if (seen.has(example)) continue;
      seen.add(example);
      starters.push(example);
    }
  }

  for (const fallback of ["warmer", "give it more air", "make the names bigger"]) {
    if (starters.length >= 6) break;
    if (seen.has(fallback)) continue;
    seen.add(fallback);
    starters.push(fallback);
  }

  return starters.slice(0, 6);
}

/* -------------------------------------------------------------------------- */
/* Follow-ups                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What to offer next.
 *
 * Reads the design rather than the conversation: if there is no monogram, offer
 * one; if the card has been nudged three times toward warm, offer the move that
 * balances it. Suggestions that would be refused are never offered, which is
 * the difference between guidance and noise.
 */
export function followUps(design: StudioDesign, template: BookitTemplate): string[] {
  const roles = new Set(design.elements.map((element) => roleOf(element, template)));
  const suggestions: string[] = [];

  if (!roles.has("monogram")) suggestions.push("add our monogram");
  if (!roles.has("pattern")) suggestions.push("a quiet linen field behind it");
  if (!roles.has("ornament")) suggestions.push("add a eucalyptus sprig");

  const hasFinish = design.elements.some(
    (element) =>
      (element.type === "text" || element.type === "monogram") &&
      element.effect &&
      element.effect !== "none",
  );
  suggestions.push(hasFinish ? "flat ink, no foil" : "gold foil on the names");

  if (design.colourMoves.length === 0) {
    suggestions.push("warmer", "deeper and moodier");
  } else {
    const last = design.colourMoves[design.colourMoves.length - 1];
    suggestions.push(last === "deeper" ? "lighter" : "deeper and moodier");
    suggestions.push("reverse it out");
  }

  if (design.fontPairingId === null) suggestions.push("editorial, like a magazine");

  suggestions.push("give it more air", "strip it back, minimal");

  return [...new Set(suggestions)].slice(0, 5);
}

/**
 * What to say when nothing resolved.
 *
 * Named rather than generic: the console says which categories exist and offers
 * three prompts drawn from this design, because "I didn't understand" on its
 * own teaches a host nothing about what to type next.
 */
export function clarification(template: BookitTemplate): string {
  return `I couldn't place that as a design instruction. I understand colour ("warmer", "deeper"), type ("more classical", "bigger names"), finishes ("gold foil on the names"), ornament, layout and whole moods ("make it feel black tie"). Here is what suits ${template.name}:`;
}
