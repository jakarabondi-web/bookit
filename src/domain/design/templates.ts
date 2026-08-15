/**
 * The template catalogue.
 *
 * Each entry is a finished, art-directed invitation: a composition, an ornament,
 * a ground, a type pairing and a palette that were chosen together. The four
 * axes then move underneath whichever one a host picks, so a template is a
 * starting point rather than a cage.
 *
 * They are authored as data rather than as a hundred layout files because the
 * differences between them are real but bounded — where the names break, what
 * holds the page, what is set in caps. One renderer draws all of them, which is
 * what stops the hundredth template being the hundredth near-copy of the first.
 */

export type Composition =
  | "CENTRED"
  | "ASYMMETRIC"
  | "BANDED"
  | "ARCH"
  | "POSTER"
  | "SPLIT"
  | "PLATE"
  | "STACKED_RULES"
  | "CORNER";

export type NameSetting = "INLINE" | "STACKED_AMPERSAND" | "STACKED_PLAIN" | "INITIALS_LARGE";
export type MonogramStyle = "NONE" | "CIRCLE" | "DIAMOND" | "PLAIN_INITIALS" | "SHIELD";
export type PhotoPlacement = "NONE" | "TOP" | "SIDE" | "ARCH" | "FULL_BLEED" | "CIRCLE";
export type EyebrowStyle = "CAPS_TRACKED" | "SMALL_ITALIC" | "RULED" | "HIDDEN";
export type DividerStyle = "RULE" | "DIAMOND" | "DOTS" | "ORNAMENT" | "NONE";
export type DateStyle = "WORDS" | "NUMERAL" | "STAMP" | "STACKED" | "RULED";

export type Collection =
  | "Ceremony"
  | "Classic"
  | "Editorial"
  | "Deco"
  | "Botanical"
  | "Coastal"
  | "Minimal"
  | "Celebration"
  | "Gala"
  | "Playful";

export interface InvitationTemplate {
  id: string;
  name: string;
  description: string;
  collection: Collection;

  composition: Composition;
  borderId: string;
  nameSetting: NameSetting;
  monogram: MonogramStyle;
  photo: PhotoPlacement;

  nameUppercase?: boolean;
  nameScale: number;
  nameTracking?: string;

  eyebrow: EyebrowStyle;
  divider: DividerStyle;
  dateStyle: DateStyle;

  defaults: {
    paletteId: string;
    fontId: string;
    motifId: string;
  };
}

/** Compact authoring shorthand — the catalogue below is long enough already. */
function t(
  id: string,
  name: string,
  collection: Collection,
  description: string,
  spec: Omit<InvitationTemplate, "id" | "name" | "collection" | "description">,
): InvitationTemplate {
  return { id, name, collection, description, ...spec };
}

export const INVITATION_TEMPLATES: InvitationTemplate[] = [
  /* ============================================================ CEREMONY == */
  t("ruracio-split", "Ruracio", "Ceremony", "Two families either side of a rule, because the ceremony joins households rather than individuals.", {
    composition: "SPLIT", borderId: "corner-brackets", nameSetting: "INLINE", monogram: "DIAMOND", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "terracotta", fontId: "ceremonial", motifId: "beadwork" },
  }),
  t("ruracio-beaded", "Beaded Ruracio", "Ceremony", "Beadwork courses at head and foot, names held in the clear field between.", {
    composition: "BANDED", borderId: "bead-band", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1.1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "kitenge", fontId: "ceremonial", motifId: "kitenge" },
  }),
  t("kanga-blocks", "Kanga", "Ceremony", "Printed blocks top and bottom, the way a kanga carries its saying.", {
    composition: "BANDED", borderId: "kanga-blocks", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "TOP",
    nameScale: 1.15, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "kitenge", fontId: "classic", motifId: "kanga" },
  }),
  t("mudcloth", "Bogolan", "Ceremony", "Hand-drawn marks across the ground, with a plain corner frame.", {
    composition: "CENTRED", borderId: "corner-brackets", nameSetting: "INLINE", monogram: "PLAIN_INITIALS", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STAMP",
    defaults: { paletteId: "cocoa", fontId: "slab", motifId: "mudcloth" },
  }),
  t("kente", "Kente", "Ceremony", "Woven bands crossing behind the names.", {
    composition: "PLATE", borderId: "soft-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "saffron", fontId: "ceremonial", motifId: "kente" },
  }),
  t("adinkra", "Adinkra", "Ceremony", "Stamped symbols set in a grid behind an open centre.", {
    composition: "CENTRED", borderId: "triangle-run", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "clay", fontId: "cardo", motifId: "adinkra" },
  }),
  t("homestead", "Homestead", "Ceremony", "Warm and plain-spoken, with corner marks and a stamped date.", {
    composition: "CENTRED", borderId: "corner-ticks", nameSetting: "INLINE", monogram: "PLAIN_INITIALS", photo: "TOP",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STAMP",
    defaults: { paletteId: "palm", fontId: "ceremonial", motifId: "kitenge" },
  }),
  t("harambee", "Harambee", "Ceremony", "A bold triangle course and a shield for the family mark.", {
    composition: "CENTRED", borderId: "shield-crest", nameSetting: "INLINE", monogram: "SHIELD", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "emerald", fontId: "grand", motifId: "beadwork" },
  }),
  t("zellige-ceremony", "Zellige", "Ceremony", "Star tilework behind an oval cartouche.", {
    composition: "PLATE", borderId: "oval-plate", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "sapphire", fontId: "garamond", motifId: "zellige" },
  }),
  t("arabesque-ceremony", "Arabesque", "Ceremony", "Interlaced curves and a fine hairline.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "CIRCLE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "ORNAMENT", dateStyle: "WORDS",
    defaults: { paletteId: "indigo-brass", fontId: "garamond", motifId: "arabesque" },
  }),
  t("dowry", "Dowry", "Ceremony", "A heavy triple rule and inscriptional capitals.", {
    composition: "CENTRED", borderId: "triple-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.82, nameTracking: "0.06em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "gold-ivory", fontId: "grand", motifId: "plain" },
  }),
  t("village", "Village", "Ceremony", "Kitenge diamonds and a dashed edge, like a card to be kept.", {
    composition: "CENTRED", borderId: "dashed-rule", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "olive", fontId: "cardo", motifId: "kitenge" },
  }),

  /* ============================================================= CLASSIC == */
  t("engraved", "Engraved", "Classic", "The formal card, done properly: a double rule, a monogram, one axis.", {
    composition: "CENTRED", borderId: "double-rule", nameSetting: "INLINE", monogram: "CIRCLE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "gold-ivory", fontId: "classic", motifId: "plain" },
  }),
  t("engraved-triple", "Engraved, triple", "Classic", "Three rules stepping inward. Formal to the point of severity.", {
    composition: "CENTRED", borderId: "triple-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "champagne", fontId: "garamond", motifId: "plain" },
  }),
  t("greek-key", "Meander", "Classic", "A greek key running head and foot. Classical and architectural.", {
    composition: "BANDED", borderId: "greek-key", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.8, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "ink-white", fontId: "grand", motifId: "plain" },
  }),
  t("meander-full", "Meander, all round", "Classic", "The key carried round all four edges. Very formal.", {
    composition: "CENTRED", borderId: "greek-key-full", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.88, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "sapphire", fontId: "ceremonial", motifId: "plain" },
  }),
  t("guilloche", "Guilloché", "Classic", "Interlaced arcs, as engraved on a banknote.", {
    composition: "BANDED", borderId: "guilloche", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "emerald", fontId: "baskerville", motifId: "moire" },
  }),
  t("cartouche", "Cartouche", "Classic", "The names held inside an engraved oval.", {
    composition: "PLATE", borderId: "oval-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.92, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "gold-ivory", fontId: "garamond", motifId: "damask" },
  }),
  t("crest", "Crest", "Classic", "A shield behind the monogram. Ceremonial and heraldic.", {
    composition: "PLATE", borderId: "shield-crest", nameSetting: "INLINE", monogram: "SHIELD", photo: "NONE",
    nameScale: 0.9, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "burgundy", fontId: "grand", motifId: "plain" },
  }),
  t("damask-formal", "Damask", "Classic", "A state-room ground under a fine hairline.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "CIRCLE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "champagne", fontId: "classic", motifId: "damask" },
  }),
  t("dentil", "Dentil", "Classic", "Square teeth, like the moulding under a cornice.", {
    composition: "BANDED", borderId: "dentil", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.82, nameTracking: "0.07em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "graphite", fontId: "tenor", motifId: "plain" },
  }),
  t("lozenge", "Lozenge", "Classic", "A filled diamond at each corner of a fine rule.", {
    composition: "CENTRED", borderId: "lozenge-corners", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "oyster", fontId: "baskerville", motifId: "linen" },
  }),
  t("copperplate", "Copperplate", "Classic", "Full script over a quiet ground, with a double rule.", {
    composition: "CENTRED", borderId: "double-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "gold-ivory", fontId: "calligraphy", motifId: "plain" },
  }),
  t("upright-classic", "Upright", "Classic", "Calligraphic forms standing straight, inside a panel.", {
    composition: "CENTRED", borderId: "inner-panel", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "ORNAMENT", dateStyle: "WORDS",
    defaults: { paletteId: "blush", fontId: "upright", motifId: "plain" },
  }),
  t("vine-classic", "Vine", "Classic", "A running vine above and below the type.", {
    composition: "BANDED", borderId: "vine-band", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "botanical", fontId: "garamond", motifId: "plain" },
  }),
  t("initials", "Initials", "Classic", "The two initials set enormous, everything else small.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INITIALS_LARGE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "ink-white", fontId: "didone", motifId: "plain" },
  }),

  /* =========================================================== EDITORIAL == */
  t("editorial", "Editorial", "Editorial", "Flush left, ragged right, date as a large numeral.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameScale: 1.25, nameTracking: "-0.02em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "ink-white", fontId: "editorial", motifId: "plain" },
  }),
  t("masthead", "Masthead", "Editorial", "A ruled eyebrow above stacked names, like a title page.", {
    composition: "STACKED_RULES", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.2, eyebrow: "RULED", divider: "RULE", dateStyle: "RULED",
    defaults: { paletteId: "graphite", fontId: "didone", motifId: "plain" },
  }),
  t("vogue", "Vogue", "Editorial", "Didone capitals held wide over a full-bleed photograph.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "FULL_BLEED",
    nameUppercase: true, nameScale: 0.95, nameTracking: "0.1em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "obsidian", fontId: "didone", motifId: "plain" },
  }),
  t("sidebar", "Sidebar", "Editorial", "A heavy rule down the left edge, type running beside it.", {
    composition: "ASYMMETRIC", borderId: "side-rule", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.15, nameTracking: "-0.02em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "slate", fontId: "grotesk", motifId: "plain" },
  }),
  t("broadsheet", "Broadsheet", "Editorial", "Registration marks and a stacked date. Printer's furniture.", {
    composition: "STACKED_RULES", borderId: "corner-ticks", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.1, eyebrow: "RULED", divider: "RULE", dateStyle: "STACKED",
    defaults: { paletteId: "oyster", fontId: "spectral", motifId: "plain" },
  }),
  t("gallery", "Gallery", "Editorial", "Very quiet capitals with enormous spacing. A private view card.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "ink-white", fontId: "tenor", motifId: "plain" },
  }),
  t("cover", "Cover", "Editorial", "Names over a photograph, numeral date beneath.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameScale: 1.3, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "graphite", fontId: "prata", motifId: "plain" },
  }),
  t("syne-modern", "Wide", "Editorial", "Deliberately odd, wide letterforms. Design-literate.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameScale: 1.1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "lavender", fontId: "syne", motifId: "plain" },
  }),
  t("rozha-editorial", "Swagger", "Editorial", "A heavy display serif with real weight.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameScale: 1.15, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "burgundy", fontId: "rozha", motifId: "plain" },
  }),
  t("pinstripe-editorial", "Pinstripe", "Editorial", "Narrow rules behind a tailored setting.", {
    composition: "STACKED_RULES", borderId: "hairline", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.1, eyebrow: "RULED", divider: "RULE", dateStyle: "RULED",
    defaults: { paletteId: "indigo-brass", fontId: "archivo", motifId: "pinstripe" },
  }),
  t("marble-editorial", "Marble", "Editorial", "Slow veining behind quiet capitals.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.9, nameTracking: "0.12em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "oyster", fontId: "tenor", motifId: "marble" },
  }),
  t("terrazzo-editorial", "Terrazzo", "Editorial", "Scattered chips under a modern sans.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameScale: 1.15, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "coral", fontId: "geometric", motifId: "terrazzo" },
  }),

  /* ================================================================ DECO == */
  t("deco-fans", "Deco fans", "Deco", "Radiating quarter-fans in each corner. Nineteen-twenties.", {
    composition: "CENTRED", borderId: "deco-fans", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "midnight", fontId: "italiana", motifId: "deco-fan" },
  }),
  t("gatsby", "Gatsby", "Deco", "Stepped corners, sunburst ground, thin geometric capitals.", {
    composition: "CENTRED", borderId: "deco-steps", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.9, nameTracking: "0.1em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "ink-navy", fontId: "poiret", motifId: "sunburst" },
  }),
  t("chrysler", "Chrysler", "Deco", "Ziggurat steps repeating across the ground.", {
    composition: "CENTRED", borderId: "deco-steps", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.09em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STACKED",
    defaults: { paletteId: "obsidian", fontId: "josefin", motifId: "deco-steps" },
  }),
  t("hexagon-deco", "Hexagon", "Deco", "A six-sided plate holding the names.", {
    composition: "PLATE", borderId: "hex-plate", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "emerald", fontId: "italiana", motifId: "plain" },
  }),
  t("arcade-deco", "Arcade", "Deco", "A row of arches behind an arched plate.", {
    composition: "PLATE", borderId: "arch-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "champagne", fontId: "italiana", motifId: "arcade" },
  }),
  t("chain-deco", "Chain", "Deco", "Interlocking links at head and foot.", {
    composition: "BANDED", borderId: "chain-band", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "graphite", fontId: "poiret", motifId: "plain" },
  }),
  t("moire-deco", "Moiré", "Deco", "Fine concentric rings under a hairline frame.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "CIRCLE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "aubergine", fontId: "italiana", motifId: "moire" },
  }),
  t("zigzag-deco", "Zigzag", "Deco", "A sharp chevron course, bold and rhythmic.", {
    composition: "BANDED", borderId: "zigzag-band", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.88, nameTracking: "0.07em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "saffron", fontId: "josefin", motifId: "chevron" },
  }),
  t("sunburst-deco", "Sunburst", "Deco", "Rays spreading behind the names. Theatrical.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.95, nameTracking: "0.1em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "forest-night", fontId: "italiana", motifId: "sunburst" },
  }),
  t("scallop-deco", "Scallop", "Deco", "A scalloped edge with a fine inner rule.", {
    composition: "CENTRED", borderId: "inner-panel", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "blush", fontId: "poiret", motifId: "scales" },
  }),

  /* =========================================================== BOTANICAL == */
  t("garden-arch", "Garden", "Botanical", "The photograph in an arched window, type settling underneath.", {
    composition: "ARCH", borderId: "none", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "ARCH",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "botanical", fontId: "warm", motifId: "plain" },
  }),
  t("sprigs", "Sprigs", "Botanical", "A small leafed stem at each corner.", {
    composition: "CENTRED", borderId: "botanical-sprigs", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "botanical", fontId: "garamond", motifId: "toile-sprig" },
  }),
  t("eucalyptus", "Eucalyptus", "Botanical", "Round leaves trailing across the ground.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "olive", fontId: "lora", motifId: "eucalyptus" },
  }),
  t("toile", "Toile", "Botanical", "Scattered stems, as on printed cloth.", {
    composition: "CENTRED", borderId: "inner-panel", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "ORNAMENT", dateStyle: "WORDS",
    defaults: { paletteId: "powder", fontId: "garamond", motifId: "toile-sprig" },
  }),
  t("nouveau", "Nouveau", "Botanical", "Curling terminals in each corner. Ornate without being busy.", {
    composition: "CENTRED", borderId: "nouveau-flourish", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "emerald", fontId: "upright", motifId: "plain" },
  }),
  t("trellis", "Trellis", "Botanical", "A diagonal garden screen behind the names.", {
    composition: "PLATE", borderId: "soft-plate", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "seafoam", fontId: "lora", motifId: "lattice" },
  }),
  t("conservatory", "Conservatory", "Botanical", "An arched plate with a vine band beneath.", {
    composition: "PLATE", borderId: "arch-plate", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "botanical", fontId: "upright", motifId: "eucalyptus" },
  }),
  t("meadow", "Meadow", "Botanical", "Script names on an open field with a dotted divider.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "lavender", fontId: "parisienne", motifId: "toile-sprig" },
  }),
  t("orangery", "Orangery", "Botanical", "Arched head, botanical corners, warm ground.", {
    composition: "ARCH", borderId: "botanical-sprigs", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "ARCH",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "champagne", fontId: "warm", motifId: "plain" },
  }),
  t("herbarium", "Herbarium", "Botanical", "A specimen card: dashed rule, small caps, stamped date.", {
    composition: "CENTRED", borderId: "dashed-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STAMP",
    defaults: { paletteId: "olive", fontId: "cardo", motifId: "linen" },
  }),
  t("wildflower", "Wildflower", "Botanical", "Loose script over sprigs, no frame at all.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.15, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "dusty-rose", fontId: "dancing", motifId: "toile-sprig" },
  }),
  t("vine-arch", "Vine arch", "Botanical", "A vine band above and below an arched photograph.", {
    composition: "ARCH", borderId: "vine-band", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "ARCH",
    nameScale: 1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "botanical", fontId: "garamond", motifId: "plain" },
  }),

  /* ============================================================= COASTAL == */
  t("rope", "Rope", "Coastal", "A twisted cord along head and foot.", {
    composition: "BANDED", borderId: "rope-band", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "powder", fontId: "baskerville", motifId: "plain" },
  }),
  t("wave", "Wave", "Coastal", "A rolling line at head and foot. Relaxed.", {
    composition: "BANDED", borderId: "wave-band", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "TOP",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "seafoam", fontId: "lora", motifId: "plain" },
  }),
  t("dhow", "Dhow", "Coastal", "Swahili tilework under quiet capitals.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.1em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "sapphire", fontId: "tenor", motifId: "zellige" },
  }),
  t("palm-coastal", "Palm", "Coastal", "Fronds sweeping behind the names.", {
    composition: "CENTRED", borderId: "none", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "TOP",
    nameScale: 1.05, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "palm", fontId: "warm", motifId: "palm-frond" },
  }),
  t("scales-coastal", "Tide", "Coastal", "Overlapping arcs like tilework, with a soft panel.", {
    composition: "PLATE", borderId: "soft-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "seafoam", fontId: "spectral", motifId: "scales" },
  }),
  t("lamu", "Lamu", "Coastal", "Arabesque ground, arched plate, warm sand palette.", {
    composition: "PLATE", borderId: "arch-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "sand", fontId: "cardo", motifId: "arabesque" },
  }),
  t("sunset-coastal", "Sunset", "Coastal", "Full-bleed photograph with names across it.", {
    composition: "CENTRED", borderId: "none", nameSetting: "STACKED_AMPERSAND", monogram: "NONE", photo: "FULL_BLEED",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "coral", fontId: "parisienne", motifId: "plain" },
  }),
  t("driftwood", "Driftwood", "Coastal", "Linen ground, corner brackets, stamped date.", {
    composition: "CENTRED", borderId: "corner-brackets", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STAMP",
    defaults: { paletteId: "oyster", fontId: "slab", motifId: "linen" },
  }),
  t("reef", "Reef", "Coastal", "Honeycomb ground and a hexagon plate.", {
    composition: "PLATE", borderId: "hex-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "seafoam", fontId: "josefin", motifId: "hexagons" },
  }),
  t("harbour", "Harbour", "Coastal", "Chain band and condensed capitals.", {
    composition: "BANDED", borderId: "chain-band", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.9, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "ink-navy", fontId: "condensed", motifId: "plain" },
  }),

  /* ============================================================= MINIMAL == */
  t("bare", "Bare", "Minimal", "Names and a date. Nothing else on the page.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "HIDDEN", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "ink-white", fontId: "archivo", motifId: "plain" },
  }),
  t("rule-only", "One rule", "Minimal", "A single hairline and a great deal of space.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "oyster", fontId: "tenor", motifId: "plain" },
  }),
  t("quiet-caps", "Quiet caps", "Minimal", "Wide capitals, no ornament, no colour to speak of.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.8, nameTracking: "0.18em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "graphite", fontId: "tenor", motifId: "plain" },
  }),
  t("grid-minimal", "Grid", "Minimal", "A dot grid and a modern sans.", {
    composition: "STACKED_RULES", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "RULED", divider: "RULE", dateStyle: "RULED",
    defaults: { paletteId: "slate", fontId: "archivo", motifId: "dot-grid" },
  }),
  t("soft-minimal", "Soft", "Minimal", "A rounded rule and a gentle palette.", {
    composition: "CENTRED", borderId: "rounded-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "powder", fontId: "geometric", motifId: "plain" },
  }),
  t("mono-initials", "Monogram", "Minimal", "One circle, two initials, a date.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "CIRCLE", photo: "NONE",
    nameScale: 0.85, eyebrow: "HIDDEN", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "ink-white", fontId: "spectral", motifId: "plain" },
  }),
  t("photo-minimal", "Photograph", "Minimal", "A full-bleed photograph and the smallest possible type.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "FULL_BLEED",
    nameUppercase: true, nameScale: 0.75, nameTracking: "0.16em", eyebrow: "HIDDEN", divider: "NONE", dateStyle: "STACKED",
    defaults: { paletteId: "obsidian", fontId: "tenor", motifId: "plain" },
  }),
  t("panel-minimal", "Panel", "Minimal", "A deep inner rule framing very little.", {
    composition: "CENTRED", borderId: "inner-panel", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "sand", fontId: "spectral", motifId: "plain" },
  }),
  t("arc-minimal", "Arc", "Minimal", "Quarter arcs at the corners, nothing between.", {
    composition: "CENTRED", borderId: "arc-corners", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "lavender", fontId: "josefin", motifId: "plain" },
  }),
  t("crosshatch-minimal", "Hatch", "Minimal", "Engraver's shading behind a plain setting.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1, eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "graphite", fontId: "spectral", motifId: "crosshatch" },
  }),

  /* ========================================================= CELEBRATION == */
  t("poster", "Poster", "Celebration", "Names as large as the page allows, one accent bar.", {
    composition: "POSTER", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "TOP",
    nameUppercase: true, nameScale: 1.5, nameTracking: "-0.01em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "indigo-brass", fontId: "poster", motifId: "plain" },
  }),
  t("marquee", "Marquee", "Celebration", "Condensed capitals stacked like a theatre bill.", {
    composition: "POSTER", borderId: "side-rule", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 1.35, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "coral", fontId: "condensed", motifId: "plain" },
  }),
  t("confetti", "Confetti", "Celebration", "Scattered chips and a cheerful script.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.15, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "coral", fontId: "dancing", motifId: "terrazzo" },
  }),
  t("birthday-bold", "Birthday", "Celebration", "A big numeral date and heavy type.", {
    composition: "ASYMMETRIC", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "SIDE",
    nameUppercase: true, nameScale: 1.2, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "NUMERAL",
    defaults: { paletteId: "saffron", fontId: "poster", motifId: "plain" },
  }),
  t("chevron-celebration", "Chevron", "Celebration", "Zigzag bands and a bright ground.", {
    composition: "BANDED", borderId: "zigzag-band", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.05, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "seafoam", fontId: "geometric", motifId: "chevron" },
  }),
  t("triangle-celebration", "Bunting", "Celebration", "Triangle courses top and bottom.", {
    composition: "BANDED", borderId: "triangle-run", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.05, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "coral", fontId: "geometric", motifId: "plain" },
  }),
  t("milestone", "Milestone", "Celebration", "An enormous numeral with the names beneath.", {
    composition: "STACKED_RULES", borderId: "none", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "NONE",
    nameScale: 1.1, eyebrow: "RULED", divider: "RULE", dateStyle: "NUMERAL",
    defaults: { paletteId: "burgundy", fontId: "didone", motifId: "plain" },
  }),
  t("gold-party", "Gold", "Celebration", "Sunburst ground with gold on dark.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.95, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "midnight", fontId: "poster", motifId: "sunburst" },
  }),
  t("balloon", "Balloon", "Celebration", "Round, open type and a dotted ground.", {
    composition: "CENTRED", borderId: "rounded-rule", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "powder", fontId: "geometric", motifId: "dot-grid" },
  }),
  t("kente-party", "Kente party", "Celebration", "Woven bands and a bold face.", {
    composition: "PLATE", borderId: "soft-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "saffron", fontId: "rozha", motifId: "kente" },
  }),
  t("chalkboard", "Chalkboard", "Celebration", "Hand-lettered caps on a dark ground.", {
    composition: "CENTRED", borderId: "dashed-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.2, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "obsidian", fontId: "chalk", motifId: "crosshatch" },
  }),
  t("carnival", "Carnival", "Celebration", "Deco fans and a loud palette.", {
    composition: "CENTRED", borderId: "deco-fans", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.05, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "coral", fontId: "josefin", motifId: "deco-fan" },
  }),

  /* ================================================================ GALA == */
  t("gala", "Gala", "Gala", "Dark ground, brass hairline, capitals held wide.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "WORDS",
    defaults: { paletteId: "midnight", fontId: "grand", motifId: "grain" },
  }),
  t("black-tie", "Black tie", "Gala", "Obsidian and silver, with a double rule.", {
    composition: "CENTRED", borderId: "double-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.1em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "obsidian", fontId: "tenor", motifId: "plain" },
  }),
  t("banquet", "Banquet", "Gala", "Greek key on a deep navy ground.", {
    composition: "BANDED", borderId: "greek-key", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.85, nameTracking: "0.07em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "ink-navy", fontId: "grand", motifId: "plain" },
  }),
  t("wine-gala", "Cellar", "Gala", "Dark burgundy with a rose-gold rule.", {
    composition: "CENTRED", borderId: "inner-panel", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "DIAMOND", dateStyle: "WORDS",
    defaults: { paletteId: "wine-dark", fontId: "baskerville", motifId: "damask" },
  }),
  t("forest-gala", "Forest", "Gala", "Green-black with gold and a botanical corner.", {
    composition: "CENTRED", borderId: "botanical-sprigs", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.95, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "forest-night", fontId: "garamond", motifId: "plain" },
  }),
  t("crest-gala", "Order", "Gala", "A crest on a dark ground. Formal to a fault.", {
    composition: "PLATE", borderId: "shield-crest", nameSetting: "INLINE", monogram: "SHIELD", photo: "NONE",
    nameUppercase: true, nameScale: 0.8, nameTracking: "0.08em", eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "midnight", fontId: "grand", motifId: "plain" },
  }),
  t("moire-gala", "Engraved plate", "Gala", "Moiré rings and a triple rule.", {
    composition: "CENTRED", borderId: "triple-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 0.9, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "WORDS",
    defaults: { paletteId: "obsidian", fontId: "didone", motifId: "moire" },
  }),
  t("dinner", "Dinner", "Gala", "Quiet, dark and unornamented. A seated dinner card.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameUppercase: true, nameScale: 0.8, nameTracking: "0.14em", eyebrow: "CAPS_TRACKED", divider: "RULE", dateStyle: "STACKED",
    defaults: { paletteId: "ink-navy", fontId: "tenor", motifId: "plain" },
  }),

  /* ============================================================= PLAYFUL == */
  t("handwritten", "Handwritten", "Playful", "Loose script and a soft ground.", {
    composition: "CENTRED", borderId: "none", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.35, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "blush", fontId: "handwritten", motifId: "grain" },
  }),
  t("note", "Note", "Playful", "As if scribbled on a card and posted.", {
    composition: "CENTRED", borderId: "dashed-rule", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.25, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "sand", fontId: "handwritten", motifId: "linen" },
  }),
  t("scrapbook", "Scrapbook", "Playful", "Corner marks and a photograph, like a pasted print.", {
    composition: "CENTRED", borderId: "corner-ticks", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.15, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "oyster", fontId: "dancing", motifId: "grain" },
  }),
  t("picnic", "Picnic", "Playful", "Chevron ground and a round, friendly face.", {
    composition: "CENTRED", borderId: "rounded-rule", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "botanical", fontId: "geometric", motifId: "chevron" },
  }),
  t("street", "Street", "Playful", "Condensed caps and a heavy left rule.", {
    composition: "POSTER", borderId: "side-rule", nameSetting: "STACKED_PLAIN", monogram: "NONE", photo: "TOP",
    nameUppercase: true, nameScale: 1.3, eyebrow: "CAPS_TRACKED", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "graphite", fontId: "condensed", motifId: "plain" },
  }),
  t("sticker", "Sticker", "Playful", "A soft panel, bright colour and no ceremony at all.", {
    composition: "PLATE", borderId: "soft-plate", nameSetting: "INLINE", monogram: "NONE", photo: "NONE",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "NONE", dateStyle: "STAMP",
    defaults: { paletteId: "coral", fontId: "dancing", motifId: "dot-grid" },
  }),
  t("brunch", "Brunch", "Playful", "Light, airy and lightly ruled.", {
    composition: "CENTRED", borderId: "hairline", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.1, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "WORDS",
    defaults: { paletteId: "seafoam", fontId: "parisienne", motifId: "plain" },
  }),
  t("hen", "Hen party", "Playful", "Blush, script, and a scalloped feel.", {
    composition: "CENTRED", borderId: "arc-corners", nameSetting: "INLINE", monogram: "NONE", photo: "TOP",
    nameScale: 1.2, eyebrow: "SMALL_ITALIC", divider: "DOTS", dateStyle: "STAMP",
    defaults: { paletteId: "dusty-rose", fontId: "parisienne", motifId: "scales" },
  }),
];

export const COLLECTIONS: Collection[] = [
  "Ceremony",
  "Classic",
  "Editorial",
  "Deco",
  "Botanical",
  "Coastal",
  "Minimal",
  "Celebration",
  "Gala",
  "Playful",
];

export const DEFAULT_TEMPLATE_ID = "engraved";

export function templateById(id: string | null | undefined): InvitationTemplate {
  return (
    INVITATION_TEMPLATES.find((template) => template.id === id) ??
    INVITATION_TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID) ??
    INVITATION_TEMPLATES[0]!
  );
}
