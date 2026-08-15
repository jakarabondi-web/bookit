/**
 * The design module for private invitations.
 *
 * A host used to pick one of six themes, each of which welded a palette, a
 * typeface and a layout together. Choosing "Gold & Ivory" because the colours
 * were right also chose the serif and the composition, and a family who wanted
 * kitenge colours with a modern face had no way to say so.
 *
 * The axes are independent here — palette, type, background, layout — so six
 * fixed themes become a few thousand combinations. What a host never does is
 * pick a hex code or a font size: every option on every axis is a curated,
 * named choice that has been checked against the others. An invitation that
 * looks wrong reflects on the family, not on us.
 *
 * `resolveTheme` collapses the four choices back into the flat `PrivateTheme`
 * the microsite and the e-card already render from, so nothing downstream has
 * to know the design was decomposed.
 */

/* -------------------------------------------------------------------------- */
/* Palette                                                                     */
/* -------------------------------------------------------------------------- */

export interface Palette {
  id: string;
  name: string;
  /** What this palette is for, in the host's terms. */
  description: string;
  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  ink: string;
  inkSoft: string;
  /** True when the ground is dark, so overlays and scrims flip. */
  dark?: boolean;
}

export const PALETTES: Palette[] = [
  {
    id: "gold-ivory",
    name: "Gold & Ivory",
    description: "Warm, classic and formal. Weddings and ruracio ceremonies.",
    background: "#FBF7F0",
    surface: "#FFFFFF",
    accent: "#B08544",
    accentSoft: "#F5EDDF",
    ink: "#2B241B",
    inkSoft: "#6B6053",
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Green and fresh. Garden ceremonies and daytime receptions.",
    background: "#F5F8F3",
    surface: "#FFFFFF",
    accent: "#3F6B4A",
    accentSoft: "#E4EFE5",
    ink: "#1F2A22",
    inkSoft: "#5A6B5E",
  },
  {
    id: "kitenge",
    name: "Kitenge",
    description: "Bold ochre and indigo, drawn from East African print.",
    background: "#FDF6EE",
    surface: "#FFFFFF",
    accent: "#C2571F",
    accentSoft: "#FBE7D6",
    ink: "#25211C",
    inkSoft: "#6B6157",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark and formal. Evening receptions, galas and dinners.",
    background: "#12151C",
    surface: "#1B1F29",
    accent: "#C9A227",
    accentSoft: "#2A2A22",
    ink: "#F5F3EF",
    inkSoft: "#A9A8A2",
    dark: true,
  },
  {
    id: "blush",
    name: "Blush",
    description: "Soft rose and cream. Bridal showers and intimate parties.",
    background: "#FDF5F5",
    surface: "#FFFFFF",
    accent: "#B4636F",
    accentSoft: "#F8E6E8",
    ink: "#2E2124",
    inkSoft: "#6E5B5F",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Understated and modern. Corporate dinners and alumni nights.",
    background: "#F6F7F9",
    surface: "#FFFFFF",
    accent: "#334155",
    accentSoft: "#E4E8EE",
    ink: "#0F172A",
    inkSoft: "#556070",
  },
  {
    id: "indigo-brass",
    name: "Indigo & Brass",
    description: "Deep resist-dye blue with brass. Formal and distinctly local.",
    background: "#F4F5F8",
    surface: "#FFFFFF",
    accent: "#23304F",
    accentSoft: "#E5E8F0",
    ink: "#171B26",
    inkSoft: "#565D70",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Earth reds and clay. Homestead gatherings and harvest meals.",
    background: "#FBF3EE",
    surface: "#FFFFFF",
    accent: "#A8492F",
    accentSoft: "#F7E2D8",
    ink: "#2A1D17",
    inkSoft: "#6E574C",
  },
  {
    id: "palm",
    name: "Palm & Sand",
    description: "Coastal green on warm sand. Beach and Mombasa celebrations.",
    background: "#FAF7EE",
    surface: "#FFFFFF",
    accent: "#2F6B5F",
    accentSoft: "#DFEDE7",
    ink: "#1D2622",
    inkSoft: "#586A63",
  },
  {
    id: "ink-white",
    name: "Ink & White",
    description: "Black on white, nothing else. Severe, modern, very quiet.",
    background: "#FFFFFF",
    surface: "#FAFAFA",
    accent: "#111111",
    accentSoft: "#EFEFEF",
    ink: "#111111",
    inkSoft: "#5B5B5B",
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0]!;
}

/* -------------------------------------------------------------------------- */
/* Type                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Type is chosen as a pairing, not as two separate fonts.
 *
 * Picking a display face and a body face independently is how invitations end
 * up with a Didone over a geometric sans. Each entry below is a pairing that
 * has been set together, so the single choice a host makes is "which voice",
 * not "which two families".
 */
export interface FontPairing {
  id: string;
  name: string;
  /** The mood, in plain words — this is what the host is really choosing. */
  description: string;
  displayFont: string;
  bodyFont: string;
  /** Ceremonial romans read as shouting unless they are set in caps. */
  displayUppercase?: boolean;
  /** Tightens or opens the display face to suit its natural fit. */
  displayTracking?: string;
}

const BODY_SANS = "var(--font-inter), system-ui, sans-serif";

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "classic",
    name: "Classic",
    description: "A quiet old-style serif. The safe, formal choice.",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: BODY_SANS,
  },
  {
    id: "ceremonial",
    name: "Ceremonial",
    description: "Roman letterforms cut for inscriptions. Dignified and calm.",
    displayFont: "var(--font-marcellus), Georgia, serif",
    bodyFont: BODY_SANS,
    displayTracking: "0.01em",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "High contrast and fashionable. Reads like a magazine cover.",
    displayFont: "var(--font-playfair), Georgia, serif",
    bodyFont: BODY_SANS,
  },
  {
    id: "warm",
    name: "Warm",
    description: "A soft serif with character. Friendly rather than formal.",
    displayFont: "var(--font-fraunces), Georgia, serif",
    bodyFont: BODY_SANS,
  },
  {
    id: "grand",
    name: "Grand",
    description: "Carved capitals. Weighty — best for short names.",
    displayFont: "var(--font-cinzel), Georgia, serif",
    bodyFont: BODY_SANS,
    displayUppercase: true,
    displayTracking: "0.04em",
  },
  {
    id: "modern",
    name: "Modern",
    description: "A clean humanist sans. Contemporary and unfussy.",
    displayFont: "var(--font-jakarta), system-ui, sans-serif",
    bodyFont: BODY_SANS,
    displayTracking: "-0.01em",
  },
  {
    id: "geometric",
    name: "Geometric",
    description: "Open, circular and bright. Suits parties more than ceremonies.",
    displayFont: "var(--font-outfit), system-ui, sans-serif",
    bodyFont: BODY_SANS,
    displayTracking: "-0.005em",
  },
  {
    id: "handwritten",
    name: "Handwritten",
    description: "Relaxed and personal. Birthdays, showers, anything informal.",
    displayFont: "var(--font-caveat), cursive",
    bodyFont: BODY_SANS,
  },
];

export function fontPairingById(id: string): FontPairing {
  return FONT_PAIRINGS.find((pairing) => pairing.id === id) ?? FONT_PAIRINGS[0]!;
}

/* -------------------------------------------------------------------------- */
/* Background                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Backgrounds are drawn, not photographed.
 *
 * Each motif is a small SVG tile generated from the chosen palette's own
 * accent, so a pattern can never clash with the colours around it and no
 * texture has to be uploaded, licensed or served. The geometry is the common
 * vocabulary of East African textile and beadwork — concentric diamonds,
 * zigzag courses, scalloped borders — rather than any particular design.
 */
export type BackgroundKind = "PLAIN" | "MOTIF" | "PHOTO";

export interface BackgroundStyle {
  id: string;
  name: string;
  description: string;
  kind: BackgroundKind;
  /** Builds the repeating tile. Absent for plain and photo grounds. */
  tile?: (accent: string) => string;
  /** How large the tile repeats, in CSS pixels. */
  size?: number;
}

/** Wraps an SVG source as a CSS-safe data URI. */
function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;
}

export const BACKGROUNDS: BackgroundStyle[] = [
  {
    id: "plain",
    name: "Plain",
    description: "Just the palette colour. Lets the type and photographs carry the page.",
    kind: "PLAIN",
  },
  {
    id: "grain",
    name: "Paper",
    description: "A faint speckle, like a printed card held up to the light.",
    kind: "MOTIF",
    size: 28,
    tile: (accent) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">
         <g fill="${accent}" opacity="0.16">
           <circle cx="3" cy="5" r="1"/><circle cx="17" cy="3" r="1"/>
           <circle cx="9" cy="14" r="1"/><circle cx="24" cy="12" r="1"/>
           <circle cx="14" cy="23" r="1"/><circle cx="2" cy="21" r="1"/>
         </g>
       </svg>`,
  },
  {
    id: "kitenge",
    name: "Kitenge",
    description: "Concentric diamonds, the way a wax print builds a field.",
    kind: "MOTIF",
    size: 56,
    tile: (accent) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56">
         <g fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.20">
           <path d="M28 6 L50 28 L28 50 L6 28 Z"/>
           <path d="M28 15 L41 28 L28 41 L15 28 Z"/>
           <path d="M28 24 L32 28 L28 32 L24 28 Z"/>
         </g>
       </svg>`,
  },
  {
    id: "beadwork",
    name: "Beadwork",
    description: "Courses of small triangles, borrowed from beaded collars.",
    kind: "MOTIF",
    size: 40,
    tile: (accent) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
         <g fill="${accent}" opacity="0.18">
           <path d="M0 12 L10 0 L20 12 Z"/><path d="M20 12 L30 0 L40 12 Z"/>
           <path d="M0 28 L10 40 L20 28 Z" opacity="0.7"/>
           <path d="M20 28 L30 40 L40 28 Z" opacity="0.7"/>
         </g>
       </svg>`,
  },
  {
    id: "kanga",
    name: "Kanga border",
    description: "A scalloped repeat, like the printed edge of a kanga.",
    kind: "MOTIF",
    size: 48,
    tile: (accent) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
         <g fill="none" stroke="${accent}" stroke-width="1.3" opacity="0.20">
           <path d="M0 24 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/>
           <path d="M0 40 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/>
           <path d="M0 8 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/>
         </g>
       </svg>`,
  },
  {
    id: "photo",
    name: "Your photograph",
    description: "The cover photo fills the page behind a soft wash of the palette.",
    kind: "PHOTO",
  },
];

export function backgroundById(id: string): BackgroundStyle {
  return BACKGROUNDS.find((background) => background.id === id) ?? BACKGROUNDS[0]!;
}

/* -------------------------------------------------------------------------- */
/* Hero layout                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How the top of the invitation is composed. This is the only axis that
 * changes structure rather than surface, which is why it is separate from the
 * e-card's own layout: a host can have a full-bleed microsite and a monogram
 * card, and often should.
 */
export type HeroLayoutId = "OVERLAY" | "STACKED" | "FRAMED" | "TYPE_ONLY";

export interface HeroLayout {
  id: HeroLayoutId;
  name: string;
  description: string;
  /** Whether this layout can show a cover photograph at all. */
  usesCover: boolean;
}

export const HERO_LAYOUTS: HeroLayout[] = [
  {
    id: "OVERLAY",
    name: "Names over photo",
    description: "Full-bleed photograph with the names across the lower third.",
    usesCover: true,
  },
  {
    id: "STACKED",
    name: "Photo above names",
    description: "The photograph sits on top, names on clean ground beneath it.",
    usesCover: true,
  },
  {
    id: "FRAMED",
    name: "Framed photo",
    description: "A bordered photograph inset from the edges, names below.",
    usesCover: true,
  },
  {
    id: "TYPE_ONLY",
    name: "Type only",
    description: "No photograph. The names and the date, set large.",
    usesCover: false,
  },
];

export function heroLayoutById(id: string): HeroLayout {
  return HERO_LAYOUTS.find((layout) => layout.id === id) ?? HERO_LAYOUTS[0]!;
}

/* -------------------------------------------------------------------------- */
/* The design, and resolving it                                                */
/* -------------------------------------------------------------------------- */

export interface PrivateDesign {
  /** The art direction. The four axes below move underneath it. */
  templateId?: string;
  paletteId: string;
  fontId: string;
  backgroundId: string;
  heroLayout: HeroLayoutId;
  /**
   * A palette the host built themselves, usually lifted from a photograph or an
   * invitation they liked. When present it is used instead of `paletteId`,
   * which is kept so switching back to a preset does not lose the custom one.
   */
  customPalette?: Palette | null;
}

export const DEFAULT_DESIGN: PrivateDesign = {
  templateId: "engraved",
  paletteId: "gold-ivory",
  fontId: "classic",
  backgroundId: "plain",
  heroLayout: "OVERLAY",
};

/** Marks the custom palette so the studio can tell it from a preset. */
export const CUSTOM_PALETTE_ID = "custom";

/** The palette in force: the host's own if they have built one, else the preset. */
export function activePalette(design: PrivateDesign): Palette {
  if (design.paletteId === CUSTOM_PALETTE_ID && design.customPalette) {
    return design.customPalette;
  }
  return paletteById(design.paletteId);
}

/**
 * The six original themes, expressed in the new axes.
 *
 * Pages saved before the design module existed carry only a `themeId`, and the
 * seed data still writes one. Mapping them here means an existing invitation
 * renders exactly as it did — and the moment its host opens the studio, they
 * can move any one axis without losing the other three.
 */
const LEGACY_THEME_DESIGNS: Record<string, PrivateDesign> = {
  "gold-ivory": { paletteId: "gold-ivory", fontId: "classic", backgroundId: "plain", heroLayout: "OVERLAY" },
  botanical: { paletteId: "botanical", fontId: "classic", backgroundId: "plain", heroLayout: "OVERLAY" },
  kitenge: { paletteId: "kitenge", fontId: "modern", backgroundId: "plain", heroLayout: "OVERLAY" },
  midnight: { paletteId: "midnight", fontId: "classic", backgroundId: "plain", heroLayout: "OVERLAY" },
  blush: { paletteId: "blush", fontId: "classic", backgroundId: "plain", heroLayout: "OVERLAY" },
  slate: { paletteId: "slate", fontId: "modern", backgroundId: "plain", heroLayout: "OVERLAY" },
};

export function designFromLegacyTheme(themeId: string | null | undefined): PrivateDesign {
  if (!themeId) return DEFAULT_DESIGN;
  return LEGACY_THEME_DESIGNS[themeId] ?? DEFAULT_DESIGN;
}

/**
 * The flat shape the microsite, the e-card and the studio preview render from.
 *
 * Everything above is authoring vocabulary; this is presentation. Keeping the
 * two separate is what lets a new axis be added later without touching a single
 * component that draws with these values.
 */
/**
 * Every field here must stay JSON-serialisable.
 *
 * A resolved theme is built in a server component and handed to client ones —
 * the RSVP form, the gift registry, the e-card. React cannot send a function
 * across that boundary, so the background's `tile` builder is deliberately
 * absent: what survives is the CSS it produced, on `pageBackground`.
 */
export interface ResolvedTheme {
  palette: Palette;
  fonts: FontPairing;
  heroLayout: HeroLayout;
  /** Which background was chosen. The tile builder itself stays server-side. */
  backgroundId: string;
  backgroundName: string;
  backgroundKind: BackgroundKind;

  /* Flattened for convenience — these are the names components already use.
     `background` stays the plain colour: dozens of call sites set it straight
     onto a `style` prop, and the motif tile lives on `pageBackground`. */
  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  ink: string;
  inkSoft: string;
  displayFont: string;
  bodyFont: string;
  /** Ready to drop into a `style` prop: colour plus any motif tile. */
  pageBackground: string;
  /** True when text on the ground must be light. */
  dark: boolean;
}

export function resolveTheme(design: PrivateDesign): ResolvedTheme {
  const palette = activePalette(design);
  const fonts = fontPairingById(design.fontId);
  const background = backgroundById(design.backgroundId);
  const heroLayout = heroLayoutById(design.heroLayout);

  const pageBackground =
    background.kind === "MOTIF" && background.tile
      ? `${svgUrl(background.tile(palette.accent))} repeat, ${palette.background}`
      : palette.background;

  return {
    palette,
    fonts,
    heroLayout,
    backgroundId: background.id,
    backgroundName: background.name,
    backgroundKind: background.kind,
    background: palette.background,
    surface: palette.surface,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    ink: palette.ink,
    inkSoft: palette.inkSoft,
    displayFont: fonts.displayFont,
    bodyFont: fonts.bodyFont,
    pageBackground,
    dark: palette.dark === true,
  };
}

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
