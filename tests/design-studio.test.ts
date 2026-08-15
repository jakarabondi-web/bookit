import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTEXT,
  LONG_NAME_CONTEXT,
  bindingsIn,
  resolveBindings,
} from "@/domain/design-studio/bindings";
import { TEMPLATES, filterTemplates, templateBySlug } from "@/domain/design-studio/templates";
import { CANVAS_SIZES, paletteFor, sortedElements } from "@/domain/design-studio/types";

/**
 * The design engine's contract.
 *
 * These are the invariants a hand-composed template can silently break: an
 * element drifting outside the board, a binding that resolves to nothing, a
 * type system with more faces than the design rules allow. They exist so the
 * library can grow past twelve without every addition needing a visual review
 * to catch a mechanical mistake.
 */

describe("template library", () => {
  it("ships the twelve master designs", () => {
    expect(TEMPLATES).toHaveLength(12);
  });

  it("keeps ids and slugs unique", () => {
    const ids = TEMPLATES.map((t) => t.id);
    const slugs = TEMPLATES.map((t) => t.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves every design by slug", () => {
    for (const template of TEMPLATES) {
      expect(templateBySlug(template.slug)?.id).toBe(template.id);
    }
    expect(templateBySlug("not-a-design")).toBeNull();
  });
});

describe("composition", () => {
  it("keeps every element inside its board", () => {
    for (const template of TEMPLATES) {
      const canvas = CANVAS_SIZES[template.size];
      for (const element of template.elements) {
        expect(element.x, `${template.id}/${element.id} x`).toBeGreaterThanOrEqual(0);
        expect(element.y, `${template.id}/${element.id} y`).toBeGreaterThanOrEqual(0);
        expect(
          element.x + element.width,
          `${template.id}/${element.id} overflows right`,
        ).toBeLessThanOrEqual(canvas.width);
        expect(
          element.y + element.height,
          `${template.id}/${element.id} overflows bottom`,
        ).toBeLessThanOrEqual(canvas.height);
      }
    }
  });

  it("gives every element a unique id within its template", () => {
    for (const template of TEMPLATES) {
      const ids = template.elements.map((element) => element.id);
      expect(new Set(ids).size, template.id).toBe(ids.length);
    }
  });

  it("assigns a paint order", () => {
    for (const template of TEMPLATES) {
      const order = sortedElements(template.elements).map((element) => element.zIndex);
      expect(order, template.id).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("starts every design with a ground that fills the board", () => {
    for (const template of TEMPLATES) {
      const canvas = CANVAS_SIZES[template.size];
      const first = sortedElements(template.elements)[0]!;
      expect(first.width, template.id).toBe(canvas.width);
      expect(first.height, template.id).toBe(canvas.height);
    }
  });
});

describe("design rules", () => {
  it("never allows more faces than the rules permit", () => {
    for (const template of TEMPLATES) {
      const faces = new Set(
        [
          template.fontSystem.display,
          template.fontSystem.body,
          template.fontSystem.accent,
        ].filter(Boolean),
      );
      expect(faces.size, template.id).toBeLessThanOrEqual(template.designRules.maxFonts);
      // The brief caps this at two mains plus one restricted accent.
      expect(faces.size, template.id).toBeLessThanOrEqual(3);
    }
  });

  it("only locks and marks optional elements that exist", () => {
    for (const template of TEMPLATES) {
      const ids = new Set(template.elements.map((element) => element.id));
      for (const id of template.designRules.lockedElements) {
        expect(ids.has(id), `${template.id} locks missing ${id}`).toBe(true);
      }
      for (const id of template.designRules.optionalElements) {
        expect(ids.has(id), `${template.id} optionalises missing ${id}`).toBe(true);
      }
    }
  });

  it("keeps a real margin", () => {
    for (const template of TEMPLATES) {
      expect(template.designRules.minMargin, template.id).toBeGreaterThanOrEqual(40);
    }
  });

  it("ships at least four colourways per design", () => {
    for (const template of TEMPLATES) {
      expect(template.palettes.length, template.id).toBeGreaterThanOrEqual(4);
      const ids = template.palettes.map((palette) => palette.id);
      expect(new Set(ids).size, template.id).toBe(ids.length);
    }
  });

  it("uses six-digit hex for every palette role", () => {
    for (const template of TEMPLATES) {
      for (const palette of template.palettes) {
        for (const role of ["ground", "surface", "ink", "muted", "accent", "accentSoft"] as const) {
          expect(palette[role], `${template.id}/${palette.id}/${role}`).toMatch(
            /^#[0-9A-Fa-f]{6}$/,
          );
        }
      }
    }
  });

  it("falls back to the first colourway for an unknown id", () => {
    const template = TEMPLATES[0]!;
    expect(paletteFor(template, "nope").id).toBe(template.palettes[0]!.id);
    expect(paletteFor(template, null).id).toBe(template.palettes[0]!.id);
  });
});

describe("data bindings", () => {
  it("resolves every binding used across the library", () => {
    for (const template of TEMPLATES) {
      for (const element of template.elements) {
        if (element.type !== "text") continue;
        for (const path of bindingsIn(element.content)) {
          const resolved = resolveBindings(`{{${path}}}`, DEFAULT_CONTEXT);
          expect(resolved, `${template.id} · ${path}`).not.toContain("{{");
          expect(resolved.length, `${template.id} · ${path}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("falls back to a readable placeholder rather than a gap", () => {
    const empty = { ...DEFAULT_CONTEXT, couple: { firstName: "", secondName: "", initials: "" } };
    expect(resolveBindings("{{couple.firstName}}", empty)).toBe("Amara");
  });

  it("leaves an unknown binding visible rather than silently blank", () => {
    expect(resolveBindings("{{nope.nope}}", DEFAULT_CONTEXT)).toBe("{{nope.nope}}");
  });

  it("carries a long-name case for template QA", () => {
    expect(LONG_NAME_CONTEXT.couple.firstName.length).toBeGreaterThan(8);
    expect(LONG_NAME_CONTEXT.couple.secondName.length).toBeGreaterThan(8);
  });
});

describe("gallery filtering", () => {
  it("narrows by direction and by occasion", () => {
    const blackTie = filterTemplates({ direction: "black-tie" });
    expect(blackTie.length).toBeGreaterThan(0);
    expect(blackTie.every((t) => t.directions.includes("black-tie"))).toBe(true);

    const ruracio = filterTemplates({ event: "ruracio" });
    expect(ruracio.length).toBeGreaterThan(0);
    expect(ruracio.every((t) => t.events.includes("ruracio"))).toBe(true);
  });

  it("searches names, collections and cultural references", () => {
    expect(filterTemplates({ query: "swahili" }).length).toBeGreaterThan(0);
    expect(filterTemplates({ query: "ruracio" }).length).toBeGreaterThan(0);
    expect(filterTemplates({ query: "zzzz" })).toHaveLength(0);
  });

  it("covers every occasion the gallery offers a filter for", () => {
    for (const event of ["wedding", "ruracio", "corporate", "birthday"] as const) {
      expect(filterTemplates({ event }).length, event).toBeGreaterThan(0);
    }
  });
});

describe("cultural policy", () => {
  it("phrases cultural references as inspiration rather than authenticity", () => {
    for (const template of TEMPLATES) {
      for (const tag of template.culturalTags ?? []) {
        expect(tag, template.id).toMatch(
          /inspired|architectural|contemporary|coastal|geometry|textile/i,
        );
      }
    }
  });
});
