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
 * Master templates 7–12.
 *
 * The cultural collections here are described as *inspired by* their
 * references rather than as authentic reproductions, and they work from
 * structure — beadwork geometry, carved-door panels, woven stripe — rather
 * than from motifs applied as decoration. That is the difference between a
 * design a Nairobi family would send and a souvenir.
 */

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
  jakarta: "var(--font-jakarta), system-ui, sans-serif",
  outfit: "var(--font-outfit), system-ui, sans-serif",
  archivo: "var(--font-archivo), system-ui, sans-serif",
  spectral: "var(--font-spectral), Georgia, serif",
  cardo: "var(--font-cardo), Georgia, serif",
  syne: "var(--font-syne), system-ui, sans-serif",
} as const;

/* ========================================================================== */
/* 07 — CONTEMPORARY AFRICAN II — GEOMETRY                                    */
/* ========================================================================== */

beginTemplate("cg");

export const CONTEMPORARY_AFRICAN_GEOMETRY: BookitTemplate = {
  id: "contemporary-african-geometry",
  slug: "contemporary-african-geometry",
  name: "Contemporary African II — Geometry",
  collection: "Contemporary African",
  tagline: "Modern African luxury · Geometric · Bold",
  description:
    "A single large geometric field occupies the upper two-thirds and the type is pushed hard to the lower left, flush against a rule. Abstract rather than illustrative: the pattern is built from one repeating diamond and carries the whole card, so nothing else has to. The most graphic design in the library.",
  directions: ["contemporary-african", "modern-luxury", "artistic"],
  events: ["wedding", "traditional-wedding", "engagement", "birthday", "graduation"],
  culturalTags: ["Contemporary African", "Abstract geometry"],
  size: "invitation",
  paper: "linen",
  fontSystem: { display: F.syne, body: F.archivo },
  palettes: [
    { id: "ochre-charcoal", name: "Ochre & Charcoal", ground: "#F4F0E6", surface: "#FFFFFF", ink: "#1E1C18", muted: "#75705F", accent: "#B47B29", accentSoft: "#E8E0CC" },
    { id: "forest-cream", name: "Forest & Cream", ground: "#F3F4EC", surface: "#FFFFFF", ink: "#182018", muted: "#697061", accent: "#2E5A3C", accentSoft: "#DEE6DB" },
    { id: "night-brass", name: "Night & Brass", ground: "#191A18", surface: "#222320", ink: "#F2F1EA", muted: "#9C9B92", accent: "#BE8F3D", accentSoft: "#242521", dark: true },
    { id: "clay-ink", name: "Clay & Ink", ground: "#F7EFE9", surface: "#FFFFFF", ink: "#231A14", muted: "#7B6858", accent: "#9C4A2A", accentSoft: "#EEDCD0" },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 48,
    recommendedTextSizes: { names: 40, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "cg-field", "cg-rule"],
    optionalElements: [],
  },
  elements: stack([
    ground(),

    shape("rect", 0, 0, 720, 560, { fill: "accentSoft", id: "cg-field-ground" }),
    pattern("kitenge", {
      color: "accent", scale: 116, opacity: 0.42, y: 0, height: 560, id: "cg-field",
    }),
    shape("rect", 0, 552, 720, 8, { fill: "accent", id: "cg-rule" }),

    text("{{event.hosts}}", 64, 606, 460, 20, {
      size: 10, tracking: 0.3, uppercase: true, color: "muted", role: "body", align: "left",
    }),

    text("{{couple.firstName}}", 60, 640, 600, 58, {
      size: 40, role: "display", color: "ink", align: "left", lineHeight: 1.02, tracking: -0.01,
    }),
    text("{{couple.secondName}}", 60, 694, 600, 58, {
      size: 40, role: "display", color: "ink", align: "left", lineHeight: 1.02, tracking: -0.01,
    }),

    text("{{event.dateLong}}", 64, 786, 400, 24, {
      size: 14, role: "body", color: "ink", align: "left", tracking: 0.06,
    }),
    text("{{event.time}} · {{event.venue}}", 64, 814, 460, 22, {
      size: 12, color: "muted", role: "body", align: "left",
    }),
    text("{{event.city}}, {{event.country}}", 64, 838, 460, 22, {
      size: 12, color: "muted", role: "body", align: "left",
    }),

    shape("rect", 64, 890, 80, 2, { fill: "accent" }),
    text("Reply by {{event.rsvpBy}}", 64, 908, 460, 20, {
      size: 10, tracking: 0.24, uppercase: true, color: "muted", role: "body", align: "left",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 08 — RURACIO HERITAGE                                                      */
/* ========================================================================== */

beginTemplate("rh");

export const RURACIO_HERITAGE: BookitTemplate = {
  id: "ruracio-heritage",
  slug: "ruracio-heritage",
  name: "Ruracio Heritage",
  collection: "Ruracio Heritage",
  tagline: "Ruracio inspired · Traditional · Family",
  description:
    "Built for a ceremony that joins two households rather than two individuals, so the families are named at the same weight as the couple and the card is split by a centre rule. Beadwork-derived courses run at head and foot in restrained earth colours. Sophisticated enough for a Nairobi ruracio, with no clip art anywhere.",
  directions: ["traditional", "contemporary-african", "regal"],
  events: ["ruracio", "traditional-wedding", "wedding", "engagement"],
  culturalTags: ["Ruracio inspired", "Beadwork geometry"],
  size: "invitation",
  paper: "handmade",
  fontSystem: { display: F.marcellus, body: F.cardo },
  palettes: [
    { id: "earth-gold", name: "Earth & Gold", ground: "#F8F1E6", surface: "#FFFFFF", ink: "#2A1F16", muted: "#7A6A57", accent: "#A0622B", accentSoft: "#EFE0CB" },
    { id: "forest-burgundy", name: "Forest & Burgundy", ground: "#F5F2E9", surface: "#FFFFFF", ink: "#1E2419", muted: "#6E7263", accent: "#6B2230", accentSoft: "#E6E3D5" },
    { id: "terracotta-ivory", name: "Terracotta & Ivory", ground: "#FAF3EC", surface: "#FFFFFF", ink: "#2B1C15", muted: "#7E6857", accent: "#A54B2C", accentSoft: "#F2DFD2" },
    { id: "night-earth", name: "Night & Earth", ground: "#1E1A16", surface: "#26211C", ink: "#F4EEE3", muted: "#A79B8B", accent: "#C08A45", accentSoft: "#292420", dark: true },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 52,
    recommendedTextSizes: { names: 34, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "rh-course-top", "rh-course-bottom", "rh-centre"],
    optionalElements: ["rh-field"],
  },
  elements: stack([
    ground(),
    pattern("beadwork", { color: "accent", scale: 150, opacity: 0.08, id: "rh-field" }),

    vector("bead-course", 60, 62, 600, 54, { color: "accent", opacity: 0.85, id: "rh-course-top" }),

    text("Ruracio", 110, 156, 500, 24, {
      size: 11, tracking: 0.34, uppercase: true, color: "accent", role: "body",
    }),

    // The two families, named at equal weight either side of a centre rule.
    text("The {{couple.firstName}} family", 56, 214, 290, 60, {
      size: 22, role: "display", color: "ink", align: "right", lineHeight: 1.2,
    }),
    shape("rect", 359, 210, 1, 76, { fill: "accent", opacity: 0.55, id: "rh-centre" }),
    text("The {{couple.secondName}} family", 374, 214, 290, 60, {
      size: 22, role: "display", color: "ink", align: "left", lineHeight: 1.2,
    }),

    text("invite you to the joining of our two homes", 100, 312, 520, 24, {
      size: 13, color: "muted", role: "body", italic: true,
    }),

    monogram("diamond", 310, 366, 100, { color: "accent", fontSize: 22 }),

    text("{{couple.firstName}}", 80, 500, 560, 50, {
      size: 34, role: "display", color: "ink", lineHeight: 1.1,
    }),
    text("and {{couple.secondName}}", 80, 546, 560, 50, {
      size: 34, role: "display", color: "ink", lineHeight: 1.1,
    }),

    divider("diamond", 260, 620, 200, { color: "accent", strokeWidth: 1 }),

    text("{{event.dateLong}}", 100, 664, 520, 28, {
      size: 17, role: "display", color: "ink",
    }),
    text("from {{event.time}}", 100, 696, 520, 22, {
      size: 12, color: "muted", role: "body", tracking: 0.1,
    }),

    text("{{event.venue}}", 100, 742, 520, 24, {
      size: 14, role: "body", color: "ink", tracking: 0.12, uppercase: true,
    }),
    text("{{event.address}}, {{event.city}}", 100, 770, 520, 20, {
      size: 11, color: "muted", role: "body",
    }),

    text("Kindly reply by {{event.rsvpBy}}", 100, 828, 520, 20, {
      size: 10, tracking: 0.24, uppercase: true, color: "muted", role: "body",
    }),

    vector("bead-course", 60, 892, 600, 54, {
      color: "accent", opacity: 0.85, rotation: 180, id: "rh-course-bottom",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 09 — SWAHILI COAST                                                         */
/* ========================================================================== */

beginTemplate("sc");

export const SWAHILI_COAST: BookitTemplate = {
  id: "swahili-coast",
  slug: "swahili-coast",
  name: "Swahili Coast",
  collection: "Swahili Coast",
  tagline: "Coastal · Architectural · Carved",
  description:
    "Drawn from the geometry of a carved Swahili door rather than from its ornament: one square panel, one inscribed diamond, one centre boss, and the type set inside the frame they make. Coral-stone and antique brass on sand. Architectural restraint doing the work that decoration usually does.",
  directions: ["coastal", "architectural", "traditional", "modern-luxury"],
  events: ["wedding", "traditional-wedding", "religious", "anniversary", "private-dinner"],
  culturalTags: ["Swahili architectural", "Coastal"],
  size: "invitation",
  paper: "handmade",
  fontSystem: { display: F.cormorant, body: F.tenor },
  palettes: [
    { id: "coral-brass", name: "Coral & Brass", ground: "#F8F2E7", surface: "#FFFFFF", ink: "#2A231A", muted: "#7D7263", accent: "#A5643C", accentSoft: "#EFE3CE" },
    { id: "ocean-sand", name: "Ocean & Sand", ground: "#F5F3EA", surface: "#FFFFFF", ink: "#152128", muted: "#6B7880", accent: "#1F5566", accentSoft: "#E1E8E6" },
    { id: "ivory-indigo", name: "Ivory & Indigo", ground: "#FAF7EF", surface: "#FFFFFF", ink: "#1A1F2E", muted: "#6E7585", accent: "#2A3A66", accentSoft: "#E5E7EE" },
    { id: "dusk", name: "Dusk", ground: "#20211D", surface: "#292A25", ink: "#F3F0E6", muted: "#A29E92", accent: "#C08F55", accentSoft: "#2B2C26", dark: true },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 56,
    recommendedTextSizes: { names: 42, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "sc-panel"],
    optionalElements: ["sc-field"],
  },
  elements: stack([
    ground(),
    pattern("carved-door", { color: "accent", scale: 128, opacity: 0.07, id: "sc-field" }),

    vector("panel-carved", 84, 96, 552, 552, { color: "accent", opacity: 0.5, id: "sc-panel" }),

    text("{{event.hosts}}", 150, 268, 420, 20, {
      size: 10, tracking: 0.28, uppercase: true, color: "muted", role: "body",
    }),

    text("{{couple.firstName}}", 130, 306, 460, 58, {
      size: 42, role: "display", color: "ink", lineHeight: 1.06,
    }),
    text("&", 130, 366, 460, 30, { size: 20, color: "accent", role: "display", italic: true }),
    text("{{couple.secondName}}", 130, 400, 460, 58, {
      size: 42, role: "display", color: "ink", lineHeight: 1.06,
    }),

    divider("rule", 300, 476, 120, { color: "accent", strokeWidth: 0.8, opacity: 0.7 }),

    text("{{event.dateLong}}", 140, 512, 440, 26, {
      size: 15, role: "body", color: "ink", tracking: 0.08,
    }),
    text("{{event.time}}", 140, 542, 440, 22, {
      size: 11, color: "muted", role: "body", tracking: 0.2, uppercase: true,
    }),

    text("{{event.venue}}", 120, 700, 480, 30, {
      size: 18, role: "display", color: "ink",
    }),
    text("{{event.address}} · {{event.city}}", 120, 734, 480, 22, {
      size: 12, color: "muted", role: "body",
    }),

    divider("dots", 320, 790, 80, { color: "accent", strokeWidth: 1.4 }),

    text("{{event.dressCode}} · Reply by {{event.rsvpBy}}", 110, 906, 500, 20, {
      size: 10, tracking: 0.22, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 10 — REGAL CEREMONY                                                        */
/* ========================================================================== */

beginTemplate("rc");

export const REGAL_CEREMONY: BookitTemplate = {
  id: "regal-ceremony",
  slug: "regal-ceremony",
  name: "Regal Ceremony",
  collection: "Regal Ceremony",
  tagline: "Regal · Formal · Ceremonial",
  description:
    "A crest, a double rule and perfect symmetry. The monogram sits inside a shield flanked by laurel, and the type steps down through five sizes without ever changing its axis. Aristocratic rather than gaudy — the jewel colours are deep and matte, and the only metal is a hairline.",
  directions: ["regal", "black-tie", "traditional"],
  events: ["wedding", "religious", "banquet", "anniversary", "corporate"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.baskerville, body: F.cardo, accent: F.cinzel },
  palettes: [
    { id: "emerald", name: "Emerald", ground: "#F4F5EF", surface: "#FFFFFF", ink: "#16231B", muted: "#67715F", accent: "#1D5138", accentSoft: "#DEE8DD" },
    { id: "royal-navy", name: "Royal Navy", ground: "#F2F4F7", surface: "#FFFFFF", ink: "#121A2A", muted: "#66708A", accent: "#1B3260", accentSoft: "#DEE4EF" },
    { id: "claret", name: "Claret", ground: "#F8F2F1", surface: "#FFFFFF", ink: "#26161A", muted: "#7A6165", accent: "#6E1F2C", accentSoft: "#EEDCDD" },
    { id: "onyx", name: "Onyx", ground: "#15161A", surface: "#1E2025", ink: "#F1F1EE", muted: "#9B9C9F", accent: "#BCA46A", accentSoft: "#212328", dark: true },
  ],
  designRules: {
    maxFonts: 3,
    allowedFontRoles: ["display", "body", "accent"],
    minMargin: 56,
    recommendedTextSizes: { names: 38, heading: 20, body: 13, metadata: 10 },
    lockedElements: ["ground", "rc-rule-outer", "rc-rule-inner", "rc-crest"],
    optionalElements: ["rc-laurel-left", "rc-laurel-right"],
  },
  elements: stack([
    ground(),
    shape("rect", 44, 44, 632, 920, { stroke: "accent", strokeWidth: 1.6, id: "rc-rule-outer" }),
    shape("rect", 56, 56, 608, 896, { stroke: "accent", strokeWidth: 0.6, opacity: 0.55, id: "rc-rule-inner" }),

    vector("laurel", 214, 108, 90, 120, { color: "accent", opacity: 0.6, id: "rc-laurel-left" }),
    monogram("shield", 302, 100, 116, { color: "accent", fontSize: 26, id: "rc-crest" }),
    vector("laurel", 416, 108, 90, 120, {
      color: "accent", opacity: 0.6, rotation: 180, id: "rc-laurel-right",
    }),

    text("{{event.hosts}}", 130, 268, 460, 22, {
      size: 11, tracking: 0.26, uppercase: true, color: "muted", role: "accent",
    }),
    text("request the honour of your presence at the marriage of", 120, 300, 480, 40, {
      size: 12, color: "muted", role: "body", lineHeight: 1.7,
    }),

    text("{{couple.firstName}}", 90, 366, 540, 56, {
      size: 38, role: "display", color: "ink", lineHeight: 1.1,
    }),
    text("to", 90, 428, 540, 26, { size: 15, color: "muted", role: "body", italic: true }),
    text("{{couple.secondName}}", 90, 458, 540, 56, {
      size: 38, role: "display", color: "ink", lineHeight: 1.1,
    }),

    divider("double", 250, 546, 220, { color: "accent", strokeWidth: 1 }),

    text("{{event.dateLong}}", 110, 596, 500, 32, {
      size: 20, role: "display", color: "ink",
    }),
    text("at {{event.time}}", 110, 634, 500, 22, {
      size: 12, color: "muted", role: "body",
    }),

    text("{{event.venue}}", 110, 700, 500, 26, {
      size: 14, role: "accent", color: "ink", tracking: 0.16, uppercase: true,
    }),
    text("{{event.address}}", 110, 730, 500, 20, {
      size: 11, color: "muted", role: "body",
    }),
    text("{{event.city}}, {{event.country}}", 110, 752, 500, 20, {
      size: 11, color: "muted", role: "body",
    }),

    divider("rule", 320, 810, 80, { color: "accent", strokeWidth: 0.6, opacity: 0.6 }),

    text("{{event.dressCode}}", 110, 848, 500, 20, {
      size: 10, tracking: 0.28, uppercase: true, color: "accent", role: "accent",
    }),
    text("Reply by {{event.rsvpBy}}", 110, 878, 500, 20, {
      size: 10, tracking: 0.22, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 11 — MINIMALIST VOW                                                        */
/* ========================================================================== */

beginTemplate("mv");

export const MINIMALIST_VOW: BookitTemplate = {
  id: "minimalist-vow",
  slug: "minimalist-vow",
  name: "Minimalist Vow",
  collection: "Minimalist Vow",
  tagline: "Minimal · Typographic · Still",
  description:
    "Almost nothing. One hairline runs the full width at the optical centre, the names sit immediately above it and the date immediately below, and the remaining two-thirds of the card is deliberately empty. The luxury is entirely in the composition and the paper — there is no ornament to hide behind.",
  directions: ["minimal", "editorial", "modern-luxury", "monochrome"],
  events: ["wedding", "engagement", "private-dinner", "corporate", "meeting"],
  size: "invitation",
  paper: "cotton",
  fontSystem: { display: F.garamond, body: F.jakarta },
  palettes: [
    { id: "chalk", name: "Chalk", ground: "#FAF9F6", surface: "#FFFFFF", ink: "#171613", muted: "#84807A", accent: "#171613", accentSoft: "#ECEAE4" },
    { id: "greige", name: "Greige", ground: "#EFEDE7", surface: "#F9F8F5", ink: "#211F1B", muted: "#7E7A72", accent: "#8B7E68", accentSoft: "#E1DED5" },
    { id: "porcelain", name: "Porcelain", ground: "#F4F6F7", surface: "#FFFFFF", ink: "#14181A", muted: "#798083", accent: "#3E5257", accentSoft: "#E3E8EA" },
    { id: "ink", name: "Ink", ground: "#141416", surface: "#1D1D20", ink: "#F3F2F0", muted: "#96959A", accent: "#D8D5CE", accentSoft: "#1F1F22", dark: true },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 72,
    recommendedTextSizes: { names: 44, heading: 16, body: 12, metadata: 9 },
    lockedElements: ["ground", "mv-rule"],
    optionalElements: ["mv-monogram"],
  },
  elements: stack([
    ground(),

    monogram("plain", 310, 118, 100, { color: "muted", fontSize: 13, id: "mv-monogram" }),

    text("{{couple.firstName}} & {{couple.secondName}}", 84, 396, 552, 64, {
      size: 44, role: "display", color: "ink", lineHeight: 1.14, verticalAlign: "bottom",
    }),

    shape("rect", 84, 486, 552, 1, { fill: "ink", opacity: 0.3, id: "mv-rule" }),

    text("{{event.date}}", 84, 508, 270, 24, {
      size: 12, tracking: 0.2, uppercase: true, color: "ink", role: "body", align: "left",
    }),
    text("{{event.venue}}, {{event.city}}", 366, 508, 270, 24, {
      size: 12, tracking: 0.2, uppercase: true, color: "ink", role: "body", align: "right",
    }),

    text("Reply by {{event.rsvpBy}}", 84, 918, 552, 20, {
      size: 9, tracking: 0.3, uppercase: true, color: "muted", role: "body",
    }),
  ]),
  suite: [],
};

/* ========================================================================== */
/* 12 — BLACK & WHITE SOCIETY                                                 */
/* ========================================================================== */

beginTemplate("bw");

export const BLACK_WHITE_SOCIETY: BookitTemplate = {
  id: "black-white-society",
  slug: "black-white-society",
  name: "Black & White Society",
  collection: "Black & White Society",
  tagline: "Photographic · Monochrome · Fashion",
  description:
    "A full-bleed photograph with the names reversed out across it and a single tracked line of metadata at the foot. The crop is deliberately tight and off-centre, the type sits low, and the scrim is a soft vertical gradient rather than a wash — the photograph is the design, so nothing competes with it.",
  directions: ["photography-led", "monochrome", "editorial", "glamorous"],
  events: ["wedding", "engagement", "anniversary", "birthday", "graduation"],
  size: "invitation",
  paper: "none",
  fontSystem: { display: F.bodoni, body: F.archivo },
  palettes: [
    { id: "monochrome", name: "Monochrome", ground: "#0E0E0E", surface: "#1A1A1A", ink: "#FFFFFF", muted: "#C9C7C3", accent: "#FFFFFF", accentSoft: "#242424", dark: true },
    { id: "warm-noir", name: "Warm Noir", ground: "#14110E", surface: "#1E1A16", ink: "#F7F1E8", muted: "#C6BBAC", accent: "#D8C29A", accentSoft: "#221D18", dark: true },
    { id: "cool-noir", name: "Cool Noir", ground: "#0D1114", surface: "#161B1F", ink: "#F0F4F6", muted: "#B4BFC5", accent: "#DCE5EA", accentSoft: "#1A2025", dark: true },
    { id: "ivory-reverse", name: "Ivory Reverse", ground: "#F5F2EC", surface: "#FFFFFF", ink: "#14130F", muted: "#6E6A62", accent: "#14130F", accentSoft: "#E5E1D8" },
  ],
  designRules: {
    maxFonts: 2,
    allowedFontRoles: ["display", "body"],
    minMargin: 56,
    recommendedTextSizes: { names: 56, heading: 18, body: 12, metadata: 10 },
    lockedElements: ["ground", "bw-photo", "bw-scrim"],
    optionalElements: [],
  },
  elements: stack([
    ground(),
    image(0, 0, 720, 1008, { focalX: 0.42, focalY: 0.34, id: "bw-photo", locked: true }),

    // A vertical gradient rather than a flat wash: the top of the photograph
    // stays open and only the band under the type is darkened.
    shape("rect", 0, 480, 720, 528, { fill: "ground", opacity: 0.72, id: "bw-scrim" }),

    text("{{event.hosts}}", 56, 636, 608, 20, {
      size: 10, tracking: 0.34, uppercase: true, color: "muted", role: "body", align: "left",
    }),

    text("{{couple.firstName}}", 56, 672, 608, 74, {
      size: 56, role: "display", color: "ink", align: "left", lineHeight: 0.98, tracking: -0.015,
    }),
    text("{{couple.secondName}}", 56, 744, 608, 74, {
      size: 56, role: "display", color: "ink", align: "left", lineHeight: 0.98, tracking: -0.015,
    }),

    shape("rect", 56, 848, 608, 1, { fill: "ink", opacity: 0.4 }),

    text("{{event.date}}", 56, 868, 300, 22, {
      size: 11, tracking: 0.22, uppercase: true, color: "ink", role: "body", align: "left",
    }),
    text("{{event.city}}", 364, 868, 300, 22, {
      size: 11, tracking: 0.22, uppercase: true, color: "ink", role: "body", align: "right",
    }),
    text("{{event.venue}} · Reply by {{event.rsvpBy}}", 56, 898, 608, 22, {
      size: 10, tracking: 0.18, uppercase: true, color: "muted", role: "body", align: "left",
    }),
  ]),
  suite: [],
};
