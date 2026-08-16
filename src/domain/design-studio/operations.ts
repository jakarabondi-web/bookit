import { FONT_PAIRINGS } from "@/domain/design/fonts";
import type { ColourMove } from "./colour";
import { applyMoves } from "./colour";
import { elementsInRole, roleLabel, roleOf, type ElementRole } from "./semantics";
import {
  CANVAS_SIZES,
  paletteFor,
  type BookitTemplate,
  type DesignElement,
  type FontSystem,
  type ImageElement,
  type MaterialEffect,
  type MonogramElement,
  type PaperStock,
  type PatternElement,
  type TemplatePalette,
  type TextAlign,
  type TextElement,
  type VectorElement,
} from "./types";

/**
 * What the studio can actually do to a design.
 *
 * Every change — whether it came from a typed sentence, a colourway chip or a
 * suggestion the assistant offered — is one of these operations. Keeping the
 * set closed is what makes the whole thing safe: a natural-language instruction
 * is *translated into* an operation and then applied by code that knows the
 * design rules, rather than being allowed to rewrite the design directly. A
 * model can propose; only this file disposes.
 *
 * Operations are pure. `apply` takes a design and returns a new one plus a
 * plain-English note of what happened, which is what the change log shows and
 * what makes every step undoable.
 */

export interface StudioDesign {
  templateId: string;
  /** The designer's colourway this started from. */
  paletteId: string;
  /** Adjustments stacked on top of it, in order. */
  colourMoves: ColourMove[];
  /** Null while the design is still on the template's own type system. */
  fontPairingId: string | null;
  fontSystem: FontSystem;
  paper: PaperStock;
  elements: DesignElement[];
  /** Designer Mode holds the margins, the type scale and the locked elements. */
  designerMode: boolean;
}

export function initialDesign(template: BookitTemplate, paletteId?: string | null): StudioDesign {
  return {
    templateId: template.id,
    paletteId: paletteFor(template, paletteId).id,
    colourMoves: [],
    fontPairingId: null,
    fontSystem: template.fontSystem,
    paper: template.paper,
    elements: template.elements.map((element) => ({ ...element })),
    designerMode: true,
  };
}

/** The colourway as it currently stands, designer's base plus every nudge. */
export function resolvedPalette(
  design: StudioDesign,
  template: BookitTemplate,
): TemplatePalette {
  return applyMoves(paletteFor(template, design.paletteId), design.colourMoves);
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

export type DesignOperation =
  | { kind: "palette"; paletteId: string }
  | { kind: "colour"; move: ColourMove }
  | { kind: "type"; pairingId: string }
  | { kind: "scale"; role: ElementRole; factor: number }
  | { kind: "tracking"; role: ElementRole; delta: number }
  | { kind: "case"; role: ElementRole; uppercase: boolean }
  | { kind: "effect"; role: ElementRole; effect: MaterialEffect }
  | { kind: "align"; align: TextAlign }
  | { kind: "space"; factor: number }
  | { kind: "visibility"; role: ElementRole; hidden: boolean }
  | { kind: "pattern"; motif?: string; opacity?: number; remove?: boolean }
  | { kind: "ornament"; art?: string; remove?: boolean }
  | { kind: "monogram"; style?: MonogramElement["style"]; remove?: boolean }
  | { kind: "photo"; mask?: ImageElement["mask"]; remove?: boolean }
  | { kind: "paper"; stock: PaperStock }
  | { kind: "content"; role: ElementRole; text: string };

export interface ApplyResult {
  design: StudioDesign;
  /** What changed, in the language the change log speaks. */
  notes: string[];
  /** What the studio would not do, and why — this is the guidance. */
  refusals: string[];
}

export function applyOperations(
  design: StudioDesign,
  template: BookitTemplate,
  operations: DesignOperation[],
): ApplyResult {
  return operations.reduce<ApplyResult>(
    (state, operation) => {
      const result = apply(state.design, template, operation);
      return {
        design: result.design,
        notes: [...state.notes, ...result.notes],
        refusals: [...state.refusals, ...result.refusals],
      };
    },
    { design, notes: [], refusals: [] },
  );
}

const ok = (design: StudioDesign, note: string): ApplyResult => ({
  design,
  notes: [note],
  refusals: [],
});

const no = (design: StudioDesign, reason: string): ApplyResult => ({
  design,
  notes: [],
  refusals: [reason],
});

export function apply(
  design: StudioDesign,
  template: BookitTemplate,
  operation: DesignOperation,
): ApplyResult {
  switch (operation.kind) {
    case "palette":
      return applyPalette(design, template, operation.paletteId);
    case "colour":
      return applyColour(design, template, operation.move);
    case "type":
      return applyType(design, template, operation.pairingId);
    case "scale":
      return applyScale(design, template, operation.role, operation.factor);
    case "tracking":
      return applyTracking(design, template, operation.role, operation.delta);
    case "case":
      return applyCase(design, template, operation.role, operation.uppercase);
    case "effect":
      return applyEffect(design, template, operation.role, operation.effect);
    case "align":
      return applyAlign(design, template, operation.align);
    case "space":
      return applySpace(design, template, operation.factor);
    case "visibility":
      return applyVisibility(design, template, operation.role, operation.hidden);
    case "pattern":
      return applyPattern(design, template, operation);
    case "ornament":
      return applyOrnament(design, template, operation);
    case "monogram":
      return applyMonogram(design, template, operation);
    case "photo":
      return applyPhoto(design, template, operation);
    case "paper":
      return ok({ ...design, paper: operation.stock }, paperNote(operation.stock));
    case "content":
      return applyContent(design, template, operation.role, operation.text);
  }
}

/* ------------------------------------------------------------- colour ---- */

function applyPalette(
  design: StudioDesign,
  template: BookitTemplate,
  paletteId: string,
): ApplyResult {
  const palette = template.palettes.find((entry) => entry.id === paletteId);
  if (!palette) return no(design, `${template.name} does not ship a colourway called that.`);
  // Nudges are dropped on a deliberate colourway change: the host has picked a
  // new starting point, not asked for the old adjustments over a new base.
  return ok(
    { ...design, paletteId: palette.id, colourMoves: [] },
    `Colourway set to ${palette.name}.`,
  );
}

function applyColour(
  design: StudioDesign,
  template: BookitTemplate,
  direction: ColourMove,
): ApplyResult {
  if (design.colourMoves.length >= 6) {
    return no(
      design,
      "The colourway has been nudged as far as it holds. Pick a different starting colourway and go again.",
    );
  }
  const moves = [...design.colourMoves, direction];
  return ok(
    { ...design, colourMoves: moves },
    direction === "invert" ? "Colourway reversed out." : `Colour taken ${direction}.`,
  );
}

/* --------------------------------------------------------------- type ---- */

function applyType(
  design: StudioDesign,
  template: BookitTemplate,
  pairingId: string,
): ApplyResult {
  const pairing = FONT_PAIRINGS.find((entry) => entry.id === pairingId);
  if (!pairing) return no(design, "That type pairing is not in the library.");

  const keepsAccent = template.designRules.maxFonts >= 3;
  return ok(
    {
      ...design,
      fontPairingId: pairing.id,
      fontSystem: {
        display: pairing.displayFont,
        body: pairing.bodyFont,
        accent: keepsAccent ? design.fontSystem.accent : undefined,
      },
    },
    `Type set in ${pairing.name} — ${pairing.description.toLowerCase().replace(/\.$/, "")}.`,
  );
}

/* ------------------------------------------------------------ text ------- */

/** The size the designer set, which is what Designer Mode measures against. */
function originalText(template: BookitTemplate, id: string): TextElement | null {
  const found = template.elements.find((element) => element.id === id);
  return found && found.type === "text" ? found : null;
}

function applyScale(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  factor: number,
): ApplyResult {
  const canvas = CANVAS_SIZES[template.size];
  const targets = elementsInRole(design.elements, role, template);
  if (targets.length === 0) return no(design, `There is no ${roleLabel(role)} on this design.`);

  let clamped = false;
  const elements = design.elements.map((element) => {
    if (roleOf(element, template) !== role) return element;

    if (element.type === "monogram") {
      return { ...element, fontSize: element.fontSize * factor };
    }
    if (element.type !== "text") return element;

    const base = originalText(template, element.id)?.fontSize ?? element.fontSize;
    let size = element.fontSize * factor;
    if (design.designerMode) {
      const floor = base * 0.7;
      const ceiling = base * 1.4;
      if (size < floor || size > ceiling) clamped = true;
      size = Math.min(ceiling, Math.max(floor, size));
    }

    // The box grows with the type so a larger name does not clip its own
    // descenders, but never past the board.
    const grown = element.height * (size / element.fontSize);
    const height = Math.min(grown, canvas.height - element.y);

    return { ...element, fontSize: round(size), height: round(height) };
  });

  const note =
    factor > 1
      ? `Set ${roleLabel(role)} larger.`
      : `Set ${roleLabel(role)} smaller.`;

  return {
    design: { ...design, elements },
    notes: [note],
    refusals: clamped
      ? [
          "Held inside the design's type scale — Designer Mode keeps sizes within a third of what the designer set. Switch to Creative Mode to go further.",
        ]
      : [],
  };
}

function applyTracking(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  delta: number,
): ApplyResult {
  if (elementsInRole(design.elements, role, template).length === 0) {
    return no(design, `There is no ${roleLabel(role)} to space out.`);
  }
  const elements = design.elements.map((element) =>
    element.type === "text" && roleOf(element, template) === role
      ? { ...element, letterSpacing: round(clamp(element.letterSpacing + delta, -0.05, 0.5)) }
      : element,
  );
  return ok(
    { ...design, elements },
    delta > 0 ? `Letter-spacing opened on ${roleLabel(role)}.` : `Letter-spacing tightened on ${roleLabel(role)}.`,
  );
}

function applyCase(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  uppercase: boolean,
): ApplyResult {
  if (elementsInRole(design.elements, role, template).length === 0) {
    return no(design, `There is no ${roleLabel(role)} to set.`);
  }
  const elements = design.elements.map((element) =>
    element.type === "text" && roleOf(element, template) === role
      ? { ...element, uppercase }
      : element,
  );
  return ok(
    { ...design, elements },
    uppercase ? `${capitalise(roleLabel(role))} set in capitals.` : `${capitalise(roleLabel(role))} set in upper and lower case.`,
  );
}

/** Finishes belong on the one or two things a printer would actually foil. */
const EFFECT_ROLES: ElementRole[] = ["names", "monogram", "occasion", "joiner"];

function applyEffect(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  effect: MaterialEffect,
): ApplyResult {
  if (design.designerMode && !EFFECT_ROLES.includes(role) && effect !== "none") {
    return no(
      design,
      `A print finish on ${roleLabel(role)} reads as costume jewellery at that size — foil and letterpress are held to the names, the heading and the monogram.`,
    );
  }
  const targets = elementsInRole(design.elements, role, template);
  if (targets.length === 0) return no(design, `There is no ${roleLabel(role)} to finish.`);

  const elements = design.elements.map((element) => {
    if (roleOf(element, template) !== role) return element;
    if (element.type === "text" || element.type === "monogram") {
      return { ...element, effect: effect === "none" ? undefined : effect };
    }
    return element;
  });

  return ok(
    { ...design, elements },
    effect === "none"
      ? `Finish removed from ${roleLabel(role)} — flat ink.`
      : `${capitalise(effectName(effect))} applied to ${roleLabel(role)}.`,
  );
}

function applyAlign(
  design: StudioDesign,
  template: BookitTemplate,
  align: TextAlign,
): ApplyResult {
  const canvas = CANVAS_SIZES[template.size];
  const margin = design.designerMode ? template.designRules.minMargin : 24;
  const held = new Set(design.designerMode ? template.designRules.lockedElements : []);

  const elements = design.elements.map((element) => {
    // Aligning is not only a text property. A flush-left invitation whose rules
    // and marks are still centred reads as a mistake, so everything that sits
    // with the type moves with it — everything except the elements the design
    // rules name as holding the composition, which are the frame and the ground.
    const movable =
      element.type === "text" ||
      element.type === "divider" ||
      element.type === "monogram" ||
      element.type === "vector";
    if (!movable || held.has(element.id)) return element;

    const x =
      align === "left"
        ? margin
        : align === "right"
          ? canvas.width - margin - element.width
          : (canvas.width - element.width) / 2;

    const placed = {
      ...element,
      x: round(clamp(x, margin, Math.max(margin, canvas.width - margin - element.width))),
    };
    return element.type === "text" ? { ...placed, align } : placed;
  });

  return ok({ ...design, elements }, `Type set ${align === "center" ? "centred" : `flush ${align}`}.`);
}

/* ----------------------------------------------------------- layout ------ */

function applySpace(
  design: StudioDesign,
  template: BookitTemplate,
  factor: number,
): ApplyResult {
  const canvas = CANVAS_SIZES[template.size];
  const margin = design.designerMode ? template.designRules.minMargin : 20;

  const movable = design.elements.filter((element) => {
    const role = roleOf(element, template);
    return role !== "ground" && role !== "pattern";
  });
  if (movable.length === 0) return no(design, "There is nothing here to re-space.");

  const top = Math.min(...movable.map((element) => element.y));
  const bottom = Math.max(...movable.map((element) => element.y + element.height));
  const centre = (top + bottom) / 2;

  // Scaling the composition about its own centre keeps the design's rhythm —
  // the gaps grow in proportion rather than one of them absorbing the change.
  let scale = factor;
  const projectedTop = centre - (centre - top) * scale;
  const projectedBottom = centre + (bottom - centre) * scale;
  if (projectedTop < margin || projectedBottom > canvas.height - margin) {
    const room = Math.min(
      (centre - margin) / (centre - top || 1),
      (canvas.height - margin - centre) / (bottom - centre || 1),
    );
    scale = Math.min(scale, room);
  }

  if (Math.abs(scale - 1) < 0.005) {
    return no(
      design,
      "The composition is already at the margin — there is no more air to give it without breaking the frame.",
    );
  }

  const elements = design.elements.map((element) => {
    const role = roleOf(element, template);
    if (role === "ground" || role === "pattern") return element;
    return { ...element, y: round(centre - (centre - element.y) * scale) };
  });

  return ok(
    { ...design, elements },
    factor < 1 ? "Composition drawn in — more air at the edges." : "Composition opened out.",
  );
}

function applyVisibility(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  hidden: boolean,
): ApplyResult {
  const targets = elementsInRole(design.elements, role, template);
  if (targets.length === 0) {
    return no(design, `There is no ${roleLabel(role)} on this design.`);
  }

  const locked = targets.filter(
    (element) => design.designerMode && template.designRules.lockedElements.includes(element.id),
  );
  if (locked.length === targets.length && hidden) {
    return no(
      design,
      `${capitalise(roleLabel(role))} holds this composition together — it is locked in Designer Mode. Switch to Creative Mode if you want it gone.`,
    );
  }

  const elements = design.elements.map((element) =>
    roleOf(element, template) === role &&
    !(design.designerMode && template.designRules.lockedElements.includes(element.id))
      ? { ...element, hidden }
      : element,
  );

  return ok(
    { ...design, elements },
    hidden ? `${capitalise(roleLabel(role))} removed.` : `${capitalise(roleLabel(role))} brought back.`,
  );
}

/* ---------------------------------------------------------- ornament ----- */

/**
 * How much a motif can take before it starts competing with the type.
 *
 * Opacity is not comparable across motifs: beadwork at 0.14 is a loud field,
 * linen at 0.14 is barely visible. Swapping a motif therefore has to re-set the
 * strength rather than inherit the last one's number, or every change of mind
 * ends up shouting.
 */
const MOTIF_CEILING: Record<string, number> = {
  beadwork: 0.07,
  kitenge: 0.07,
  kanga: 0.08,
  mudcloth: 0.07,
  zellige: 0.08,
  arabesque: 0.09,
  damask: 0.09,
  herringbone: 0.09,
  lattice: 0.11,
  arcade: 0.1,
  sprigs: 0.1,
  eucalyptus: 0.1,
  moire: 0.12,
  crosshatch: 0.13,
  pinstripe: 0.13,
  grain: 0.16,
  linen: 0.16,
};

function ceilingFor(motif: string): number {
  return MOTIF_CEILING[motif] ?? 0.12;
}

function applyPattern(
  design: StudioDesign,
  template: BookitTemplate,
  operation: { motif?: string; opacity?: number; remove?: boolean },
): ApplyResult {
  const existing = design.elements.filter((element): element is PatternElement =>
    element.type === "pattern",
  );

  if (operation.remove) {
    if (existing.length === 0) return no(design, "There is no pattern on this design.");
    return ok(
      {
        ...design,
        elements: design.elements.filter((element) => element.type !== "pattern"),
      },
      "Pattern taken off — plain ground.",
    );
  }

  if (existing.length > 0) {
    const elements = design.elements.map((element) => {
      if (element.type !== "pattern") return element;
      const motif = operation.motif ?? element.motif;
      const strength =
        operation.opacity ??
        (operation.motif ? Math.min(element.patternOpacity, ceilingFor(motif)) : element.patternOpacity);
      return {
        ...element,
        motif,
        patternOpacity: round(clamp(strength, 0.03, 0.32)),
      };
    });
    return ok(
      { ...design, elements },
      operation.motif
        ? `Pattern changed to ${prettify(operation.motif)}.`
        : (operation.opacity ?? 0) > existing[0]!.patternOpacity
          ? "Pattern brought up."
          : "Pattern quietened.",
    );
  }

  const canvas = CANVAS_SIZES[template.size];
  const ground = design.elements.find((element) => roleOf(element, template) === "ground");
  const field: PatternElement = {
    id: `studio-pattern-${design.elements.length + 1}`,
    type: "pattern",
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: (ground?.zIndex ?? 0) + 0.5,
    motif: operation.motif ?? "linen",
    colorRole: "accent",
    scale: 56,
    patternOpacity: round(
      clamp(operation.opacity ?? ceilingFor(operation.motif ?? "linen"), 0.03, 0.32),
    ),
  };

  return ok(
    { ...design, elements: [...design.elements, field] },
    `${capitalise(prettify(field.motif))} laid under the composition, kept quiet.`,
  );
}

/**
 * The proportions each ornament is drawn at.
 *
 * The vector library stretches to its box — which is what lets a template
 * author size an ornament exactly — so the studio has to choose a box the
 * drawing actually suits. A eucalyptus sprig in a 3:1 box is not a sprig, it is
 * a smear.
 */
const ORNAMENT_ASPECT: Record<string, number> = {
  fleuron: 3.4,
  laurel: 2.6,
  "bead-course": 8,
  "diamond-run": 8,
  "weave-band": 8,
  "sprig-olive": 1.1,
  "sprig-eucalyptus": 1.1,
  "sprig-fern": 1.1,
  arch: 0.9,
  "arch-double": 1.2,
  "panel-carved": 0.7,
  "seal-ring": 1,
  "seal-ring-laurel": 1,
};

const CORNER_ARTS = new Set([
  "corner-bracket",
  "corner-deco-fan",
  "corner-flourish",
  "corner-sprig",
  "corner-step",
]);

function applyOrnament(
  design: StudioDesign,
  template: BookitTemplate,
  operation: { art?: string; remove?: boolean },
): ApplyResult {
  if (operation.remove) {
    const present = design.elements.filter((element) => element.type === "vector");
    if (present.length === 0) return no(design, "There are no ornaments to take off.");
    const removable = present.filter(
      (element) => !design.designerMode || !template.designRules.lockedElements.includes(element.id),
    );
    if (removable.length === 0) {
      return no(
        design,
        "The ornaments here are part of the composition rather than decoration on top of it, so Designer Mode holds them.",
      );
    }
    const ids = new Set(removable.map((element) => element.id));
    return ok(
      { ...design, elements: design.elements.filter((element) => !ids.has(element.id)) },
      "Ornaments taken off.",
    );
  }

  const art = operation.art ?? "fleuron";
  const canvas = CANVAS_SIZES[template.size];
  const margin = Math.max(template.designRules.minMargin, 40);
  const top = Math.max(...design.elements.map((element) => element.zIndex)) + 1;

  if (CORNER_ARTS.has(art)) {
    const size = 82;
    const inset = margin - 8;
    const corners: Array<[number, number, number]> = [
      [inset, inset, 0],
      [canvas.width - inset - size, inset, 90],
      [canvas.width - inset - size, canvas.height - inset - size, 180],
      [inset, canvas.height - inset - size, 270],
    ];
    const added: VectorElement[] = corners.map(([x, y, rotation], index) => ({
      id: `studio-corner-${index + 1}`,
      type: "vector",
      art,
      x,
      y,
      width: size,
      height: size,
      rotation,
      opacity: 0.9,
      locked: false,
      zIndex: top + index,
      colorRole: "accent",
    }));
    return ok(
      { ...design, elements: [...withoutStudioOrnaments(design.elements), ...added] },
      `${capitalise(prettify(art))} set into all four corners.`,
    );
  }

  const gap = largestGap(design.elements, template);
  if (!gap || gap.height < 44) {
    return no(
      design,
      "This composition is set full — there is no clear band to put an ornament in without crowding the type. Ask for more air first.",
    );
  }

  const aspect = ORNAMENT_ASPECT[art] ?? 3;
  let height = Math.min(gap.height - 14, aspect >= 2.4 ? 56 : 104);
  let width = height * aspect;
  const room = canvas.width - margin * 2;
  if (width > room) {
    width = room;
    height = width / aspect;
  }
  const piece: VectorElement = {
    id: "studio-ornament",
    type: "vector",
    art,
    x: round((canvas.width - width) / 2),
    y: round(gap.y + (gap.height - height) / 2),
    width: round(width),
    height: round(height),
    rotation: 0,
    opacity: 0.92,
    locked: false,
    zIndex: top,
    colorRole: "accent",
  };

  return ok(
    { ...design, elements: [...withoutStudioOrnaments(design.elements), piece] },
    `${capitalise(prettify(art))} set below the names.`,
  );
}

function withoutStudioOrnaments(elements: DesignElement[]): DesignElement[] {
  return elements.filter((element) => !element.id.startsWith("studio-corner-") && element.id !== "studio-ornament");
}

function applyMonogram(
  design: StudioDesign,
  template: BookitTemplate,
  operation: { style?: MonogramElement["style"]; remove?: boolean },
): ApplyResult {
  const existing = design.elements.find(
    (element): element is MonogramElement => element.type === "monogram",
  );

  if (operation.remove) {
    if (!existing) return no(design, "There is no monogram on this design.");
    return ok(
      { ...design, elements: design.elements.filter((element) => element.type !== "monogram") },
      "Monogram removed.",
    );
  }

  if (existing) {
    const elements = design.elements.map((element) =>
      element.type === "monogram"
        ? { ...element, hidden: false, style: operation.style ?? element.style }
        : element,
    );
    return ok(
      { ...design, elements },
      operation.style ? `Monogram set as a ${operation.style}.` : "Monogram brought back.",
    );
  }

  const canvas = CANVAS_SIZES[template.size];
  const gap = largestGap(design.elements, template);
  if (!gap || gap.height < 70) {
    return no(
      design,
      "There is no room for a monogram without crowding the type. Ask for more air, or take an optional line off first.",
    );
  }

  const size = Math.min(gap.height - 16, 96);
  const mark: MonogramElement = {
    id: "studio-monogram",
    type: "monogram",
    style: operation.style ?? "circle",
    text: null,
    fontRole: "display",
    fontSize: round(size * 0.32),
    colorRole: "accent",
    strokeRole: "accent",
    x: round((canvas.width - size) / 2),
    y: round(gap.y + (gap.height - size) / 2),
    width: round(size),
    height: round(size),
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: Math.max(...design.elements.map((element) => element.zIndex)) + 1,
  };

  return ok({ ...design, elements: [...design.elements, mark] }, "Monogram added, set from your initials.");
}

function applyPhoto(
  design: StudioDesign,
  template: BookitTemplate,
  operation: { mask?: ImageElement["mask"]; remove?: boolean },
): ApplyResult {
  const existing = design.elements.filter((element): element is ImageElement => element.type === "image");

  if (operation.remove) {
    if (existing.length === 0) return no(design, "There is no photograph on this design.");
    return ok(
      { ...design, elements: design.elements.filter((element) => element.type !== "image") },
      "Photograph removed.",
    );
  }

  if (existing.length > 0) {
    if (!operation.mask) {
      return no(
        design,
        "There is already a photograph frame here — upload an image into it from the panel below.",
      );
    }
    const elements = design.elements.map((element) =>
      element.type === "image" ? { ...element, mask: operation.mask, hidden: false } : element,
    );
    return ok({ ...design, elements }, `Photograph cut to ${operation.mask === "arch" ? "an arch" : `a ${operation.mask}`}.`);
  }

  const canvas = CANVAS_SIZES[template.size];
  const margin = Math.max(template.designRules.minMargin, 48);
  const gap = largestGap(design.elements, template);
  if (!gap || gap.height < 150) {
    return no(
      design,
      `${template.name} is composed as a typographic card — there is no band deep enough for a photograph. Sculpted Arch and Black & White Society are built around one.`,
    );
  }

  const height = Math.min(gap.height - 20, 340);
  const width = Math.min(canvas.width - margin * 2, height * 0.82);
  const frame: ImageElement = {
    id: "studio-photo",
    type: "image",
    src: null,
    x: round((canvas.width - width) / 2),
    y: round(gap.y + (gap.height - height) / 2),
    width: round(width),
    height: round(height),
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: Math.max(...design.elements.map((element) => element.zIndex)) + 1,
    focalX: 0.5,
    focalY: 0.42,
    fit: "cover",
    mask: operation.mask ?? "arch",
  };

  return ok(
    { ...design, elements: [...design.elements, frame] },
    "Photograph frame placed — upload your image into it below.",
  );
}

function applyContent(
  design: StudioDesign,
  template: BookitTemplate,
  role: ElementRole,
  text: string,
): ApplyResult {
  const targets = elementsInRole(design.elements, role, template).filter(
    (element) => element.type === "text",
  );
  if (targets.length === 0) return no(design, `There is no ${roleLabel(role)} line to rewrite.`);

  const first = targets[0]!;
  const elements = design.elements.map((element) =>
    element.id === first.id && element.type === "text" ? { ...element, content: text } : element,
  );
  return ok({ ...design, elements }, `${capitalise(roleLabel(role))} now reads “${text}”.`);
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The deepest clear horizontal band on the board.
 *
 * Adding anything — an ornament, a monogram, a photograph — needs somewhere to
 * put it that does not land on the type. Rather than guess a position per
 * template, the studio reads the composition and finds the space the designer
 * left, which is usually exactly where the thing belongs.
 */
export function largestGap(
  elements: DesignElement[],
  template: BookitTemplate,
): { y: number; height: number } | null {
  const canvas = CANVAS_SIZES[template.size];
  const margin = Math.max(template.designRules.minMargin, 40);

  const occupied = elements
    .filter((element) => {
      const role = roleOf(element, template);
      if (role === "ground" || role === "pattern" || role === "frame") return false;
      return !element.hidden;
    })
    .map((element) => [element.y, element.y + element.height] as const)
    .sort((a, b) => a[0] - b[0]);

  let cursor = margin;
  let best: { y: number; height: number } | null = null;

  const consider = (from: number, to: number) => {
    const height = to - from;
    if (height > (best?.height ?? 0)) best = { y: from, height };
  };

  for (const [top, bottom] of occupied) {
    if (top > cursor) consider(cursor, top);
    cursor = Math.max(cursor, bottom);
  }
  consider(cursor, canvas.height - margin);

  return best;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function prettify(value: string): string {
  return value.replace(/-/g, " ");
}

function effectName(effect: MaterialEffect): string {
  const names: Record<MaterialEffect, string> = {
    none: "flat ink",
    "foil-gold": "gold foil",
    "foil-silver": "silver foil",
    "foil-rose": "rose gold foil",
    letterpress: "letterpress",
    emboss: "blind emboss",
    deboss: "deboss",
  };
  return names[effect];
}

function paperNote(stock: PaperStock): string {
  const names: Record<PaperStock, string> = {
    none: "Paper texture off — flat stock.",
    cotton: "Printed on cotton rag.",
    handmade: "Printed on handmade paper, with the tooth that comes with it.",
    linen: "Printed on linen-finish stock.",
    vellum: "Printed on vellum — barely there.",
  };
  return names[stock];
}
