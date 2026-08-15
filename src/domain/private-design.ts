/**
 * The design system for private invitations, assembled.
 *
 * The vocabulary lives in `domain/design/` — palettes, type pairings, background
 * motifs, border ornament and the template catalogue. This module is the seam:
 * it holds the host's five choices, resolves them into the flat shape every
 * renderer draws from, and keeps that shape serialisable so a theme built in a
 * server component survives the trip to a client one.
 */

import {
  BORDERS,
  borderById,
  type BorderStyle,
} from "./design/borders";
import {
  FONT_PAIRINGS,
  TYPE_VOICES,
  displayTypeStyle,
  fontPairingById,
  type FontPairing,
  type TypeVoice,
} from "./design/fonts";
import {
  MOTIFS,
  motifBackground,
  motifById,
  type Motif,
  type MotifFamily,
} from "./design/motifs";
import {
  PALETTES,
  PALETTE_FAMILIES,
  paletteById,
  type Palette,
} from "./design/palettes";
import {
  COLLECTIONS,
  DEFAULT_TEMPLATE_ID,
  INVITATION_TEMPLATES,
  templateById,
  type Collection,
  type InvitationTemplate,
} from "./design/templates";

export {
  BORDERS,
  borderById,
  FONT_PAIRINGS,
  TYPE_VOICES,
  displayTypeStyle,
  fontPairingById,
  MOTIFS,
  motifById,
  motifBackground,
  PALETTES,
  PALETTE_FAMILIES,
  paletteById,
  COLLECTIONS,
  DEFAULT_TEMPLATE_ID,
  INVITATION_TEMPLATES,
  templateById,
};
export type {
  BorderStyle,
  FontPairing,
  TypeVoice,
  Motif,
  MotifFamily,
  Palette,
  Collection,
  InvitationTemplate,
};

/* -------------------------------------------------------------------------- */
/* The host's choices                                                          */
/* -------------------------------------------------------------------------- */

export interface PrivateDesign {
  /** The art direction. Everything below moves underneath it. */
  templateId?: string;
  paletteId: string;
  fontId: string;
  /** Background motif. */
  backgroundId: string;
  /** Ornament. Absent means the template's own border stands. */
  borderId?: string;
  heroLayout: HeroLayoutId;
  /**
   * A palette the host built themselves, usually lifted from a photograph or
   * an invitation they liked. Used instead of `paletteId` when selected.
   */
  customPalette?: Palette | null;
}

export type HeroLayoutId = "OVERLAY" | "STACKED" | "FRAMED" | "TYPE_ONLY";

export interface HeroLayout {
  id: HeroLayoutId;
  name: string;
  description: string;
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

export const DEFAULT_DESIGN: PrivateDesign = {
  templateId: DEFAULT_TEMPLATE_ID,
  paletteId: "gold-ivory",
  fontId: "classic",
  backgroundId: "plain",
  heroLayout: "FRAMED",
};

export const CUSTOM_PALETTE_ID = "custom";

/** The palette in force: the host's own if they built one, else the preset. */
export function activePalette(design: PrivateDesign): Palette {
  if (design.paletteId === CUSTOM_PALETTE_ID && design.customPalette) {
    return design.customPalette;
  }
  return paletteById(design.paletteId);
}

/**
 * The six original themes, expressed in the new vocabulary.
 *
 * Pages saved before the design module carry only a `themeId`, and the seed
 * data still writes one. Mapping them here means an existing invitation renders
 * as it did — and the moment its host opens the studio, every axis is free.
 */
const LEGACY_THEME_DESIGNS: Record<string, PrivateDesign> = {
  "gold-ivory": { ...DEFAULT_DESIGN, paletteId: "gold-ivory", fontId: "classic" },
  botanical: { ...DEFAULT_DESIGN, paletteId: "botanical", fontId: "classic" },
  kitenge: { ...DEFAULT_DESIGN, paletteId: "kitenge", fontId: "modern" },
  midnight: { ...DEFAULT_DESIGN, paletteId: "midnight", fontId: "classic" },
  blush: { ...DEFAULT_DESIGN, paletteId: "blush", fontId: "classic" },
  slate: { ...DEFAULT_DESIGN, paletteId: "slate", fontId: "modern" },
};

export function designFromLegacyTheme(themeId: string | null | undefined): PrivateDesign {
  if (!themeId) return DEFAULT_DESIGN;
  return LEGACY_THEME_DESIGNS[themeId] ?? DEFAULT_DESIGN;
}

/** The design a template starts a host off with. */
export function designForTemplate(
  template: InvitationTemplate,
  base: PrivateDesign,
): PrivateDesign {
  return {
    ...base,
    templateId: template.id,
    paletteId: template.defaults.paletteId,
    fontId: template.defaults.fontId,
    backgroundId: template.defaults.motifId,
    borderId: template.borderId,
    customPalette: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The flat shape the microsite, the e-card and the studio preview render from.
 *
 * Every field is JSON-serialisable on purpose. This object is built on the
 * server and handed to client components, and React cannot send a function
 * across that boundary — so the motif's tile builder and the border's geometry
 * stay behind, and what survives is the CSS and the plain border spec.
 */
export interface ResolvedTheme {
  palette: Palette;
  fonts: FontPairing;
  border: BorderStyle;
  heroLayout: HeroLayout;
  motifId: string;
  motifName: string;

  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  ink: string;
  inkSoft: string;
  displayFont: string;
  bodyFont: string;
  /** Ground colour plus any motif tile, ready for a `style` prop. */
  pageBackground: string;
  dark: boolean;
}

export function resolveTheme(design: PrivateDesign): ResolvedTheme {
  const palette = activePalette(design);
  const fonts = fontPairingById(design.fontId);
  const motif = motifById(design.backgroundId);
  const heroLayout = heroLayoutById(design.heroLayout);

  // A template carries its own ornament; an explicit choice overrides it.
  const template = design.templateId ? templateById(design.templateId) : null;
  const border = borderById(design.borderId ?? template?.borderId ?? "none");

  return {
    palette,
    fonts,
    border,
    heroLayout,
    motifId: motif.id,
    motifName: motif.name,
    background: palette.background,
    surface: palette.surface,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    ink: palette.ink,
    inkSoft: palette.inkSoft,
    displayFont: fonts.displayFont,
    bodyFont: fonts.bodyFont,
    pageBackground: motifBackground(motif, palette.accent, palette.background),
    dark: palette.dark === true,
  };
}
