/**
 * Invitation templates.
 *
 * The four axes decide colour, type, ground and where the photograph sits.
 * They do not decide *composition* — and composition is most of what makes one
 * invitation look designed and another look like a form with a nice font. A
 * template is the art direction: how the names are broken, what ornament holds
 * the page, where the weight sits, what is set in caps and what is not.
 *
 * Each of these is a finished design a host could send as-is. The axes then
 * move underneath it, so choosing "Kanga" and then switching the palette to
 * Midnight gives a dark kanga, not a broken one.
 */

/* -------------------------------------------------------------------------- */
/* Composition vocabulary                                                      */
/* -------------------------------------------------------------------------- */

/** How the block of type is arranged on the field. */
export type Composition =
  /** Everything centred on a single axis. The engraved-card default. */
  | "CENTRED"
  /** Flush left, ragged right, with the photograph bleeding off one edge. */
  | "ASYMMETRIC"
  /** Type held between a heavy band above and below. */
  | "BANDED"
  /** Photograph in an arched window, type beneath. */
  | "ARCH"
  /** Names set enormous and condensed, filling the measure. */
  | "POSTER"
  /** Two names either side of a vertical rule — for joining two families. */
  | "SPLIT";

/** The ornament that holds the composition together. */
export type Frame =
  | "NONE"
  | "DOUBLE_RULE"
  | "HAIRLINE"
  | "CORNERS"
  | "TOP_BOTTOM_BAND"
  | "ARCH_OUTLINE";

/** How the host names are broken across lines. */
export type NameSetting =
  /** "Wanjiru & Kevin" on one line. */
  | "INLINE"
  /** Wanjiru / & / Kevin, the ampersand its own line and oversized. */
  | "STACKED_AMPERSAND"
  /** Wanjiru / Kevin, no connector, tight leading. */
  | "STACKED_PLAIN";

export type MonogramStyle = "NONE" | "CIRCLE" | "DIAMOND" | "PLAIN_INITIALS";

/**
 * Where the photograph goes, if there is one.
 *
 * Stated per template rather than inferred from the composition: a bordered
 * card and a hairline-framed one are both centred, but only one of them can
 * take a photograph across its head without the ornament colliding with it.
 */
export type PhotoPlacement = "NONE" | "TOP" | "SIDE" | "ARCH";

export interface InvitationTemplate {
  id: string;
  name: string;
  /** What this is for, in the host's terms. */
  description: string;
  /** One word for the gallery filter. */
  mood: "Formal" | "Traditional" | "Modern" | "Relaxed";

  composition: Composition;
  frame: Frame;
  nameSetting: NameSetting;
  monogram: MonogramStyle;
  photo: PhotoPlacement;

  /** Names in capitals. Suits inscriptional and condensed faces. */
  nameUppercase: boolean;
  /** Multiplier on the base display size. Poster settings run large. */
  nameScale: number;
  /** Extra tracking on the names, for capitals and wide settings. */
  nameTracking?: string;

  /** The eyebrow's treatment — the line above the names. */
  eyebrow: "CAPS_TRACKED" | "SMALL_ITALIC" | "HIDDEN";
  /** Divider between the names and the date. */
  divider: "RULE" | "DIAMOND" | "DOTS" | "NONE";
  /** Date set as words, or as a large numeral with the month beneath. */
  dateStyle: "WORDS" | "NUMERAL" | "STAMP";

  /** How strongly the background motif prints. Templates that lean on ornament keep it low. */
  motifStrength: "NONE" | "SUBTLE" | "STRONG";

  /** The starting point for the four axes when this template is chosen. */
  defaults: {
    paletteId: string;
    fontId: string;
    backgroundId: string;
    heroLayout: "OVERLAY" | "STACKED" | "FRAMED" | "TYPE_ONLY";
  };
}

export const INVITATION_TEMPLATES: InvitationTemplate[] = [
  {
    id: "engraved",
    name: "Engraved",
    description:
      "The formal card, done properly: a double rule, a monogram, and everything on one axis.",
    mood: "Formal",
    composition: "CENTRED",
    frame: "DOUBLE_RULE",
    nameSetting: "INLINE",
    monogram: "CIRCLE",
    photo: "NONE",
    nameUppercase: false,
    nameScale: 1,
    eyebrow: "CAPS_TRACKED",
    divider: "DIAMOND",
    dateStyle: "WORDS",
    motifStrength: "NONE",
    defaults: {
      paletteId: "gold-ivory",
      fontId: "classic",
      backgroundId: "plain",
      heroLayout: "FRAMED",
    },
  },
  {
    id: "kanga",
    name: "Kanga",
    description:
      "Printed bands top and bottom with the names in the open field between them, the way a kanga carries its saying.",
    mood: "Traditional",
    composition: "BANDED",
    frame: "TOP_BOTTOM_BAND",
    nameSetting: "STACKED_AMPERSAND",
    monogram: "NONE",
    photo: "TOP",
    nameUppercase: false,
    nameScale: 1.15,
    eyebrow: "CAPS_TRACKED",
    divider: "NONE",
    dateStyle: "WORDS",
    motifStrength: "STRONG",
    defaults: {
      paletteId: "kitenge",
      fontId: "classic",
      backgroundId: "kanga",
      heroLayout: "STACKED",
    },
  },
  {
    id: "ruracio",
    name: "Ruracio",
    description:
      "Two families either side of a rule, because the ceremony joins households rather than individuals.",
    mood: "Traditional",
    composition: "SPLIT",
    frame: "CORNERS",
    nameSetting: "INLINE",
    monogram: "DIAMOND",
    photo: "NONE",
    nameUppercase: false,
    nameScale: 0.95,
    eyebrow: "CAPS_TRACKED",
    divider: "NONE",
    dateStyle: "WORDS",
    motifStrength: "SUBTLE",
    defaults: {
      paletteId: "terracotta",
      fontId: "ceremonial",
      backgroundId: "beadwork",
      heroLayout: "FRAMED",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Flush left, ragged right, with the date set as a large numeral. Reads like a cover, not a card.",
    mood: "Modern",
    composition: "ASYMMETRIC",
    frame: "NONE",
    nameSetting: "STACKED_PLAIN",
    monogram: "NONE",
    photo: "SIDE",
    nameUppercase: false,
    nameScale: 1.25,
    nameTracking: "-0.02em",
    eyebrow: "CAPS_TRACKED",
    divider: "NONE",
    dateStyle: "NUMERAL",
    motifStrength: "NONE",
    defaults: {
      paletteId: "ink-white",
      fontId: "editorial",
      backgroundId: "plain",
      heroLayout: "OVERLAY",
    },
  },
  {
    id: "gala",
    name: "Gala",
    description: "Dark ground, brass hairline, capitals held wide. For evening receptions.",
    mood: "Formal",
    composition: "CENTRED",
    frame: "HAIRLINE",
    nameSetting: "INLINE",
    monogram: "NONE",
    photo: "NONE",
    nameUppercase: true,
    nameScale: 0.85,
    nameTracking: "0.08em",
    eyebrow: "CAPS_TRACKED",
    divider: "RULE",
    dateStyle: "WORDS",
    motifStrength: "SUBTLE",
    defaults: {
      paletteId: "midnight",
      fontId: "grand",
      backgroundId: "grain",
      heroLayout: "TYPE_ONLY",
    },
  },
  {
    id: "garden",
    name: "Garden",
    description: "The photograph in an arched window, type settling underneath it.",
    mood: "Formal",
    composition: "ARCH",
    frame: "ARCH_OUTLINE",
    nameSetting: "STACKED_AMPERSAND",
    monogram: "NONE",
    photo: "ARCH",
    nameUppercase: false,
    nameScale: 1.05,
    eyebrow: "SMALL_ITALIC",
    divider: "DOTS",
    dateStyle: "WORDS",
    motifStrength: "SUBTLE",
    defaults: {
      paletteId: "botanical",
      fontId: "warm",
      backgroundId: "plain",
      heroLayout: "FRAMED",
    },
  },
  {
    id: "poster",
    name: "Poster",
    description: "Names set as large as the page allows, one accent bar, nothing else.",
    mood: "Modern",
    composition: "POSTER",
    frame: "NONE",
    nameSetting: "STACKED_PLAIN",
    monogram: "NONE",
    photo: "TOP",
    nameUppercase: true,
    nameScale: 1.5,
    nameTracking: "-0.01em",
    eyebrow: "CAPS_TRACKED",
    divider: "NONE",
    dateStyle: "STAMP",
    motifStrength: "NONE",
    defaults: {
      paletteId: "indigo-brass",
      fontId: "geometric",
      backgroundId: "plain",
      heroLayout: "STACKED",
    },
  },
  {
    id: "handwritten",
    name: "Handwritten",
    description: "Loose script and a soft ground. Birthdays, showers, anything unbuttoned.",
    mood: "Relaxed",
    composition: "CENTRED",
    frame: "NONE",
    nameSetting: "INLINE",
    monogram: "NONE",
    photo: "TOP",
    nameUppercase: false,
    nameScale: 1.35,
    eyebrow: "SMALL_ITALIC",
    divider: "DOTS",
    dateStyle: "WORDS",
    motifStrength: "SUBTLE",
    defaults: {
      paletteId: "blush",
      fontId: "handwritten",
      backgroundId: "grain",
      heroLayout: "STACKED",
    },
  },
  {
    id: "homestead",
    name: "Homestead",
    description: "Warm and plain-spoken, with corner marks and a stamped date. Family gatherings.",
    mood: "Relaxed",
    composition: "CENTRED",
    frame: "CORNERS",
    nameSetting: "INLINE",
    monogram: "PLAIN_INITIALS",
    photo: "TOP",
    nameUppercase: false,
    nameScale: 1,
    eyebrow: "CAPS_TRACKED",
    divider: "RULE",
    dateStyle: "STAMP",
    motifStrength: "SUBTLE",
    defaults: {
      paletteId: "palm",
      fontId: "ceremonial",
      backgroundId: "kitenge",
      heroLayout: "STACKED",
    },
  },
];

export const DEFAULT_TEMPLATE_ID = "engraved";

export function templateById(id: string | null | undefined): InvitationTemplate {
  return (
    INVITATION_TEMPLATES.find((template) => template.id === id) ?? INVITATION_TEMPLATES[0]!
  );
}

export const TEMPLATE_MOODS = ["Formal", "Traditional", "Modern", "Relaxed"] as const;
