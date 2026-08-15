/**
 * Bookit Design Studio — the template engine.
 *
 * A template is data, not a component. Every design in the library is an array
 * of positioned elements over a fixed art board, plus the palettes, type system
 * and rules that keep it looking the way its designer intended. That is what
 * lets one renderer draw the whole library, an editor mutate any of it, and a
 * hundred variations exist without a hundred layout files.
 *
 * Two decisions worth stating up front.
 *
 * Elements address colour and type by *role* — "accent", "display" — never by
 * literal value. Swapping a palette is then a one-line change that cannot break
 * a design, and a template ships in six colourways for the price of one.
 *
 * Coordinates are in art-board units, not pixels. The board is 720 × 1008,
 * which is 5 × 7 inches at 144 units per inch — so print maths is exact, and
 * the renderer scales the whole board to whatever box it is given.
 */

/* -------------------------------------------------------------------------- */
/* Art board                                                                   */
/* -------------------------------------------------------------------------- */

/** 144 units per inch: 5 × 7in, A5 and square all land on whole numbers. */
export const UNITS_PER_INCH = 144;

export interface CanvasSize {
  width: number;
  height: number;
  /** Physical size, for print export and bleed maths. */
  inches: { width: number; height: number };
}

export const CANVAS_SIZES = {
  /** The standard invitation. */
  invitation: { width: 720, height: 1008, inches: { width: 5, height: 7 } },
  /** Landscape, for menus and programmes that read across. */
  landscape: { width: 1008, height: 720, inches: { width: 7, height: 5 } },
  square: { width: 864, height: 864, inches: { width: 6, height: 6 } },
  /** Place cards and table numbers. */
  place: { width: 504, height: 360, inches: { width: 3.5, height: 2.5 } },
  /** Instagram story. */
  story: { width: 608, height: 1080, inches: { width: 4.22, height: 7.5 } },
} as const satisfies Record<string, CanvasSize>;

export type CanvasSizeName = keyof typeof CANVAS_SIZES;

/* -------------------------------------------------------------------------- */
/* Colour and type roles                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Elements name a role; the palette supplies the value.
 *
 * `ink` is the main text colour, `accent` the metal or ornament colour,
 * `muted` the quiet supporting text, `surface` a panel behind content, and
 * `ground` the board itself.
 */
export type ColorRole = "ground" | "surface" | "ink" | "muted" | "accent" | "accentSoft";

export type FontRole = "display" | "body" | "accent";

export interface TemplatePalette {
  id: string;
  name: string;
  ground: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  /** True when the ground is dark, so photographic scrims and shadows flip. */
  dark?: boolean;
}

export interface FontSystem {
  /** The face the names are set in. */
  display: string;
  /** Supporting copy and metadata. */
  body: string;
  /** Optional third face, used sparingly — a script or a small-caps roman. */
  accent?: string;
}

/* -------------------------------------------------------------------------- */
/* Material effects                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Print finishes, simulated.
 *
 * These are deliberately understated. Foil on a screen is a narrow band of
 * warm highlight across the letterform, not a glowing gradient; letterpress is
 * an inset shadow a fraction of a pixel deep. Anything louder reads as costume
 * jewellery, which is the opposite of the effect a real finish has.
 */
export type MaterialEffect =
  | "none"
  | "foil-gold"
  | "foil-silver"
  | "foil-rose"
  | "letterpress"
  | "emboss"
  | "deboss";

/** Paper the board is printed on. */
export type PaperStock = "none" | "cotton" | "handmade" | "linen" | "vellum";

/* -------------------------------------------------------------------------- */
/* Elements                                                                    */
/* -------------------------------------------------------------------------- */

export interface BaseDesignElement {
  id: string;
  type: string;
  /** Art-board units, from the top-left of the board. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  /** Locked elements are part of the design, not the content. */
  locked: boolean;
  zIndex: number;
  /** Hidden without being deleted, so a host can try a composition without it. */
  hidden?: boolean;
}

export type TextAlign = "left" | "center" | "right";

export interface TextElement extends BaseDesignElement {
  type: "text";
  /** May contain `{{couple.firstName}}`-style bindings. */
  content: string;
  fontRole: FontRole;
  /** Art-board units, so type scales with the board. */
  fontSize: number;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
  lineHeight: number;
  letterSpacing: number;
  align: TextAlign;
  colorRole: ColorRole;
  uppercase?: boolean;
  effect?: MaterialEffect;
  /** Vertical placement inside the element box. */
  verticalAlign?: "top" | "middle" | "bottom";
}

export interface ImageElement extends BaseDesignElement {
  type: "image";
  src: string | null;
  /** 0–1 within the frame, so a face can be kept in shot on any crop. */
  focalX: number;
  focalY: number;
  fit: "cover" | "contain";
  /** Cut the photograph to a shape. */
  mask?: "none" | "arch" | "circle" | "rounded";
  brightness?: number;
  contrast?: number;
  saturation?: number;
  radius?: number;
}

export interface ShapeElement extends BaseDesignElement {
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arch" | "hexagon" | "shield";
  fillRole?: ColorRole | null;
  strokeRole?: ColorRole | null;
  strokeWidth: number;
  radius?: number;
  dashed?: boolean;
}

/**
 * A drawn ornament — a corner flourish, a fleuron, a botanical sprig.
 *
 * `art` names a drawing in the vector library rather than carrying path data,
 * so the same ornament can be improved once and every template that uses it
 * improves with it.
 */
export interface VectorElement extends BaseDesignElement {
  type: "vector";
  art: string;
  colorRole: ColorRole;
  strokeWidth?: number;
}

/** A repeating field, drawn from the palette. */
export interface PatternElement extends BaseDesignElement {
  type: "pattern";
  motif: string;
  colorRole: ColorRole;
  /** Tile edge in art-board units. */
  scale: number;
  /** Patterns sit under content, so they are kept quiet by default. */
  patternOpacity: number;
}

export interface MonogramElement extends BaseDesignElement {
  type: "monogram";
  style: "plain" | "circle" | "diamond" | "shield" | "stacked" | "slashed" | "seal";
  /** Falls back to the couple's initials when empty. */
  text: string | null;
  fontRole: FontRole;
  fontSize: number;
  colorRole: ColorRole;
  strokeRole?: ColorRole;
  effect?: MaterialEffect;
}

/** A rule with an ornament set into it. */
export interface DividerElement extends BaseDesignElement {
  type: "divider";
  style: "rule" | "diamond" | "dots" | "fleuron" | "double";
  colorRole: ColorRole;
  strokeWidth: number;
}

export interface QRCodeElement extends BaseDesignElement {
  type: "qr";
  /** Usually a binding — the guest's own RSVP link. */
  value: string;
  colorRole: ColorRole;
  caption?: string;
}

export type DesignElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | VectorElement
  | PatternElement
  | MonogramElement
  | DividerElement
  | QRCodeElement;

/* -------------------------------------------------------------------------- */
/* Design rules                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What Designer Mode protects.
 *
 * A host who drags the names two units left and sets them in a fourth typeface
 * has not customised the invitation, they have broken it. These rules are the
 * designer staying in the room: the margins hold, the type stays on its scale,
 * and the elements that carry the composition cannot be moved. Creative Mode
 * turns them off for anyone who genuinely wants the freedom.
 */
export interface DesignRules {
  maxFonts: number;
  allowedFontRoles: FontRole[];
  /** Art-board units kept clear at every edge. */
  minMargin: number;
  recommendedTextSizes: {
    names?: number;
    heading?: number;
    body?: number;
    metadata?: number;
  };
  /** Element ids that hold the composition and cannot be moved or deleted. */
  lockedElements: string[];
  /** Element ids a host may remove without the design falling apart. */
  optionalElements: string[];
}

/* -------------------------------------------------------------------------- */
/* Stationery                                                                  */
/* -------------------------------------------------------------------------- */

/** Every piece a coordinated event identity can carry. */
export type SuitePieceKind =
  | "invitation"
  | "saveTheDate"
  | "rsvp"
  | "details"
  | "programme"
  | "menu"
  | "placeCard"
  | "tableNumber"
  | "seatingChart"
  | "welcomeSign"
  | "thankYou"
  | "mobile"
  | "story";

export interface SuitePiece {
  kind: SuitePieceKind;
  name: string;
  size: CanvasSizeName;
  elements: DesignElement[];
}

/* -------------------------------------------------------------------------- */
/* A template                                                                  */
/* -------------------------------------------------------------------------- */

export type EventKind =
  | "wedding"
  | "traditional-wedding"
  | "ruracio"
  | "engagement"
  | "anniversary"
  | "birthday"
  | "baby-shower"
  | "graduation"
  | "banquet"
  | "corporate"
  | "private-dinner"
  | "religious"
  | "meeting"
  | "other";

export type DesignDirection =
  | "editorial"
  | "modern-luxury"
  | "romantic"
  | "black-tie"
  | "contemporary-african"
  | "traditional"
  | "minimal"
  | "botanical"
  | "regal"
  | "coastal"
  | "architectural"
  | "garden"
  | "artistic"
  | "monochrome"
  | "glamorous"
  | "photography-led";

export interface BookitTemplate {
  id: string;
  slug: string;
  name: string;
  /** The master collection this belongs to. */
  collection: string;
  /** One line, in the language a stationer would use. */
  tagline: string;
  /** A paragraph for the preview page. */
  description: string;

  directions: DesignDirection[];
  events: EventKind[];
  /**
   * Cultural reference, phrased as inspiration rather than as a claim of
   * ceremonial authenticity — see the cultural policy in the studio docs.
   */
  culturalTags?: string[];

  size: CanvasSizeName;
  elements: DesignElement[];
  palettes: TemplatePalette[];
  fontSystem: FontSystem;
  designRules: DesignRules;
  /** Paper the board is presented on in previews and mockups. */
  paper: PaperStock;

  /** Coordinated pieces. The invitation is `elements`; these are the rest. */
  suite: SuitePiece[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function canvasFor(template: BookitTemplate): CanvasSize {
  return CANVAS_SIZES[template.size];
}

export function paletteFor(template: BookitTemplate, paletteId?: string | null): TemplatePalette {
  if (!paletteId) return template.palettes[0]!;
  return template.palettes.find((palette) => palette.id === paletteId) ?? template.palettes[0]!;
}

export function colorFor(palette: TemplatePalette, role: ColorRole): string {
  return palette[role];
}

export function fontFor(fonts: FontSystem, role: FontRole): string {
  if (role === "display") return fonts.display;
  if (role === "accent") return fonts.accent ?? fonts.body;
  return fonts.body;
}

/** Elements in paint order. */
export function sortedElements(elements: DesignElement[]): DesignElement[] {
  return [...elements].sort((a, b) => a.zIndex - b.zIndex);
}
