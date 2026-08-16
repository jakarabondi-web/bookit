import { describe, expect, it } from "vitest";
import {
  applyMoves,
  contrast,
  ensureContrast,
  hexToHsl,
  hslToHex,
  shiftPalette,
} from "@/domain/design-studio/colour";
import { followUps, starterPrompts } from "@/domain/design-studio/guidance";
import { operationsSchema } from "@/domain/design-studio/operation-schema";
import {
  applyOperations,
  initialDesign,
  resolvedPalette,
  type DesignOperation,
} from "@/domain/design-studio/operations";
import { interpret } from "@/domain/design-studio/prompting";
import { roleOf } from "@/domain/design-studio/semantics";
import { TEMPLATES, templateBySlug } from "@/domain/design-studio/templates";

/**
 * The prompt console's contract.
 *
 * Two things are being protected here. The interpreter has to keep meaning what
 * it says — a vocabulary that quietly stops recognising "warmer" is worse than
 * one that never did. And the operations have to stay safe: a design should
 * survive any sequence of instructions, including contradictory ones, with its
 * margins, its readability and its locked composition intact.
 */

const MIDNIGHT = templateBySlug("midnight-gilded")!;

function fresh(template = MIDNIGHT) {
  return initialDesign(template);
}

function run(prompt: string, template = MIDNIGHT) {
  const design = fresh(template);
  const intent = interpret(prompt, { design, template });
  const result = applyOperations(design, template, intent.operations);
  return { intent, ...result };
}

describe("colour moves", () => {
  it("round-trips through HSL", () => {
    for (const hex of ["#10221D", "#C9A75E", "#F5EDDD", "#111111", "#FFFFFF"]) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex.toUpperCase());
    }
  });

  it("warms toward amber and cools toward blue", () => {
    const palette = MIDNIGHT.palettes[0]!;
    const warm = hexToHsl(shiftPalette(palette, "warmer").ground);
    const cool = hexToHsl(shiftPalette(palette, "cooler").ground);
    const base = hexToHsl(palette.ground);
    expect(Math.abs(warm.h - 30)).toBeLessThan(Math.abs(base.h - 30));
    expect(Math.abs(cool.h - 214)).toBeLessThan(Math.abs(base.h - 214));
  });

  it("keeps text readable however far the colourway is pushed", () => {
    for (const template of TEMPLATES) {
      for (const palette of template.palettes) {
        for (const moves of [
          ["lighter", "lighter", "lighter"],
          ["deeper", "deeper", "deeper"],
          ["softer", "lighter", "warmer"],
          ["invert"],
        ] as const) {
          const shifted = applyMoves(palette, [...moves]);
          expect(
            contrast(shifted.ink, shifted.ground),
            `${template.id}/${palette.id}/${moves.join("+")}`,
          ).toBeGreaterThanOrEqual(6.9);
        }
      }
    }
  });

  it("leaves a readable pair alone", () => {
    expect(ensureContrast("#111111", "#FFFFFF")).toBe("#111111");
  });

  it("names the move without stacking labels", () => {
    const twice = applyMoves(MIDNIGHT.palettes[0]!, ["warmer", "deeper"]);
    expect(twice.name).toBe("Forest Gold, deeper");
  });
});

describe("interpretation", () => {
  it("reads a plain colour instruction", () => {
    expect(run("warmer").intent.operations).toEqual([{ kind: "colour", move: "warmer" }]);
  });

  it("reads several instructions in one sentence", () => {
    const { intent } = run("warmer, bigger names and gold foil");
    const kinds = intent.operations.map((operation) => operation.kind);
    expect(kinds).toContain("colour");
    expect(kinds).toContain("scale");
    expect(kinds).toContain("effect");
  });

  it("knows which part of the design is being talked about", () => {
    const { intent } = run("make the venue smaller");
    expect(intent.operations).toContainEqual({ kind: "scale", role: "venue", factor: 0.88 });
  });

  it("understands removal", () => {
    expect(run("remove the pattern").intent.operations).toContainEqual({
      kind: "pattern",
      remove: true,
    });
    expect(run("no foil on the names").intent.operations).toContainEqual({
      kind: "effect",
      role: "names",
      effect: "none",
    });
  });

  it("takes a whole mood as a coordinated set of changes", () => {
    const { intent } = run("make it feel black tie");
    expect(intent.operations.length).toBeGreaterThan(2);
    expect(intent.matched).toContain("mood.black-tie");
  });

  it("does not treat a paper instruction as a pattern", () => {
    const { intent } = run("print it on linen paper");
    expect(intent.operations).toEqual([{ kind: "paper", stock: "linen" }]);
  });

  it("does not switch colourway because a finish was named", () => {
    const { intent } = run("set the names in gold");
    expect(intent.operations.every((operation) => operation.kind !== "palette")).toBe(true);
  });

  it("flags a prompt it cannot place rather than guessing", () => {
    const { intent } = run("my aunt is coming from Kisumu on Thursday");
    expect(intent.unresolved).toBe(true);
    expect(intent.operations).toHaveLength(0);
  });

  it("produces only operations the schema accepts", () => {
    const prompts = [
      "warmer",
      "deeper and moodier",
      "make it feel black tie",
      "strip it back, minimal",
      "add a eucalyptus sprig",
      "a quiet beadwork field behind it",
      "gold foil on the names",
      "set the names in capitals",
      "flush left",
      "give it more air",
      "add our monogram",
      "add a photograph in an arch",
      "print it on handmade paper",
      "coastal",
      "more romantic",
      "traditional ceremony feel",
    ];
    for (const prompt of prompts) {
      const { intent } = run(prompt);
      expect(intent.unresolved, prompt).toBe(false);
      expect(operationsSchema.safeParse(intent.operations).success, prompt).toBe(true);
    }
  });
});

describe("applying changes", () => {
  it("says what it did in plain words", () => {
    const { notes } = run("warmer");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/warmer/i);
  });

  it("refuses a finish on body text and explains why", () => {
    const design = fresh();
    const { notes, refusals } = applyOperations(design, MIDNIGHT, [
      { kind: "effect", role: "venue", effect: "foil-gold" },
    ]);
    expect(notes).toHaveLength(0);
    expect(refusals[0]).toMatch(/costume jewellery/);
  });

  it("allows the same finish in Creative Mode", () => {
    const design = { ...fresh(), designerMode: false };
    const { notes } = applyOperations(design, MIDNIGHT, [
      { kind: "effect", role: "venue", effect: "foil-gold" },
    ]);
    expect(notes).toHaveLength(1);
  });

  it("holds the type scale in Designer Mode", () => {
    let design = fresh();
    for (let step = 0; step < 8; step += 1) {
      design = applyOperations(design, MIDNIGHT, [
        { kind: "scale", role: "names", factor: 1.14 },
      ]).design;
    }
    const names = design.elements.find((element) => roleOf(element, MIDNIGHT) === "names")!;
    const original = MIDNIGHT.elements.find((element) => element.id === names.id)!;
    if (names.type !== "text" || original.type !== "text") throw new Error("expected text");
    expect(names.fontSize).toBeLessThanOrEqual(original.fontSize * 1.4 + 0.01);
  });

  it("will not hide an element the composition depends on", () => {
    const { refusals } = applyOperations(fresh(), MIDNIGHT, [
      { kind: "visibility", role: "frame", hidden: true },
    ]);
    expect(refusals[0]).toMatch(/locked in Designer Mode/);
  });

  it("keeps every element on the board through any sequence", () => {
    const sequence: DesignOperation[] = [
      { kind: "space", factor: 0.9 },
      { kind: "space", factor: 1.2 },
      { kind: "align", align: "left" },
      { kind: "scale", role: "names", factor: 1.3 },
      { kind: "align", align: "right" },
      { kind: "space", factor: 1.2 },
      { kind: "align", align: "center" },
    ];

    for (const template of TEMPLATES) {
      const { design } = applyOperations(initialDesign(template), template, sequence);
      const canvas = { width: 0, height: 0 };
      const size = template.size;
      Object.assign(canvas, {
        invitation: { width: 720, height: 1008 },
        landscape: { width: 1008, height: 720 },
        square: { width: 864, height: 864 },
        place: { width: 504, height: 360 },
        story: { width: 608, height: 1080 },
      }[size]);

      for (const element of design.elements) {
        expect(element.x, `${template.id}/${element.id}`).toBeGreaterThanOrEqual(0);
        expect(element.y, `${template.id}/${element.id}`).toBeGreaterThanOrEqual(0);
        expect(element.x + element.width, `${template.id}/${element.id}`).toBeLessThanOrEqual(
          canvas.width + 0.01,
        );
      }
    }
  });

  it("stacks colour nudges and stops before the palette falls apart", () => {
    let design = fresh();
    for (let step = 0; step < 10; step += 1) {
      design = applyOperations(design, MIDNIGHT, [{ kind: "colour", move: "warmer" }]).design;
    }
    expect(design.colourMoves.length).toBeLessThanOrEqual(6);
    const palette = resolvedPalette(design, MIDNIGHT);
    expect(contrast(palette.ink, palette.ground)).toBeGreaterThan(6.9);
  });

  it("drops accumulated nudges when a colourway is chosen deliberately", () => {
    let design = fresh();
    design = applyOperations(design, MIDNIGHT, [{ kind: "colour", move: "warmer" }]).design;
    design = applyOperations(design, MIDNIGHT, [
      { kind: "palette", paletteId: MIDNIGHT.palettes[1]!.id },
    ]).design;
    expect(design.colourMoves).toHaveLength(0);
    expect(resolvedPalette(design, MIDNIGHT).id).toBe(MIDNIGHT.palettes[1]!.id);
  });

  it("adds an ornament into the space the designer left, or says there is none", () => {
    for (const template of TEMPLATES) {
      const { notes, refusals, design } = applyOperations(initialDesign(template), template, [
        { kind: "ornament", art: "fleuron" },
      ]);
      expect(notes.length + refusals.length, template.id).toBe(1);
      if (notes.length === 1) {
        const added = design.elements.find((element) => element.id === "studio-ornament")!;
        const overlaps = design.elements.some(
          (element) =>
            element.id !== added.id &&
            element.type === "text" &&
            added.y < element.y + element.height &&
            added.y + added.height > element.y,
        );
        expect(overlaps, `${template.id} ornament lands on type`).toBe(false);
      }
    }
  });
});

describe("guidance", () => {
  it("opens with prompts drawn from the design itself", () => {
    for (const template of TEMPLATES) {
      const starters = starterPrompts(template);
      expect(starters.length, template.id).toBeGreaterThanOrEqual(3);
      for (const starter of starters) {
        const intent = interpret(starter, { design: initialDesign(template), template });
        expect(intent.unresolved, `${template.id}: "${starter}"`).toBe(false);
      }
    }
  });

  it("only ever suggests something the studio can actually do", () => {
    for (const template of TEMPLATES) {
      const design = initialDesign(template);
      for (const suggestion of followUps(design, template)) {
        const intent = interpret(suggestion, { design, template });
        expect(intent.unresolved, `${template.id}: "${suggestion}"`).toBe(false);
      }
    }
  });

  it("stops offering a monogram once there is one", () => {
    const design = applyOperations(fresh(), MIDNIGHT, [{ kind: "monogram" }]).design;
    expect(followUps(design, MIDNIGHT)).not.toContain("add our monogram");
  });
});
