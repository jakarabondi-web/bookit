/**
 * Type pairings.
 *
 * Chosen as pairs rather than as two independent menus. Picking a display face
 * and a body face separately is how invitations end up with a Didone over a
 * geometric sans — so the one decision a host makes here is "which voice", and
 * the second face is already settled.
 *
 * Every family is self-hosted by next/font with `preload: false`, so a guest
 * downloads exactly the one face their invitation uses and nobody else pays for
 * the other twenty-nine.
 */

export type TypeVoice =
  | "Classical"
  | "Modern"
  | "Editorial"
  | "Deco"
  | "Script"
  | "Bold";

export interface FontPairing {
  id: string;
  name: string;
  /** The mood, in plain words — this is what the host is really choosing. */
  description: string;
  voice: TypeVoice;
  displayFont: string;
  bodyFont: string;
  /** Inscriptional faces read as shouting unless they are set in caps. */
  displayUppercase?: boolean;
  displayTracking?: string;
  /**
   * Optical size correction. A script at 42px reads far smaller than a Didone
   * at 42px, so each pairing carries the multiplier that evens them out.
   */
  sizeAdjust?: number;
}

const SANS = "var(--font-inter), system-ui, sans-serif";
const LORA = "var(--font-lora), Georgia, serif";
const CARDO = "var(--font-cardo), Georgia, serif";
const SPECTRAL = "var(--font-spectral), Georgia, serif";
const TENOR = "var(--font-tenor), system-ui, sans-serif";

export const FONT_PAIRINGS: FontPairing[] = [
  /* ------------------------------------------------------- classical --- */
  {
    id: "classic",
    name: "Classic",
    description: "A quiet old-style serif. The safe, formal choice.",
    voice: "Classical",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: SANS,
  },
  {
    id: "garamond",
    name: "Garamond",
    description: "The book face invitations have used for four hundred years.",
    voice: "Classical",
    displayFont: "var(--font-garamond), Georgia, serif",
    bodyFont: CARDO,
  },
  {
    id: "baskerville",
    name: "Baskerville",
    description: "Sturdy and transitional. Reads as considered rather than fancy.",
    voice: "Classical",
    displayFont: "var(--font-baskerville), Georgia, serif",
    bodyFont: SANS,
    sizeAdjust: 0.88,
  },
  {
    id: "ceremonial",
    name: "Ceremonial",
    description: "Roman letterforms cut for inscriptions. Dignified and calm.",
    voice: "Classical",
    displayFont: "var(--font-marcellus), Georgia, serif",
    bodyFont: SANS,
    displayTracking: "0.01em",
  },
  {
    id: "grand",
    name: "Grand",
    description: "Carved capitals. Weighty — best for short names.",
    voice: "Classical",
    displayFont: "var(--font-cinzel), Georgia, serif",
    bodyFont: SANS,
    displayUppercase: true,
    displayTracking: "0.05em",
    sizeAdjust: 0.85,
  },
  {
    id: "upright",
    name: "Upright italic",
    description: "Calligraphic forms standing straight. Unusual and very elegant.",
    voice: "Classical",
    displayFont: "var(--font-cormorant-upright), Georgia, serif",
    bodyFont: SANS,
    sizeAdjust: 1.1,
  },
  {
    id: "cardo",
    name: "Scholarly",
    description: "An academic serif with real warmth in the lowercase.",
    voice: "Classical",
    displayFont: CARDO,
    bodyFont: SANS,
  },

  /* -------------------------------------------------------- editorial --- */
  {
    id: "editorial",
    name: "Editorial",
    description: "High contrast and fashionable. Reads like a magazine cover.",
    voice: "Editorial",
    displayFont: "var(--font-playfair), Georgia, serif",
    bodyFont: SANS,
  },
  {
    id: "didone",
    name: "Didone",
    description: "Hairline serifs and dramatic contrast. Very high fashion.",
    voice: "Editorial",
    displayFont: "var(--font-bodoni), Georgia, serif",
    bodyFont: SANS,
  },
  {
    id: "prata",
    name: "Prata",
    description: "A refined display serif with a slight flare. Understated luxury.",
    voice: "Editorial",
    displayFont: "var(--font-prata), Georgia, serif",
    bodyFont: SANS,
    sizeAdjust: 0.92,
  },
  {
    id: "gilda",
    name: "Gilda",
    description: "Delicate and a little literary. Suits long names.",
    voice: "Editorial",
    displayFont: "var(--font-gilda), Georgia, serif",
    bodyFont: SANS,
  },
  {
    id: "warm",
    name: "Warm",
    description: "A soft serif with character. Friendly rather than formal.",
    voice: "Editorial",
    displayFont: "var(--font-fraunces), Georgia, serif",
    bodyFont: SANS,
  },
  {
    id: "spectral",
    name: "Spectral",
    description: "A screen-first serif that stays crisp at any size.",
    voice: "Editorial",
    displayFont: SPECTRAL,
    bodyFont: SANS,
  },
  {
    id: "lora",
    name: "Lora",
    description: "Brushed serifs with a calligraphic root. Gentle and readable.",
    voice: "Editorial",
    displayFont: LORA,
    bodyFont: SANS,
  },

  /* ------------------------------------------------------------ deco --- */
  {
    id: "italiana",
    name: "Italiana",
    description: "Tall, fine capitals with deco proportions. Extremely refined.",
    voice: "Deco",
    displayFont: "var(--font-italiana), Georgia, serif",
    bodyFont: TENOR,
    displayTracking: "0.06em",
    sizeAdjust: 1.05,
  },
  {
    id: "poiret",
    name: "Poiret",
    description: "Thin geometric letterforms straight out of the twenties.",
    voice: "Deco",
    displayFont: "var(--font-poiret), system-ui, sans-serif",
    bodyFont: TENOR,
    displayTracking: "0.04em",
    sizeAdjust: 1.08,
  },
  {
    id: "tenor",
    name: "Tenor",
    description: "Quiet capitals with generous spacing. Gallery-invitation calm.",
    voice: "Deco",
    displayFont: TENOR,
    bodyFont: SANS,
    displayUppercase: true,
    displayTracking: "0.14em",
    sizeAdjust: 0.8,
  },
  {
    id: "josefin",
    name: "Josefin",
    description: "Geometric with a raised x-height. Vintage but clean.",
    voice: "Deco",
    displayFont: "var(--font-josefin), system-ui, sans-serif",
    bodyFont: SANS,
    sizeAdjust: 0.95,
  },

  /* ---------------------------------------------------------- modern --- */
  {
    id: "modern",
    name: "Modern",
    description: "A clean humanist sans. Contemporary and unfussy.",
    voice: "Modern",
    displayFont: "var(--font-jakarta), system-ui, sans-serif",
    bodyFont: SANS,
    displayTracking: "-0.01em",
  },
  {
    id: "geometric",
    name: "Geometric",
    description: "Open, circular and bright. Parties more than ceremonies.",
    voice: "Modern",
    displayFont: "var(--font-outfit), system-ui, sans-serif",
    bodyFont: SANS,
    displayTracking: "-0.005em",
  },
  {
    id: "grotesk",
    name: "Grotesk",
    description: "Slightly technical, with unusual details. Design-literate.",
    voice: "Modern",
    displayFont: "var(--font-space-grotesk), system-ui, sans-serif",
    bodyFont: SANS,
    displayTracking: "-0.02em",
  },
  {
    id: "syne",
    name: "Syne",
    description: "Wide, odd and confident. For something deliberately unusual.",
    voice: "Modern",
    displayFont: "var(--font-syne), system-ui, sans-serif",
    bodyFont: SANS,
    displayTracking: "-0.01em",
  },
  {
    id: "archivo",
    name: "Archivo",
    description: "A workhorse grotesque. Neutral and dependable.",
    voice: "Modern",
    displayFont: "var(--font-archivo), system-ui, sans-serif",
    bodyFont: SANS,
    displayTracking: "-0.015em",
  },

  /* ------------------------------------------------------------ bold --- */
  {
    id: "condensed",
    name: "Condensed",
    description: "Tall and narrow. Fits long names without shrinking them.",
    voice: "Bold",
    displayFont: "var(--font-oswald), system-ui, sans-serif",
    bodyFont: SANS,
    displayUppercase: true,
    displayTracking: "0.01em",
    sizeAdjust: 1.05,
  },
  {
    id: "poster",
    name: "Poster",
    description: "Heavy condensed capitals. Loud, in the best way.",
    voice: "Bold",
    displayFont: "var(--font-bebas), system-ui, sans-serif",
    bodyFont: SANS,
    displayUppercase: true,
    displayTracking: "0.02em",
    sizeAdjust: 1.2,
  },
  {
    id: "rozha",
    name: "Rozha",
    description: "A high-contrast display face with real weight and swagger.",
    voice: "Bold",
    displayFont: "var(--font-rozha), Georgia, serif",
    bodyFont: SANS,
    sizeAdjust: 0.95,
  },
  {
    id: "slab",
    name: "Slab",
    description: "Square serifs, sturdy and grounded.",
    voice: "Bold",
    displayFont: "var(--font-bitter), Georgia, serif",
    bodyFont: SANS,
    sizeAdjust: 0.9,
  },

  /* ---------------------------------------------------------- script --- */
  {
    id: "calligraphy",
    name: "Calligraphy",
    description: "Full copperplate script. The traditional wedding hand.",
    voice: "Script",
    displayFont: "var(--font-great-vibes), cursive",
    bodyFont: SANS,
    sizeAdjust: 1.35,
  },
  {
    id: "parisienne",
    name: "Parisienne",
    description: "A lighter script with a modern slant.",
    voice: "Script",
    displayFont: "var(--font-parisienne), cursive",
    bodyFont: SANS,
    sizeAdjust: 1.25,
  },
  {
    id: "dancing",
    name: "Dancing",
    description: "Bouncy and warm. Showers, birthdays, anything cheerful.",
    voice: "Script",
    displayFont: "var(--font-dancing), cursive",
    bodyFont: SANS,
    sizeAdjust: 1.15,
  },
  {
    id: "handwritten",
    name: "Handwritten",
    description: "Relaxed and personal, as if written out by hand.",
    voice: "Script",
    displayFont: "var(--font-caveat), cursive",
    bodyFont: SANS,
    sizeAdjust: 1.25,
  },
  {
    id: "chalk",
    name: "Chalk",
    description: "Narrow hand-lettered caps. Casual and a little rustic.",
    voice: "Script",
    displayFont: "var(--font-amatic), cursive",
    bodyFont: SANS,
    displayUppercase: true,
    sizeAdjust: 1.4,
  },
];

export function fontPairingById(id: string | null | undefined): FontPairing {
  return FONT_PAIRINGS.find((pairing) => pairing.id === id) ?? FONT_PAIRINGS[0]!;
}

export const TYPE_VOICES: TypeVoice[] = [
  "Classical",
  "Editorial",
  "Deco",
  "Modern",
  "Bold",
  "Script",
];

/** Display-face styling that varies by pairing, for a headline element. */
export function displayTypeStyle(fonts: FontPairing): {
  fontFamily: string;
  textTransform?: "uppercase";
  letterSpacing?: string;
} {
  return {
    fontFamily: fonts.displayFont,
    ...(fonts.displayUppercase ? { textTransform: "uppercase" as const } : {}),
    ...(fonts.displayTracking ? { letterSpacing: fonts.displayTracking } : {}),
  };
}
