import type { ColourMove } from "./colour";
import type { DesignOperation, StudioDesign } from "./operations";
import { roleOf, type ElementRole } from "./semantics";
import type { BookitTemplate, MaterialEffect } from "./types";

/**
 * The prompt console's interpreter.
 *
 * A host does not want a properties panel. They want to say "warmer, and set
 * the names in gold" and see the card change. So the studio's primary interface
 * is a sentence, and this file is the part that turns a sentence into
 * operations the design engine already knows how to perform safely.
 *
 * Two things worth being explicit about.
 *
 * It resolves locally first. Every instruction below is matched in the browser,
 * with no network call, no key and no latency — which means the console works
 * offline, costs nothing to use, and answers instantly for the eighty per cent
 * of prompts that are a design vocabulary rather than a conversation. Only a
 * prompt this file genuinely does not understand is escalated to a model, and
 * the model is constrained to return operations from the same closed set. It
 * proposes; `operations.ts` disposes. A model cannot invent a change the design
 * rules would not allow, because it is not the thing applying the change.
 *
 * And it never fails silently. An instruction the studio cannot place comes
 * back as a question with examples, not as a shrug — the guidance is the
 * product here as much as the interpretation is.
 */

export interface DesignIntent {
  prompt: string;
  operations: DesignOperation[];
  /** Rule ids that fired — the assistant uses these to avoid repeating advice. */
  matched: string[];
  /** True when nothing in the prompt resolved to a design instruction. */
  unresolved: boolean;
}

export interface InterpretContext {
  design: StudioDesign;
  template: BookitTemplate;
}

interface Rule {
  id: string;
  /** Matched against the normalised prompt. */
  test: RegExp;
  build: (context: InterpretContext, match: RegExpMatchArray) => DesignOperation[];
}

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

const MOTIFS: Record<string, string> = {
  kitenge: "kitenge",
  kanga: "kanga",
  mudcloth: "mudcloth",
  "bogolan": "mudcloth",
  beadwork: "beadwork",
  beaded: "beadwork",
  beads: "beadwork",
  zellige: "zellige",
  tile: "zellige",
  arabesque: "arabesque",
  damask: "damask",
  linen: "linen",
  herringbone: "herringbone",
  lattice: "lattice",
  trellis: "lattice",
  crosshatch: "crosshatch",
  moire: "moire",
  pinstripe: "pinstripe",
  stripe: "pinstripe",
  arcade: "arcade",
  sprigs: "sprigs",
  eucalyptus: "eucalyptus",
  grain: "grain",
  woven: "kitenge",
  weave: "kitenge",
};

const ORNAMENTS: Record<string, string> = {
  laurel: "laurel",
  wreath: "laurel",
  fleuron: "fleuron",
  flourish: "corner-flourish",
  bracket: "corner-bracket",
  fan: "corner-deco-fan",
  deco: "corner-deco-fan",
  step: "corner-step",
  olive: "sprig-olive",
  fern: "sprig-fern",
  sprig: "sprig-eucalyptus",
  botanical: "sprig-eucalyptus",
  foliage: "sprig-eucalyptus",
  leaves: "sprig-eucalyptus",
  arch: "arch",
  bead: "bead-course",
  seal: "seal-ring",
  crest: "seal-ring-laurel",
  diamond: "diamond-run",
};

/** Every motif and ornament the studio can place — the closed set a model is held to. */
export const KNOWN_MOTIFS = [...new Set(Object.values(MOTIFS))];
export const KNOWN_ORNAMENTS = [...new Set(Object.values(ORNAMENTS))];

const EFFECTS: Array<[RegExp, MaterialEffect]> = [
  [/\brose[ -]?gold\b/, "foil-rose"],
  [/\bsilver (foil|leaf)\b|\bsilver\b(?=.*\b(names?|monogram|foil)\b)/, "foil-silver"],
  [/\b(gold|gilded|gilt)\b/, "foil-gold"],
  [/\bletterpress(ed)?\b|\bpressed into\b/, "letterpress"],
  [/\bemboss(ed|ing)?\b|\braised\b/, "emboss"],
  [/\bdeboss(ed)?\b|\bdebossed\b|\bstamped in\b/, "deboss"],
];

/** Words that name a part of the design, longest phrase first. */
const ROLE_PATTERNS: Array<[RegExp, ElementRole]> = [
  [/\b(our |the )?names?\b|\bcouple'?s? names?\b/, "names"],
  [/\bmonogram\b|\binitials\b/, "monogram"],
  [/\bhost(s| line)?\b|\bfamil(y|ies)\b/, "hosts"],
  [/\bdate\b|\btime\b|\bwhen\b/, "date"],
  [/\bvenue\b|\baddress\b|\blocation\b|\bwhere\b/, "venue"],
  [/\brsvp\b|\breply\b|\bqr\b/, "rsvp"],
  [/\bdress ?code\b|\bhashtag\b|\bdetails?\b/, "detail"],
  [/\bheading\b|\bheadline\b|\btitle\b|\boccasion\b/, "occasion"],
  [/\bphoto(graph)?\b|\bpicture\b|\bimage\b/, "photo"],
];

function roleIn(prompt: string, fallback: ElementRole = "names"): ElementRole {
  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(prompt)) return role;
  }
  return fallback;
}

/**
 * A field is a different request from an ornament.
 *
 * "Add a eucalyptus sprig" and "a eucalyptus field behind it" share a word and
 * mean opposite things — one is a single drawn mark, the other is a repeating
 * ground. Motifs whose names are also ornament names only become patterns when
 * the sentence actually asks for a field.
 */
const PATTERN_CONTEXT =
  /\b(pattern|texture|field|backdrop|background|behind|wallpaper|tiled|repeating)\b/;

const AMBIGUOUS_MOTIFS = new Set([
  "eucalyptus",
  "sprigs",
  "grain",
  "linen",
  "tile",
  "stripe",
  "woven",
  "weave",
  "trellis",
  "beaded",
  "beads",
  "damask",
]);

/** True when the sentence is asking for something to go away. */
const REMOVING = /\b(remove|delete|drop|lose|take (it |them )?off|get rid of|without|no more|hide)\b/;

/* -------------------------------------------------------------------------- */
/* Rules                                                                       */
/* -------------------------------------------------------------------------- */

const colour = (move: ColourMove): DesignOperation[] => [{ kind: "colour", move }];

const RULES: Rule[] = [
  /* ------------------------------------------------------------ colour --- */
  {
    id: "colour.warmer",
    test: /\bwarm(er|th)?\b|\bcos(y|ier)\b|\bgolden hour\b|\bsun[- ]?warmed\b/,
    build: () => colour("warmer"),
  },
  {
    id: "colour.cooler",
    test: /\bcool(er)?\b|\bcolder\b|\bicier\b|\bblue[rs]?\b(?!.*\bremove\b)/,
    build: () => colour("cooler"),
  },
  {
    id: "colour.deeper",
    test: /\bdark(er)?\b|\bdeep(er)?\b|\bmoodier\b|\bdramatic\b|\bnight\b|\bmidnight\b|\bmoody\b/,
    build: () => colour("deeper"),
  },
  {
    id: "colour.lighter",
    test: /\blight(er)?\b|\bpaler\b|\bbrighter\b|\bsummery\b|\bdaytime\b/,
    build: () => colour("lighter"),
  },
  {
    id: "colour.softer",
    test: /\bsofter\b|\bmuted\b|\bunderstated\b|\bquieter colou?rs?\b|\bdusty\b|\bwashed\b/,
    build: () => colour("softer"),
  },
  {
    id: "colour.richer",
    test: /\bricher\b|\bsaturated\b|\bbolder colou?rs?\b|\bmore colou?r\b|\bpunchier\b|\bjewel\b/,
    build: () => colour("richer"),
  },
  {
    id: "colour.invert",
    test: /\b(invert|reverse|flip)( the| it)?( colou?rs?| out)?\b|\bnegative\b|\bwhite on (black|dark)\b/,
    build: () => colour("invert"),
  },
  {
    id: "colour.named",
    test: /\b(colou?rway|palette)\b\s*(?:to|as|in|of)?\s*(.+)$/,
    build: ({ template }, match) => {
      const wanted = (match[2] ?? "").toLowerCase();
      const palette = template.palettes.find((entry) =>
        entry.name
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 3 && wanted.includes(word)),
      );
      return palette ? [{ kind: "palette", paletteId: palette.id }] : [];
    },
  },

  /* -------------------------------------------------------------- type --- */
  {
    id: "type.classical",
    test: /\b(classic(al)?|traditional|timeless|old[- ]?school|formal type|engraved)\b/,
    build: () => [{ kind: "type", pairingId: "ceremonial" }],
  },
  {
    id: "type.modern",
    test: /\b(modern|contemporary|clean|current|swiss)\b(?!.*\bafrican\b)/,
    build: () => [{ kind: "type", pairingId: "modern" }],
  },
  {
    id: "type.editorial",
    test: /\b(editorial|magazine|fashion|vogue)\b/,
    build: () => [{ kind: "type", pairingId: "editorial" }],
  },
  {
    id: "type.script",
    test: /\b(script|calligraph(y|ic)|handwritten|cursive|flowing type)\b/,
    build: () => [{ kind: "type", pairingId: "calligraphy" }],
  },
  {
    id: "type.deco",
    test: /\b(deco|art ?deco|twenties|gatsby)\b/,
    build: () => [{ kind: "type", pairingId: "italiana" }],
  },
  {
    id: "type.bold",
    test: /\b(bold(er)? type|poster|loud|condensed|impactful type)\b/,
    build: () => [{ kind: "type", pairingId: "condensed" }],
  },

  /* -------------------------------------------------------------- size --- */
  {
    id: "size.up",
    test: /\b(bigger|larger|grow|increase|louder|more prominent|scale up)\b/,
    build: (context, match) => [{ kind: "scale", role: roleIn(match.input ?? ""), factor: 1.14 }],
  },
  {
    id: "size.down",
    test: /\b(smaller|reduce|shrink|less prominent|scale down|quieter)\b/,
    build: (context, match) => [{ kind: "scale", role: roleIn(match.input ?? ""), factor: 0.88 }],
  },
  {
    id: "tracking.open",
    test: /\b(wider letter|letter[- ]?spacing|tracking|more spaced|spaced out|airy letters)\b/,
    build: (context, match) =>
      REMOVING.test(match.input ?? "")
        ? [{ kind: "tracking", role: roleIn(match.input ?? ""), delta: -0.04 }]
        : [{ kind: "tracking", role: roleIn(match.input ?? ""), delta: 0.06 }],
  },
  {
    id: "case.upper",
    test: /\b(capitals?|uppercase|all caps|caps)\b/,
    build: (context, match) => [{ kind: "case", role: roleIn(match.input ?? ""), uppercase: true }],
  },
  {
    id: "case.lower",
    test: /\b(sentence case|upper and lower|title case|not shouting|lowercase)\b/,
    build: (context, match) => [{ kind: "case", role: roleIn(match.input ?? ""), uppercase: false }],
  },

  /* ------------------------------------------------------------ finish --- */
  {
    id: "effect.set",
    test: /\b(foil|gold|gilded|gilt|silver|rose[ -]?gold|letterpress|emboss|deboss|pressed|raised)\b/,
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (REMOVING.test(prompt)) {
        return [{ kind: "effect", role: roleIn(prompt), effect: "none" }];
      }
      const found = EFFECTS.find(([pattern]) => pattern.test(prompt));
      if (!found) return [];
      return [{ kind: "effect", role: roleIn(prompt), effect: found[1] }];
    },
  },
  {
    id: "effect.none",
    test: /\b(flat ink|plain ink|no finish|matte|no foil)\b/,
    build: (context, match) => [{ kind: "effect", role: roleIn(match.input ?? ""), effect: "none" }],
  },

  /* ------------------------------------------------------------ layout --- */
  {
    id: "layout.airier",
    test: /\b(airier|more air|more space|breathing room|more white ?space|generous|spacious|less crowded)\b/,
    build: () => [{ kind: "space", factor: 0.93 }],
  },
  {
    id: "layout.tighter",
    test: /\b(tighter|more compact|fill the card|closer together|less empty)\b/,
    build: () => [{ kind: "space", factor: 1.06 }],
  },
  {
    id: "layout.left",
    test: /\b(flush left|align(ed)? left|left[- ]align|ragged right)\b/,
    build: () => [{ kind: "align", align: "left" }],
  },
  {
    id: "layout.centre",
    test: /\b(cent(re|er)(ed)?|symmetric(al)?)\b/,
    build: () => [{ kind: "align", align: "center" }],
  },
  {
    id: "layout.right",
    test: /\b(flush right|align(ed)? right|right[- ]align)\b/,
    build: () => [{ kind: "align", align: "right" }],
  },

  /* ----------------------------------------------------------- pattern --- */
  {
    id: "pattern.remove",
    test: /\b(pattern|texture|backdrop|background field)\b/,
    build: (context, match) =>
      REMOVING.test(match.input ?? "") ? [{ kind: "pattern", remove: true }] : [],
  },
  {
    id: "pattern.set",
    test: new RegExp(`\\b(${Object.keys(MOTIFS).join("|")})s?\\b`),
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (REMOVING.test(prompt)) return [{ kind: "pattern", remove: true }];
      // "printed on linen" is a paper instruction, not a request for a field.
      if (/\bpaper\b|\bstock\b/.test(prompt)) return [];
      const word = match[1] ?? "";
      if (AMBIGUOUS_MOTIFS.has(word) && !PATTERN_CONTEXT.test(prompt)) return [];
      const motif = MOTIFS[word];
      if (!motif) return [];
      // "Quiet" is a strength, not a mood — a host who asks for a quiet field
      // and gets a loud one has been ignored.
      const quiet = /\b(quiet|subtle|faint|barely|whisper|soft)\b/.test(prompt);
      return [{ kind: "pattern", motif, ...(quiet ? { opacity: 0.06 } : {}) }];
    },
  },
  {
    id: "pattern.quieter",
    test: /\b(quieter|subtler|fainter|barely there) (pattern|texture|field)\b|\bpattern (quieter|subtler|fainter)\b/,
    build: ({ design }) => [
      {
        kind: "pattern",
        opacity: Math.max(
          0.04,
          (patternOpacity(design) ?? 0.12) - 0.05,
        ),
      },
    ],
  },
  {
    id: "pattern.stronger",
    test: /\b(stronger|bolder|more visible|bring up the) (pattern|texture|field)\b/,
    build: ({ design }) => [
      { kind: "pattern", opacity: Math.min(0.3, (patternOpacity(design) ?? 0.12) + 0.06) },
    ],
  },

  /* ---------------------------------------------------------- ornament --- */
  {
    id: "ornament.remove",
    test: /\b(ornament|flourish|decoration|decorative|swirls?|frills?|fuss)\b/,
    build: (context, match) =>
      REMOVING.test(match.input ?? "") ? [{ kind: "ornament", remove: true }] : [],
  },
  {
    id: "ornament.add",
    test: new RegExp(`\\b(${Object.keys(ORNAMENTS).join("|")})s?\\b`),
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (REMOVING.test(prompt)) return [{ kind: "ornament", remove: true }];
      // "a diamond monogram" is a monogram instruction; the monogram rule has it.
      if (/\bmonogram\b|\binitials\b/.test(prompt)) return [];
      const art = ORNAMENTS[match[1] ?? ""];
      return art ? [{ kind: "ornament", art }] : [];
    },
  },

  /* ---------------------------------------------------------- monogram --- */
  {
    id: "monogram",
    test: /\bmonogram\b|\binitials\b|\bcrest\b/,
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (REMOVING.test(prompt)) return [{ kind: "monogram", remove: true }];
      const style = /\bcircle|round\b/.test(prompt)
        ? "circle"
        : /\bdiamond\b/.test(prompt)
          ? "diamond"
          : /\bshield\b/.test(prompt)
            ? "shield"
            : /\bseal|wax\b/.test(prompt)
              ? "seal"
              : /\bstacked\b/.test(prompt)
                ? "stacked"
                : undefined;
      return [{ kind: "monogram", style }];
    },
  },

  /* ------------------------------------------------------------- photo --- */
  {
    id: "photo",
    test: /\b(photo(graph)?|picture|portrait|image)\b/,
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (REMOVING.test(prompt)) return [{ kind: "photo", remove: true }];
      const mask = /\barch\b/.test(prompt)
        ? "arch"
        : /\bcircle|round\b/.test(prompt)
          ? "circle"
          : /\brounded\b/.test(prompt)
            ? "rounded"
            : undefined;
      return [{ kind: "photo", mask }];
    },
  },

  /* ------------------------------------------------------------- paper --- */
  {
    id: "paper",
    test: /\b(cotton|handmade|linen finish|vellum|paper|stock|texture off)\b/,
    build: (context, match) => {
      const prompt = match.input ?? "";
      if (/\btexture off\b|\bno (paper )?texture\b/.test(prompt)) {
        return [{ kind: "paper", stock: "none" }];
      }
      if (/\bhandmade\b/.test(prompt)) return [{ kind: "paper", stock: "handmade" }];
      if (/\bvellum\b/.test(prompt)) return [{ kind: "paper", stock: "vellum" }];
      if (/\blinen\b/.test(prompt)) return [{ kind: "paper", stock: "linen" }];
      if (/\bcotton\b/.test(prompt)) return [{ kind: "paper", stock: "cotton" }];
      return [];
    },
  },

  /* -------------------------------------------------------- visibility --- */
  {
    id: "visibility",
    test: /\b(remove|delete|drop|hide|lose|take off) the (dress ?code|hashtag|rsvp|host|date|venue|details?)\b/,
    build: (context, match) => [{ kind: "visibility", role: roleIn(match.input ?? "", "detail"), hidden: true }],
  },

  /* ----------------------------------------------------------- content --- */
  {
    id: "content.quoted",
    test: /(?:call it|title it|make it say|it should say|say)\s+["“']([^"”']{2,60})["”']/,
    build: (context, match) => [{ kind: "content", role: "occasion", text: match[1] ?? "" }],
  },
];

/* -------------------------------------------------------------------------- */
/* Directions — a whole mood in one sentence                                   */
/* -------------------------------------------------------------------------- */

interface Direction {
  id: string;
  test: RegExp;
  operations: DesignOperation[];
}

const DIRECTIONS: Direction[] = [
  {
    id: "mood.black-tie",
    test: /\bblack[- ]?tie\b|\bformal(?! type)\b|\bevening\b|\bgala\b|\bceremonious\b/,
    operations: [
      { kind: "colour", move: "deeper" },
      { kind: "case", role: "names", uppercase: true },
      { kind: "tracking", role: "names", delta: 0.04 },
      { kind: "effect", role: "names", effect: "foil-gold" },
    ],
  },
  {
    id: "mood.minimal",
    test: /\bminimal(ist)?\b|\bstrip(ped)? (it )?back\b|\bsimpler\b|\bpare(d)? (it )?down\b|\bless is more\b/,
    operations: [
      { kind: "ornament", remove: true },
      { kind: "pattern", remove: true },
      { kind: "effect", role: "names", effect: "none" },
      { kind: "space", factor: 0.93 },
    ],
  },
  {
    id: "mood.romantic",
    test: /\bromantic\b|\btender\b|\bsoft and\b|\bdreamy\b|\bpretty\b/,
    operations: [
      { kind: "type", pairingId: "calligraphy" },
      { kind: "colour", move: "softer" },
      { kind: "ornament", art: "sprig-eucalyptus" },
    ],
  },
  {
    id: "mood.garden",
    test: /\bgarden\b|\bbotanical\b|\bfloral\b|\boutdoor\b|\bgreener\b/,
    operations: [
      { kind: "ornament", art: "sprig-eucalyptus" },
      { kind: "pattern", motif: "eucalyptus", opacity: 0.08 },
    ],
  },
  {
    id: "mood.traditional",
    test: /\btraditional ceremony\b|\bruracio\b|\bheritage\b|\bcustomary\b|\bhomestead\b/,
    operations: [
      { kind: "colour", move: "warmer" },
      { kind: "pattern", motif: "beadwork", opacity: 0.1 },
      { kind: "type", pairingId: "ceremonial" },
    ],
  },
  {
    id: "mood.coastal",
    test: /\bcoastal\b|\bswahili\b|\bbeach\b|\bocean\b|\bisland\b|\bzanzibar\b|\bdiani\b/,
    operations: [
      { kind: "colour", move: "cooler" },
      { kind: "pattern", motif: "zellige", opacity: 0.09 },
    ],
  },
  {
    id: "mood.celebratory",
    test: /\bfun\b|\bplayful\b|\bparty\b|\bbirthday\b|\bjoyful\b|\blively\b/,
    operations: [
      { kind: "colour", move: "richer" },
      { kind: "type", pairingId: "condensed" },
    ],
  },
  {
    id: "mood.editorial",
    test: /\beditorial\b|\bmagazine\b|\bgallery\b|\bmuseum\b/,
    operations: [
      { kind: "type", pairingId: "editorial" },
      { kind: "align", align: "left" },
      { kind: "ornament", remove: true },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Interpretation                                                              */
/* -------------------------------------------------------------------------- */

export function normalise(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Turns a sentence into operations.
 *
 * A direction — "make it feel black tie" — wins outright, because it already
 * carries a coordinated set of changes and layering ad-hoc rules on top of it
 * would fight them. Otherwise every rule that matches contributes, so "warmer,
 * bigger names, gold" is one prompt rather than three.
 */
export function interpret(prompt: string, context: InterpretContext): DesignIntent {
  const text = normalise(prompt);
  if (!text) {
    return { prompt, operations: [], matched: [], unresolved: true };
  }

  const direction = DIRECTIONS.find((entry) => entry.test.test(text));
  if (direction) {
    const extra = runRules(text, context, new Set(direction.operations.map((op) => op.kind)));
    return {
      prompt,
      operations: [...direction.operations, ...extra.operations],
      matched: [direction.id, ...extra.matched],
      unresolved: false,
    };
  }

  const { operations, matched } = runRules(text, context);
  return { prompt, operations, matched, unresolved: operations.length === 0 };
}

function runRules(
  text: string,
  context: InterpretContext,
  skipKinds = new Set<DesignOperation["kind"]>(),
): { operations: DesignOperation[]; matched: string[] } {
  const operations: DesignOperation[] = [];
  const matched: string[] = [];

  for (const rule of RULES) {
    const match = text.match(rule.test);
    if (!match) continue;
    // `match.input` is how each rule reads the whole sentence for modifiers —
    // which part of the design, whether it is an addition or a removal.
    const produced = rule.build(context, match).filter((op) => !skipKinds.has(op.kind));
    if (produced.length === 0) continue;
    operations.push(...produced);
    matched.push(rule.id);
  }

  return { operations: dedupe(operations), matched };
}

/** Later instructions win when two rules touch the same thing. */
function dedupe(operations: DesignOperation[]): DesignOperation[] {
  const seen = new Map<string, DesignOperation>();
  for (const operation of operations) {
    const key =
      "role" in operation ? `${operation.kind}:${operation.role}` : operation.kind;
    seen.set(key, operation);
  }
  return [...seen.values()];
}

function patternOpacity(design: StudioDesign): number | null {
  const found = design.elements.find((element) => element.type === "pattern");
  return found && found.type === "pattern" ? found.patternOpacity : null;
}

/** Roles the current design actually has, for guidance that stays truthful. */
export function availableRoles(context: InterpretContext): Set<ElementRole> {
  return new Set(context.design.elements.map((element) => roleOf(element, context.template)));
}
