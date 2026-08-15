/**
 * The ornament library.
 *
 * Border work is what separates an invitation that looks printed from one that
 * looks typed. This is the vocabulary: concentric rules, corner devices, full
 * engraved bands and shaped edges, each described as data rather than drawn
 * here.
 *
 * Everything is a plain object on purpose. A border spec is resolved on the
 * server and handed to client components, so it must survive JSON — the SVG is
 * built from the spec at render time, in the palette's own accent, at whatever
 * size the card happens to be.
 */

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

/** A plain rule inset from the card edge. Several make a classical border. */
export interface RuleSpec {
  /** Distance from the card edge, in design units (before scaling). */
  inset: number;
  width: number;
  /** 0–1. Lower values let a second rule read as a shadow of the first. */
  opacity: number;
  /** Corner radius, for borders that follow a rounded card. */
  radius?: number;
  dashed?: boolean;
}

/** A device drawn at each of the four corners. */
export type CornerKind =
  /** Two short arms meeting at a right angle. Quiet, architectural. */
  | "BRACKET"
  /** A quarter-round of radiating lines. Art deco. */
  | "FAN"
  /** A curling vine terminal. Art nouveau. */
  | "FLOURISH"
  /** A small leafed stem. Botanical, for garden work. */
  | "SPRIG"
  /** Stepped rectangles. Deco, geometric. */
  | "STEP"
  /** A single filled lozenge. The engraver's full stop. */
  | "LOZENGE"
  /** A quarter arc. Soft, modern. */
  | "ARC"
  /** Crossed hairlines extending past the corner — a printer's registration mark. */
  | "TICK";

export interface CornerSpec {
  kind: CornerKind;
  /** Arm length or motif size, in design units. */
  size: number;
  inset: number;
  opacity?: number;
}

/** A repeating band of ornament, run along edges. */
export type BandKind =
  | "GREEK_KEY"
  | "VINE"
  | "GUILLOCHE"
  | "BEAD"
  | "ROPE"
  | "CHAIN"
  | "DIAMOND_RUN"
  | "DENTIL"
  | "WAVE"
  | "ZIGZAG"
  | "TRIANGLE_RUN"
  | "BLOCK_DASH";

export interface BandSpec {
  kind: BandKind;
  height: number;
  /** Which edges carry the band. */
  edges: "TOP_BOTTOM" | "ALL" | "TOP" | "BOTTOM" | "LEFT";
  inset: number;
  opacity?: number;
  /** Solid bands read as printed cloth; outlined ones as engraving. */
  filled?: boolean;
}

/** A shape sat behind the names — a cartouche, medallion or crest. */
export type PlateKind = "NONE" | "OVAL" | "ARCH" | "SHIELD" | "ROUNDED" | "HEXAGON";

export interface PlateSpec {
  kind: PlateKind;
  /** Fill opacity over the ground. 0 leaves it as an outline only. */
  fill: number;
  stroke: boolean;
}

/* -------------------------------------------------------------------------- */
/* A border                                                                    */
/* -------------------------------------------------------------------------- */

export interface BorderStyle {
  id: string;
  name: string;
  description: string;
  /** Rough weight, so the gallery can offer "quiet" and "elaborate". */
  weight: "NONE" | "LIGHT" | "MEDIUM" | "HEAVY";
  rules?: RuleSpec[];
  corner?: CornerSpec;
  band?: BandSpec;
  plate?: PlateSpec;
}

export const BORDERS: BorderStyle[] = [
  {
    id: "none",
    name: "None",
    description: "No border. The type and the ground do all the work.",
    weight: "NONE",
  },

  /* ------------------------------------------------------------ rules --- */
  {
    id: "hairline",
    name: "Hairline",
    description: "A single fine rule, held well inside the edge.",
    weight: "LIGHT",
    rules: [{ inset: 14, width: 1, opacity: 0.6 }],
  },
  {
    id: "double-rule",
    name: "Double rule",
    description: "Two rules, one heavy and one fine. The engraver's border.",
    weight: "MEDIUM",
    rules: [
      { inset: 12, width: 1.6, opacity: 1 },
      { inset: 18, width: 0.8, opacity: 0.55 },
    ],
  },
  {
    id: "triple-rule",
    name: "Triple rule",
    description: "Three rules stepping inward. Formal to the point of severity.",
    weight: "HEAVY",
    rules: [
      { inset: 10, width: 2.2, opacity: 1 },
      { inset: 16, width: 0.8, opacity: 0.5 },
      { inset: 20, width: 0.8, opacity: 0.5 },
    ],
  },
  {
    id: "inner-panel",
    name: "Inner panel",
    description: "A deep single rule that frames the type as a panel.",
    weight: "MEDIUM",
    rules: [{ inset: 24, width: 1, opacity: 0.75 }],
  },
  {
    id: "dashed-rule",
    name: "Dashed rule",
    description: "A broken rule, like a card meant to be torn along it.",
    weight: "LIGHT",
    rules: [{ inset: 14, width: 1, opacity: 0.7, dashed: true }],
  },
  {
    id: "rounded-rule",
    name: "Rounded rule",
    description: "A soft-cornered rule. Modern and unfussy.",
    weight: "LIGHT",
    rules: [{ inset: 14, width: 1.2, opacity: 0.7, radius: 18 }],
  },

  /* ---------------------------------------------------------- corners --- */
  {
    id: "corner-brackets",
    name: "Corner brackets",
    description: "Four right angles marking the field, and nothing between them.",
    weight: "LIGHT",
    corner: { kind: "BRACKET", size: 26, inset: 14 },
  },
  {
    id: "corner-ticks",
    name: "Registration marks",
    description: "Crossed hairlines at each corner, as a printer would set them.",
    weight: "LIGHT",
    corner: { kind: "TICK", size: 18, inset: 16, opacity: 0.8 },
  },
  {
    id: "deco-fans",
    name: "Deco fans",
    description: "Radiating quarter-fans in each corner. Nineteen-twenties.",
    weight: "MEDIUM",
    corner: { kind: "FAN", size: 34, inset: 12 },
    rules: [{ inset: 12, width: 1, opacity: 0.5 }],
  },
  {
    id: "deco-steps",
    name: "Deco steps",
    description: "Stepped corners with a fine rule between. Geometric and confident.",
    weight: "MEDIUM",
    corner: { kind: "STEP", size: 28, inset: 12 },
    rules: [{ inset: 18, width: 0.8, opacity: 0.45 }],
  },
  {
    id: "nouveau-flourish",
    name: "Nouveau flourish",
    description: "Curling terminals in each corner. Ornate without being busy.",
    weight: "MEDIUM",
    corner: { kind: "FLOURISH", size: 38, inset: 10 },
  },
  {
    id: "botanical-sprigs",
    name: "Botanical sprigs",
    description: "A small leafed stem at each corner. Garden ceremonies.",
    weight: "MEDIUM",
    corner: { kind: "SPRIG", size: 36, inset: 12 },
  },
  {
    id: "lozenge-corners",
    name: "Lozenge corners",
    description: "A filled diamond at each corner of a fine rule.",
    weight: "LIGHT",
    corner: { kind: "LOZENGE", size: 9, inset: 14 },
    rules: [{ inset: 14, width: 0.9, opacity: 0.6 }],
  },
  {
    id: "arc-corners",
    name: "Arc corners",
    description: "Quarter arcs softening each corner. Quiet and contemporary.",
    weight: "LIGHT",
    corner: { kind: "ARC", size: 30, inset: 14 },
  },

  /* ------------------------------------------------------------ bands --- */
  {
    id: "greek-key",
    name: "Greek key",
    description: "A meander running top and bottom. Classical and architectural.",
    weight: "HEAVY",
    band: { kind: "GREEK_KEY", height: 16, edges: "TOP_BOTTOM", inset: 0, opacity: 0.85 },
  },
  {
    id: "greek-key-full",
    name: "Greek key, all round",
    description: "The meander carried round all four edges. Very formal.",
    weight: "HEAVY",
    band: { kind: "GREEK_KEY", height: 14, edges: "ALL", inset: 8, opacity: 0.8 },
  },
  {
    id: "vine-band",
    name: "Vine",
    description: "A running vine above and below the type.",
    weight: "MEDIUM",
    band: { kind: "VINE", height: 18, edges: "TOP_BOTTOM", inset: 10, opacity: 0.75 },
  },
  {
    id: "guilloche",
    name: "Guilloché",
    description: "Interlaced arcs, as engraved on a banknote. Fine and precise.",
    weight: "MEDIUM",
    band: { kind: "GUILLOCHE", height: 16, edges: "TOP_BOTTOM", inset: 12, opacity: 0.7 },
  },
  {
    id: "bead-band",
    name: "Beaded rule",
    description: "A course of small beads. Borrowed from beaded collars.",
    weight: "MEDIUM",
    band: { kind: "BEAD", height: 12, edges: "TOP_BOTTOM", inset: 14, opacity: 0.9, filled: true },
  },
  {
    id: "rope-band",
    name: "Rope",
    description: "A twisted cord along the head and foot. Coastal and nautical.",
    weight: "MEDIUM",
    band: { kind: "ROPE", height: 14, edges: "TOP_BOTTOM", inset: 12, opacity: 0.8 },
  },
  {
    id: "chain-band",
    name: "Chain",
    description: "Interlocking links. Graphic and a little industrial.",
    weight: "MEDIUM",
    band: { kind: "CHAIN", height: 14, edges: "TOP_BOTTOM", inset: 12, opacity: 0.75 },
  },
  {
    id: "dentil",
    name: "Dentil",
    description: "Square teeth, like the moulding under a cornice.",
    weight: "MEDIUM",
    band: { kind: "DENTIL", height: 12, edges: "TOP_BOTTOM", inset: 12, opacity: 0.85, filled: true },
  },
  {
    id: "diamond-run",
    name: "Diamond run",
    description: "A row of open diamonds. Reads as woven rather than printed.",
    weight: "MEDIUM",
    band: { kind: "DIAMOND_RUN", height: 14, edges: "TOP_BOTTOM", inset: 12, opacity: 0.7 },
  },
  {
    id: "kanga-blocks",
    name: "Kanga blocks",
    description: "Solid printed blocks at head and foot, the way a kanga is bordered.",
    weight: "HEAVY",
    band: { kind: "BLOCK_DASH", height: 22, edges: "TOP_BOTTOM", inset: 0, opacity: 0.95, filled: true },
  },
  {
    id: "triangle-run",
    name: "Triangle run",
    description: "Courses of filled triangles. Beadwork geometry.",
    weight: "HEAVY",
    band: { kind: "TRIANGLE_RUN", height: 16, edges: "TOP_BOTTOM", inset: 0, opacity: 0.8, filled: true },
  },
  {
    id: "wave-band",
    name: "Wave",
    description: "A rolling line at head and foot. Coastal and relaxed.",
    weight: "LIGHT",
    band: { kind: "WAVE", height: 14, edges: "TOP_BOTTOM", inset: 14, opacity: 0.7 },
  },
  {
    id: "zigzag-band",
    name: "Zigzag",
    description: "A sharp chevron course. Bold and rhythmic.",
    weight: "MEDIUM",
    band: { kind: "ZIGZAG", height: 14, edges: "TOP_BOTTOM", inset: 12, opacity: 0.75 },
  },
  {
    id: "side-rule",
    name: "Side rule",
    description: "A single heavy rule down the left edge. Editorial.",
    weight: "LIGHT",
    band: { kind: "BLOCK_DASH", height: 5, edges: "LEFT", inset: 0, opacity: 1, filled: true },
  },


  /* ----------------------------------------------------------- plates --- */
  {
    id: "oval-plate",
    name: "Oval cartouche",
    description: "The names held inside an engraved oval.",
    weight: "MEDIUM",
    plate: { kind: "OVAL", fill: 0, stroke: true },
    rules: [{ inset: 12, width: 0.8, opacity: 0.4 }],
  },
  {
    id: "shield-crest",
    name: "Crest",
    description: "A shield behind the monogram. Ceremonial and heraldic.",
    weight: "HEAVY",
    plate: { kind: "SHIELD", fill: 0.08, stroke: true },
    corner: { kind: "LOZENGE", size: 7, inset: 13 },
    rules: [{ inset: 13, width: 0.9, opacity: 0.5 }],
  },
  {
    id: "arch-plate",
    name: "Arched plate",
    description: "An arched panel behind the names, like a chapel window.",
    weight: "MEDIUM",
    plate: { kind: "ARCH", fill: 0.06, stroke: true },
  },
  {
    id: "hex-plate",
    name: "Hexagon",
    description: "A six-sided plate. Geometric and a little deco.",
    weight: "MEDIUM",
    plate: { kind: "HEXAGON", fill: 0, stroke: true },
  },
  {
    id: "soft-plate",
    name: "Soft panel",
    description: "A quiet rounded panel lifting the type off the ground.",
    weight: "LIGHT",
    plate: { kind: "ROUNDED", fill: 0.1, stroke: false },
  },
];

export function borderById(id: string | null | undefined): BorderStyle {
  return BORDERS.find((border) => border.id === id) ?? BORDERS[0]!;
}
