import {
  beginTemplate,
  divider,
  ground,
  image,
  monogram,
  pattern,
  shape,
  stack,
  text,
  vector,
} from "../authoring";
import type { BookitTemplate } from "../types";

/**
 * Master templates 1–6.
 *
 * Each is composed by hand against the 720 × 1008 board. They are not variants
 * of one another: the compositions differ in where the weight sits, how the
 * names break, what holds the page and what is deliberately left empty.
 *
 * Type is referenced by role. `display` carries the names, `body` the metadata,
 * `accent` the occasional third voice — never more than three, per the design
 * rules each template ships with.
 */

/* Font stacks, from the faces self-hosted in the root layout. */
const F = {
  cormorant: "var(--font-cormorant), Georgia, serif",
  bodoni: "var(--font-bodoni), Georgia, serif",
  playfair: "var(--font-playfair), Georgia, serif",
  garamond: "var(--font-garamond), Georgia, serif",
  baskerville: "var(--font-baskerville), Georgia, serif",
  marcellus: "var(--font-marcellus), Georgia, serif",
  cinzel: "var(--font-cinzel), Georgia, serif",
  italiana: "var(--font-italiana), Georgia, serif",
  prata: "var(--font-prata), Georgia, serif",
  tenor: "var(--font-tenor), system-ui, sans-serif",
  jost: "var(--font-josefin), system-ui, sans-serif",
  inter: "var(--font-inter), system-ui, sans-serif",
  jakarta: "var(--font-jakarta), system-ui, sans-serif",
  outfit: "var(--font-outfit), system-ui, sans-serif",
  archivo: "var(--font-archivo), system-ui, sans-serif",
  spectral: "var(--font-spectral), Georgia, serif",
  cardo: "var(--font-cardo), Georgia, serif",
} as const;

/* ========================================================================== */
/* 01 — MIDNIGHT GILDED                                                       */
/* ========================================================================== */

beginTemplate("mg");

export const MIDNIGHT_GILDED: BookitTemplate = {
  id: "midnight-gilded",
  slug: "midnight-gilded",
  name: "Midnight Gilded",
  collection: "Midnight Gilded",
  tagline: "Black tie · Formal · Evening",
  description:
    "A dark card held inside a fine gilded frame, with the names set in inscriptional capitals and spaced wide. Everything is quiet except the metal: one weight of rule, one weight of type, and a great deal of still ground. Made for an evening reception where the invitation arrives before the dress code does.",
  directions: ["black-tie", "modern-luxury", "regal"],
  events: ["wedding", "banquet", "corporate", "private-dinner", "anniversary"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.cinzel, body: F.tenor, accent: F.cormorant },
  palettes: [
    {
      id: "forest-gold",
      name: "Forest Gold",
      ground: "#10221D",
      surface: "#16302A",
      ink: "#F5EDDD",
      muted: "#A9B8AE",
      accent: "#C9A75E",
      accentSoft: "#22453B",
      dark: true,
    },
    {
      id: "noir",
      name: "Noir",
      ground: "#111111",
      surface: "#1A1A1A",
      ink: "#F5F2EB",
      muted: "#A6A29A",
      accent: "#BD9A54",
      accentSoft: "#242018",
      dark: true,
    },
    {
      id: "burgundy",
      name: "Burgundy",
      ground: "#48191D",
      surface: "#572126",
      ink: "#F4EADA",
      muted: "#C6A9A4",
      accent: "#C9A85D",
      accentSoft: "#5E262B",
      dark: true,
    },
    {
      id: "ink-navy",
      name: "Ink Navy",
      ground: "#101A2E",
      surface: "#17233C",
      ink: "#EFF1F7",
      muted: "#9AA6BE",
      accent: "#C4A059",
      accentSoft: "#1B2942",
      dark: true,
    },
  ],
  designRules: {
    maxFonts: 3,
    allowedFontRoles: ["display", "body", "accent"],
    minMargin: 48,
    recommendedTextSizes: { names: 46, heading: 22, body: 14, metadata: 11 },
    lockedElements: ["ground", "mg-frame-outer", "mg-frame-inner"],
    optionalElements: ["mg-monogram", "mg-dresscode"],
  },
  elements: stack([
    ground(),
    shape("rect", 40, 40, 640, 928, { stroke: "accent", strokeWidth: 1.4, id: "mg-frame-outer" }),
    shape("rect", 52, 52, 616, 904, { stroke: "accent", strokeWidth: 0.7, opacity: 0.5, id: "mg-frame-inner" }),

    monogram("circle", 316, 108, 88, { color: "accent", fontSize: 24, id: "mg-monogram" }),

    text("{{event.hosts}}", 130, 250, 460, 20, {
      size: 11, tracking: 0.28, uppercase: true, color: "muted", role: "body",
    }),

    text("{{couple.firstName}}", 90, 300, 540, 74, {
      size: 46, role: "display", color: "ink", tracking: 0.06, uppercase: true, effect: "foil-gold",
    }),
    text("and", 90, 384, 540, 34, {
      size: 24, role: "accent", color: "accent", italic: true,
    }),
    text("{{couple.secondName}}", 90, 424, 540, 74, {
      size: 46, role: "display", color: "ink", tracking: 0.06, uppercase: true, effect: "foil-gold",
    }),

    divider("diamond", 250, 528, 220, { color: "accent", strokeWidth: 1 }),

    text("request the pleasure of your company", 110, 576, 500, 24, {
      size: 13, color: "muted", role: "body", tracking: 0.04,
    }),

    text("{{event.dateLong}}", 110, 632, 500, 34, {
      size: 22, role: "display", color: "ink", tracking: 0.04,
    }),
    text("{{event.time}}", 110, 676, 500, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.18, uppercase: true,
    }),

    divider("rule", 300, 720, 120, { color: "accent", strokeWidth: 0.6, opacity: 0.5 }),

    text("{{event.venue}}", 110, 758, 500, 26, {
      size: 15, role: "body", color: "ink", tracking: 0.14, uppercase: true,
    }),
    text("{{event.city}}, {{event.country}}", 110, 790, 500, 20, {
      size: 11, color: "muted", role: "body", tracking: 0.2, uppercase: true,
    }),

    text("{{event.dressCode}}", 110, 872, 500, 20, {
      size: 10, color: "accent", role: "body", tracking: 0.3, uppercase: true, id: "mg-dresscode",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 02 — EDITORIAL IVORY                                                       */
/* ========================================================================== */

beginTemplate("ei");

export const EDITORIAL_IVORY: BookitTemplate = {
  id: "editorial-ivory",
  slug: "editorial-ivory",
  name: "Editorial Ivory",
  collection: "Editorial Ivory",
  tagline: "Editorial · Quiet luxury · Modern",
  description:
    "Quiet luxury, arranged like a fashion masthead rather than a wedding card. The names run flush left across two lines at the top of the page, the date sits as a large numeral, and everything else is set very small in tracked capitals. The luxury is in the whitespace and the restraint, not in ornament — there is none.",
  directions: ["editorial", "minimal", "modern-luxury", "monochrome"],
  events: ["wedding", "engagement", "corporate", "anniversary", "graduation"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.bodoni, body: F.archivo },
  palettes: [
    { id: "ivory", name: "Ivory", ground: "#F7F4EE", surface: "#FFFFFF", ink: "#14130F", muted: "#7C776C", accent: "#14130F", accentSoft: "#E7E2D7" },
    { id: "bone", name: "Bone", ground: "#EFEBE3", surface: "#FBF9F5", ink: "#1B1A16", muted: "#7E7A70", accent: "#8A6A3C", accentSoft: "#DFD8CB" },
    { id: "paper-white", name: "Paper White", ground: "#FFFFFF", surface: "#FAFAF8", ink: "#111111", muted: "#767676", accent: "#111111", accentSoft: "#EDEDEA" },
    { id: "shadow", name: "Shadow", ground: "#1A1A18", surface: "#232320", ink: "#F4F2ED", muted: "#9C9890", accent: "#C7BFAE", accentSoft: "#2B2B27", dark: true },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 64,
    recommendedTextSizes: { names: 60, heading: 20, body: 13, metadata: 10 },
    lockedElements: ["ground", "ei-rule-top", "ei-rule-bottom"],
    optionalElements: ["ei-hashtag"],
  },
  elements: stack([
    ground(),

    text("The Wedding", 72, 84, 300, 18, {
      size: 10, tracking: 0.4, uppercase: true, color: "muted", role: "body", align: "left",
    }),
    shape("rect", 72, 116, 576, 1, { fill: "ink", opacity: 0.22, id: "ei-rule-top" }),

    text("{{couple.firstName}}", 72, 168, 576, 84, {
      size: 62, role: "display", color: "ink", align: "left", lineHeight: 1, tracking: -0.02,
    }),
    text("{{couple.secondName}}", 72, 250, 576, 84, {
      size: 62, role: "display", color: "ink", align: "left", lineHeight: 1, tracking: -0.02,
    }),

    // The date as a numeral is the second voice — the only large thing that is
    // not a name.
    text("{{event.dateNumeral}}", 72, 420, 200, 116, {
      size: 104, role: "display", color: "ink", align: "left", lineHeight: 0.86,
    }),
    text("{{event.month}}", 232, 430, 240, 22, {
      size: 12, tracking: 0.3, uppercase: true, color: "muted", role: "body", align: "left",
    }),
    text("{{event.year}}", 232, 456, 240, 22, {
      size: 12, tracking: 0.3, uppercase: true, color: "muted", role: "body", align: "left",
    }),
    text("{{event.weekday}} · {{event.time}}", 232, 490, 300, 22, {
      size: 12, tracking: 0.14, uppercase: true, color: "ink", role: "body", align: "left",
    }),

    shape("rect", 72, 600, 576, 1, { fill: "ink", opacity: 0.22, id: "ei-rule-bottom" }),

    text("Venue", 72, 632, 200, 18, {
      size: 9, tracking: 0.34, uppercase: true, color: "muted", role: "body", align: "left",
    }),
    text("{{event.venue}}", 72, 656, 320, 26, {
      size: 17, role: "display", color: "ink", align: "left",
    }),
    text("{{event.address}}\n{{event.city}}", 72, 690, 320, 44, {
      size: 12, color: "muted", role: "body", align: "left", lineHeight: 1.6,
    }),

    text("Reply", 400, 632, 248, 18, {
      size: 9, tracking: 0.34, uppercase: true, color: "muted", role: "body", align: "left",
    }),
    text("by {{event.rsvpBy}}", 400, 656, 248, 26, {
      size: 17, role: "display", color: "ink", align: "left",
    }),
    text("{{event.rsvpUrl}}", 400, 690, 248, 22, {
      size: 12, color: "muted", role: "body", align: "left",
    }),

    text("{{event.hashtag}}", 72, 908, 576, 20, {
      size: 10, tracking: 0.3, uppercase: true, color: "muted", role: "body", align: "left",
      id: "ei-hashtag",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 03 — BOTANICAL ATELIER                                                     */
/* ========================================================================== */

beginTemplate("ba");

export const BOTANICAL_ATELIER: BookitTemplate = {
  id: "botanical-atelier",
  slug: "botanical-atelier",
  name: "Botanical Atelier",
  collection: "Botanical Atelier",
  tagline: "Garden · Fine art · Romantic",
  description:
    "Fine-art botanical stationery on handmade paper. Drawn stems occupy two corners and are answered by a very quiet sprig field behind the type; the names are set in an upright italic that reads as written rather than typed. Warm, unhurried, and built for a daytime garden ceremony.",
  directions: ["botanical", "garden", "romantic", "artistic"],
  events: ["wedding", "engagement", "baby-shower", "anniversary", "birthday"],
  size: "invitation",
  paper: "handmade",
  fontSystem: { display: F.cormorant, body: F.spectral, accent: F.cormorant },
  palettes: [
    { id: "greenhouse", name: "Greenhouse", ground: "#F6F7F1", surface: "#FFFFFF", ink: "#232B22", muted: "#6C7568", accent: "#54704F", accentSoft: "#E4EBDE" },
    { id: "dusty-rose", name: "Dusty Rose", ground: "#FAF3F1", surface: "#FFFFFF", ink: "#2C2321", muted: "#7B6A65", accent: "#A9736A", accentSoft: "#F0E1DC" },
    { id: "stone", name: "Stone", ground: "#F4F2ED", surface: "#FFFFFF", ink: "#26241F", muted: "#767065", accent: "#8C8577", accentSoft: "#E6E2D8" },
    { id: "champagne", name: "Champagne", ground: "#FAF6EC", surface: "#FFFFFF", ink: "#2B2519", muted: "#7A7060", accent: "#B29456", accentSoft: "#EFE7D3" },
  ],
  designRules: {
    maxFonts: 3,
    allowedFontRoles: ["display", "body", "accent"],
    minMargin: 56,
    recommendedTextSizes: { names: 54, heading: 20, body: 13, metadata: 10 },
    lockedElements: ["ground", "ba-field", "ba-sprig-left", "ba-sprig-right"],
    optionalElements: ["ba-field", "ba-quote"],
  },
  elements: stack([
    ground(),
    pattern("sprigs", { color: "accent", scale: 132, opacity: 0.1, id: "ba-field" }),

    vector("sprig-eucalyptus", 44, 40, 190, 190, { color: "accent", opacity: 0.72, id: "ba-sprig-left" }),
    vector("sprig-eucalyptus", 486, 40, 190, 190, {
      // Mirrored rather than rotated: a quarter turn points the stem the wrong
      // way and the leaves fall off the wrong side of it.
      color: "accent", opacity: 0.72, rotation: 180, id: "ba-sprig-right",
    }),

    text("Together with their families", 120, 268, 480, 22, {
      size: 11, tracking: 0.24, uppercase: true, color: "muted", role: "body",
    }),

    text("{{couple.firstName}}", 80, 312, 560, 74, {
      size: 54, role: "display", color: "ink", italic: true, lineHeight: 1.05,
    }),
    text("&", 80, 392, 560, 40, {
      size: 30, role: "accent", color: "accent", italic: true,
    }),
    text("{{couple.secondName}}", 80, 434, 560, 74, {
      size: 54, role: "display", color: "ink", italic: true, lineHeight: 1.05,
    }),

    divider("fleuron", 260, 528, 200, { color: "accent" }),

    text("invite you to celebrate their marriage", 110, 576, 500, 24, {
      size: 13, color: "muted", role: "body",
    }),

    text("{{event.weekday}}, {{event.date}}", 110, 626, 500, 30, {
      size: 20, role: "display", color: "ink",
    }),
    text("at {{event.time}}", 110, 660, 500, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.1,
    }),

    text("{{event.venue}}", 110, 712, 500, 26, {
      size: 16, role: "display", color: "ink",
    }),
    text("{{event.address}} · {{event.city}}", 110, 744, 500, 20, {
      size: 11, color: "muted", role: "body", tracking: 0.08,
    }),

    vector("sprig-fern", 300, 800, 120, 120, { color: "accent", opacity: 0.5, id: "ba-quote" }),

    text("Reply by {{event.rsvpBy}}", 110, 926, 500, 20, {
      size: 10, tracking: 0.24, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 04 — MODERN MONOGRAM                                                       */
/* ========================================================================== */

beginTemplate("mm");

export const MODERN_MONOGRAM: BookitTemplate = {
  id: "modern-monogram",
  slug: "modern-monogram",
  name: "Modern Monogram",
  collection: "Modern Monogram",
  tagline: "Contemporary · Architectural · Identity",
  description:
    "The monogram is the invitation. Two initials are set enormous and low-contrast against the ground, debossed rather than printed, and the names sit beneath them at a fraction of the size. Architectural, almost severe — an event identity rather than a card, which is exactly what it is designed to become.",
  directions: ["modern-luxury", "minimal", "architectural", "monochrome"],
  events: ["wedding", "engagement", "corporate", "anniversary", "private-dinner"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.italiana, body: F.jakarta },
  palettes: [
    { id: "oyster", name: "Oyster", ground: "#EDEAE3", surface: "#F8F6F2", ink: "#1C1B18", muted: "#77726A", accent: "#B08E52", accentSoft: "#E1DCD1" },
    { id: "graphite", name: "Graphite", ground: "#22242A", surface: "#2B2E35", ink: "#F1F1EF", muted: "#9EA1A8", accent: "#C0C4CA", accentSoft: "#2E3138", dark: true },
    { id: "sand", name: "Sand", ground: "#F2ECE1", surface: "#FBF8F2", ink: "#26221A", muted: "#7C7365", accent: "#96784B", accentSoft: "#E5DCCA" },
    { id: "sage", name: "Sage", ground: "#E9EDE7", surface: "#F6F8F5", ink: "#1D231C", muted: "#6D766B", accent: "#5C7256", accentSoft: "#DBE3D8" },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 60,
    recommendedTextSizes: { names: 26, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "mm-mark"],
    optionalElements: ["mm-rule"],
  },
  elements: stack([
    ground(),

    // The mark is the composition. Everything else is caption.
    monogram("stacked", 110, 168, 500, {
      color: "ink", fontSize: 190, effect: "deboss", id: "mm-mark",
    }),

    shape("rect", 300, 640, 120, 1, { fill: "accent", id: "mm-rule" }),

    text("{{couple.firstName}} and {{couple.secondName}}", 100, 690, 520, 34, {
      size: 24, role: "display", color: "ink", tracking: 0.02,
    }),

    text("are getting married", 100, 730, 520, 22, {
      size: 11, tracking: 0.3, uppercase: true, color: "muted", role: "body",
    }),

    text("{{event.date}}", 100, 800, 250, 24, {
      size: 13, tracking: 0.16, uppercase: true, color: "ink", role: "body", align: "right",
    }),
    shape("rect", 358, 802, 1, 20, { fill: "muted", opacity: 0.4 }),
    text("{{event.venue}}", 370, 800, 250, 24, {
      size: 13, tracking: 0.16, uppercase: true, color: "ink", role: "body", align: "left",
    }),

    text("{{event.city}} · Reply by {{event.rsvpBy}}", 100, 892, 520, 20, {
      size: 10, tracking: 0.24, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 05 — SCULPTED ARCH                                                         */
/* ========================================================================== */

beginTemplate("sa");

export const SCULPTED_ARCH: BookitTemplate = {
  id: "sculpted-arch",
  slug: "sculpted-arch",
  name: "Sculpted Arch",
  collection: "Sculpted Arch",
  tagline: "Architectural · Mediterranean · Photographic",
  description:
    "An arched window cut into the card, with the photograph set inside it and the type resting on the sill below. The arch is drawn twice — once as the aperture and once as a blind outline offset behind it — so the card reads as layered stone rather than as a rounded rectangle. Mediterranean without the postcard.",
  directions: ["architectural", "modern-luxury", "photography-led", "romantic"],
  events: ["wedding", "engagement", "anniversary", "graduation"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.prata, body: F.jost },
  palettes: [
    { id: "terracotta", name: "Terracotta", ground: "#F6EEE6", surface: "#FFFFFF", ink: "#2A1F17", muted: "#7E6B5C", accent: "#B0674A", accentSoft: "#EEDCCE" },
    { id: "limestone", name: "Limestone", ground: "#F2F0EA", surface: "#FFFFFF", ink: "#24231E", muted: "#7A756A", accent: "#93866E", accentSoft: "#E4E0D5" },
    { id: "olive-grove", name: "Olive Grove", ground: "#EFF0E7", surface: "#FFFFFF", ink: "#212418", muted: "#6F7361", accent: "#6B7448", accentSoft: "#E0E3D2" },
    { id: "midnight-stone", name: "Midnight Stone", ground: "#1D2024", surface: "#262A2F", ink: "#F0EFEB", muted: "#9B9E9F", accent: "#C09A6B", accentSoft: "#2A2E33", dark: true },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 52,
    recommendedTextSizes: { names: 40, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "sa-arch-shadow", "sa-photo"],
    optionalElements: ["sa-arch-shadow"],
  },
  elements: stack([
    ground(),

    // The offset outline reads as a second stone behind the first.
    shape("arch", 132, 74, 456, 496, {
      stroke: "accent", strokeWidth: 1, opacity: 0.45, id: "sa-arch-shadow",
    }),
    image(108, 56, 456, 496, { mask: "arch", radius: 6, id: "sa-photo" }),

    text("{{event.hosts}}", 110, 600, 500, 20, {
      size: 10, tracking: 0.28, uppercase: true, color: "muted", role: "body",
    }),

    text("{{couple.firstName}} & {{couple.secondName}}", 76, 634, 568, 96, {
      size: 40, role: "display", color: "ink", lineHeight: 1.12,
    }),

    divider("rule", 300, 748, 120, { color: "accent", strokeWidth: 1 }),

    text("{{event.dateLong}}", 100, 786, 520, 26, {
      size: 15, role: "body", color: "ink", tracking: 0.08,
    }),
    text("{{event.venue}} · {{event.city}}", 100, 818, 520, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.08,
    }),

    text("Reply by {{event.rsvpBy}} · {{event.rsvpUrl}}", 100, 908, 520, 20, {
      size: 10, tracking: 0.2, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 06 — CONTEMPORARY AFRICAN I — WOVEN                                        */
/* ========================================================================== */

beginTemplate("ca");

export const CONTEMPORARY_AFRICAN_WOVEN: BookitTemplate = {
  id: "contemporary-african-woven",
  slug: "contemporary-african-woven",
  name: "Contemporary African I — Woven",
  collection: "Contemporary African",
  tagline: "Modern African luxury · Textile · Editorial",
  description:
    "Woven-stripe structure used as composition rather than as decoration: three bands of varying weight run across the head of the card, the names sit in the clear field beneath them, and a single band answers at the foot. The reference is a modern African fashion house — restrained geometry, confident type, no illustration at all.",
  directions: ["contemporary-african", "editorial", "modern-luxury"],
  events: ["wedding", "traditional-wedding", "engagement", "banquet", "corporate"],
  culturalTags: ["Contemporary African", "Textile inspired"],
  size: "invitation",
  paper: "linen",
  fontSystem: { display: F.playfair, body: F.outfit },
  palettes: [
    { id: "clay-forest", name: "Clay & Forest", ground: "#F6F1E8", surface: "#FFFFFF", ink: "#221E18", muted: "#786F62", accent: "#A8502C", accentSoft: "#E9DFCE" },
    { id: "indigo-ochre", name: "Indigo & Ochre", ground: "#F4F2EC", surface: "#FFFFFF", ink: "#1B2030", muted: "#6E7484", accent: "#2C3B63", accentSoft: "#E0E3EC" },
    { id: "charcoal-gold", name: "Charcoal & Gold", ground: "#23231F", surface: "#2C2C27", ink: "#F3F0E8", muted: "#A29D92", accent: "#C39A4E", accentSoft: "#2F2F29", dark: true },
    { id: "burgundy-cream", name: "Burgundy & Cream", ground: "#F7F1EA", surface: "#FFFFFF", ink: "#2A1A1B", muted: "#7C6667", accent: "#7C2B33", accentSoft: "#EDDDD9" },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 52,
    recommendedTextSizes: { names: 44, heading: 20, body: 13, metadata: 10 },
    lockedElements: ["ground", "ca-band-head", "ca-band-foot", "ca-band-head-ground", "ca-band-foot-ground"],
    optionalElements: ["ca-band-head", "ca-band-foot"],
  },
  elements: stack([
    ground(),
    shape("rect", 0, 74, 720, 126, { fill: "accentSoft", id: "ca-band-head-ground" }),
    pattern("aso-oke", {
      color: "accent", scale: 126, opacity: 0.85, y: 74, height: 126, id: "ca-band-head",
    }),
    shape("rect", 0, 74, 720, 3, { fill: "accent" }),
    shape("rect", 0, 197, 720, 3, { fill: "accent" }),

    text("{{event.hosts}}", 90, 268, 540, 20, {
      size: 10, tracking: 0.3, uppercase: true, color: "muted", role: "body",
    }),

    text("{{couple.firstName}}", 70, 306, 580, 66, {
      size: 44, role: "display", color: "ink", lineHeight: 1.05,
    }),
    text("&", 70, 378, 580, 32, { size: 22, color: "accent", role: "display", italic: true }),
    text("{{couple.secondName}}", 70, 414, 580, 66, {
      size: 44, role: "display", color: "ink", lineHeight: 1.05,
    }),

    shape("rect", 296, 508, 128, 3, { fill: "accent" }),

    text("invite you to their wedding", 100, 546, 520, 22, {
      size: 12, tracking: 0.1, color: "muted", role: "body",
    }),

    text("{{event.dateLong}}", 100, 600, 520, 30, {
      size: 20, role: "display", color: "ink",
    }),
    text("{{event.time}} · {{event.venue}}", 100, 638, 520, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.06,
    }),
    text("{{event.city}}, {{event.country}}", 100, 664, 520, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.06,
    }),

    text("{{event.dressCode}} · Reply by {{event.rsvpBy}}", 100, 742, 520, 20, {
      size: 10, tracking: 0.24, uppercase: true, color: "muted", role: "body",
    }),

    shape("rect", 0, 838, 720, 96, { fill: "accentSoft", id: "ca-band-foot-ground" }),
    pattern("aso-oke", {
      color: "accent", scale: 126, opacity: 0.85, y: 838, height: 96, id: "ca-band-foot",
    }),
    shape("rect", 0, 838, 720, 3, { fill: "accent" }),
    shape("rect", 0, 931, 720, 3, { fill: "accent" }),
  ]),
  suite: [],
};
