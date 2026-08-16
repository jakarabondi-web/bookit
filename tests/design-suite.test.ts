import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT, bindingsIn, resolveBindings } from "@/domain/design-studio/bindings";
import { applyOperations, initialDesign } from "@/domain/design-studio/operations";
import { SUITE_NOTES, buildSuite, signatureOf } from "@/domain/design-studio/suite";
import { TEMPLATES, templateBySlug } from "@/domain/design-studio/templates";
import { CANVAS_SIZES, sortedElements } from "@/domain/design-studio/types";

/**
 * The suite's contract.
 *
 * A derived piece can go wrong in ways a hand-composed one cannot: a menu with
 * seven courses running off the sheet, a name inheriting a size that suited the
 * invitation and looks absurd on a place card, a piece that silently loses the
 * design it was meant to carry. These check the derivation holds for every
 * template, including templates that have been through the studio.
 */

const MIDNIGHT = templateBySlug("midnight-gilded")!;

function suiteFor(template = MIDNIGHT) {
  return buildSuite(template, template.elements, DEFAULT_CONTEXT);
}

describe("the suite", () => {
  it("carries every piece an event needs", () => {
    const kinds = suiteFor().map((piece) => piece.kind);
    expect(kinds).toEqual([
      "saveTheDate",
      "details",
      "rsvp",
      "programme",
      "menu",
      "placeCard",
      "tableNumber",
      "welcomeSign",
      "seatingChart",
      "thankYou",
      "mobile",
    ]);
  });

  it("explains what each piece is for", () => {
    for (const piece of suiteFor()) {
      expect(SUITE_NOTES[piece.kind], piece.kind).toBeTruthy();
    }
  });

  it("builds for every template in the library", () => {
    for (const template of TEMPLATES) {
      expect(buildSuite(template, template.elements, DEFAULT_CONTEXT), template.id).toHaveLength(11);
    }
  });
});

describe("composition", () => {
  it("keeps every element on its sheet", () => {
    for (const template of TEMPLATES) {
      for (const piece of buildSuite(template, template.elements, DEFAULT_CONTEXT)) {
        const canvas = CANVAS_SIZES[piece.size];
        for (const element of piece.elements) {
          const where = `${template.id}/${piece.kind}/${element.id}`;
          expect(element.x, where).toBeGreaterThanOrEqual(0);
          expect(element.y, where).toBeGreaterThanOrEqual(0);
          expect(element.x + element.width, `${where} overflows right`).toBeLessThanOrEqual(
            canvas.width + 0.01,
          );
          expect(element.y + element.height, `${where} overflows bottom`).toBeLessThanOrEqual(
            canvas.height + 0.01,
          );
        }
      }
    }
  });

  it("gives every element a unique id within its piece", () => {
    for (const template of TEMPLATES) {
      for (const piece of buildSuite(template, template.elements, DEFAULT_CONTEXT)) {
        const ids = piece.elements.map((element) => element.id);
        expect(new Set(ids).size, `${template.id}/${piece.kind}`).toBe(ids.length);
      }
    }
  });

  it("starts every piece with a ground that fills the sheet", () => {
    for (const template of TEMPLATES) {
      for (const piece of buildSuite(template, template.elements, DEFAULT_CONTEXT)) {
        const canvas = CANVAS_SIZES[piece.size];
        const first = sortedElements(piece.elements)[0]!;
        expect(first.width, `${template.id}/${piece.kind}`).toBe(canvas.width);
        expect(first.height, `${template.id}/${piece.kind}`).toBe(canvas.height);
      }
    }
  });

  it("resolves every binding it prints", () => {
    for (const template of TEMPLATES) {
      for (const piece of buildSuite(template, template.elements, DEFAULT_CONTEXT)) {
        for (const element of piece.elements) {
          if (element.type !== "text") continue;
          for (const path of bindingsIn(element.content)) {
            const resolved = resolveBindings(`{{${path}}}`, DEFAULT_CONTEXT);
            expect(resolved, `${template.id}/${piece.kind} · ${path}`).not.toContain("{{");
          }
        }
      }
    }
  });

  it("sets a name on a place card smaller than on the invitation", () => {
    for (const template of TEMPLATES) {
      const pieces = buildSuite(template, template.elements, DEFAULT_CONTEXT);
      const place = pieces.find((piece) => piece.kind === "placeCard")!;
      const largest = Math.max(
        ...place.elements.filter((element) => element.type === "text").map((element) =>
          element.type === "text" ? element.fontSize : 0,
        ),
      );
      // A place card is read at arm's length, not across a room.
      expect(largest, template.id).toBeLessThanOrEqual(30);
    }
  });

  it("holds the longest programme and menu the samples carry", () => {
    const longest = {
      ...DEFAULT_CONTEXT,
      programme: Array.from({ length: 9 }, (_, index) => ({
        time: `${index + 1}:00`,
        item: "Something happens at this point in the day",
      })),
      menu: Array.from({ length: 7 }, (_, index) => ({
        course: `Course ${index + 1}`,
        dish: "A dish with a long enough name to wrap onto a second line",
      })),
    };

    for (const template of TEMPLATES) {
      for (const piece of buildSuite(template, template.elements, longest)) {
        const canvas = CANVAS_SIZES[piece.size];
        for (const element of piece.elements) {
          expect(
            element.y + element.height,
            `${template.id}/${piece.kind}/${element.id}`,
          ).toBeLessThanOrEqual(canvas.height + 0.01);
        }
      }
    }
  });
});

describe("following the design", () => {
  it("reads the invitation rather than the template's original", () => {
    const edited = applyOperations(initialDesign(MIDNIGHT), MIDNIGHT, [
      { kind: "case", role: "names", uppercase: false },
      { kind: "effect", role: "names", effect: "letterpress" },
    ]).design;

    const before = signatureOf(MIDNIGHT, MIDNIGHT.elements);
    const after = signatureOf(MIDNIGHT, edited.elements);

    expect(before.names.uppercase).toBe(true);
    expect(after.names.uppercase).toBe(false);
    expect(after.names.effect).toBe("letterpress");
  });

  it("carries a studio change into every piece that sets names", () => {
    const edited = applyOperations(initialDesign(MIDNIGHT), MIDNIGHT, [
      { kind: "effect", role: "names", effect: "foil-silver" },
    ]).design;

    const pieces = buildSuite(MIDNIGHT, edited.elements, DEFAULT_CONTEXT);
    const welcome = pieces.find((piece) => piece.kind === "welcomeSign")!;
    const names = welcome.elements.find(
      (element) => element.type === "text" && element.content.includes("couple.firstName"),
    )!;
    expect(names.type === "text" && names.effect).toBe("foil-silver");
  });

  it("takes the pattern and the frame with it", () => {
    const withField = applyOperations(initialDesign(MIDNIGHT), MIDNIGHT, [
      { kind: "pattern", motif: "damask" },
    ]).design;

    for (const piece of buildSuite(MIDNIGHT, withField.elements, DEFAULT_CONTEXT)) {
      const pattern = piece.elements.find((element) => element.type === "pattern");
      expect(pattern, piece.kind).toBeTruthy();
      expect(pattern?.type === "pattern" && pattern.motif).toBe("damask");
    }
  });

  it("prefers a hand-authored piece when a template ships one", () => {
    const authored = {
      ...MIDNIGHT,
      suite: [{ kind: "menu" as const, name: "Hand-set menu", size: "square" as const, elements: [] }],
    };
    const menu = buildSuite(authored, authored.elements, DEFAULT_CONTEXT).find(
      (piece) => piece.kind === "menu",
    )!;
    expect(menu.name).toBe("Hand-set menu");
  });
});
