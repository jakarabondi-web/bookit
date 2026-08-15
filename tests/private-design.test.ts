import { describe, expect, it } from "vitest";
import { designOf, defaultPrivatePage } from "@/domain/private-event";
import {
  BORDERS,
  MOTIFS,
  CUSTOM_PALETTE_ID,
  FONT_PAIRINGS,
  PALETTES,
  activePalette,
  designFromLegacyTheme,
  displayTypeStyle,
  fontPairingById,
  paletteById,
  resolveTheme,
  type Palette,
  type PrivateDesign,
} from "@/domain/private-design";
import {
  COLLECTIONS,
  DEFAULT_TEMPLATE_ID,
  INVITATION_TEMPLATES,
  borderById,
  templateById,
} from "@/domain/private-design";
import { luminance, paletteFromSwatches } from "@/lib/extract-palette";

/**
 * The design module's contract with everything downstream: any combination of
 * the four axes resolves to a theme that renders, and an invitation saved
 * before the module existed keeps looking exactly as it did.
 */

const design = (patch: Partial<PrivateDesign> = {}): PrivateDesign => ({
  paletteId: "gold-ivory",
  fontId: "classic",
  backgroundId: "plain",
  heroLayout: "OVERLAY",
  ...patch,
});

describe("resolveTheme", () => {
  it("resolves every combination of the four axes", () => {
    for (const palette of PALETTES) {
      for (const fonts of FONT_PAIRINGS) {
        for (const background of MOTIFS) {
          const theme = resolveTheme(
            design({ paletteId: palette.id, fontId: fonts.id, backgroundId: background.id }),
          );
          expect(theme.background).toBe(palette.background);
          expect(theme.displayFont).toBe(fonts.displayFont);
          expect(theme.pageBackground).toBeTruthy();
        }
      }
    }
  });

  it("keeps the plain colour on `background` and the motif on `pageBackground`", () => {
    const plain = resolveTheme(design({ backgroundId: "plain" }));
    expect(plain.pageBackground).toBe(plain.background);

    const kitenge = resolveTheme(design({ backgroundId: "kitenge" }));
    expect(kitenge.background).toBe(plain.background);
    expect(kitenge.pageBackground).toContain("data:image/svg+xml");
  });

  it("draws the motif from the palette's own accent, so it cannot clash", () => {
    const accent = paletteById("botanical").accent;
    const theme = resolveTheme(design({ paletteId: "botanical", backgroundId: "kitenge" }));
    // The accent is URL-encoded into the tile; `#` becomes %23.
    expect(theme.pageBackground).toContain(encodeURIComponent(accent));
  });

  it("produces a data URI a browser will accept", () => {
    const theme = resolveTheme(design({ backgroundId: "beadwork" }));
    const match = /url\("(data:image\/svg\+xml,[^"]+)"\)/.exec(theme.pageBackground);
    expect(match).not.toBeNull();
    // Round-trips: no raw angle brackets, quotes or hashes left to break the CSS.
    const decoded = decodeURIComponent(match![1]!.replace("data:image/svg+xml,", ""));
    expect(decoded.startsWith("<svg")).toBe(true);
    expect(match![1]).not.toContain("#");
  });

  it("flags dark palettes so overlays can flip", () => {
    expect(resolveTheme(design({ paletteId: "midnight" })).dark).toBe(true);
    expect(resolveTheme(design({ paletteId: "blush" })).dark).toBe(false);
  });

  it("falls back to a usable theme for unknown ids rather than throwing", () => {
    const theme = resolveTheme(
      design({ paletteId: "nope", fontId: "nope", backgroundId: "nope", heroLayout: "NOPE" as never }),
    );
    expect(theme.palette).toEqual(PALETTES[0]);
    expect(theme.fonts).toEqual(FONT_PAIRINGS[0]);
  });
});

describe("legacy pages", () => {
  it("renders a page saved before the design module unchanged", () => {
    // A page with only the old themeId, exactly as the seed data writes it.
    const legacy = { ...defaultPrivatePage("evt_x", { title: "T", startsAt: "" }) };
    delete (legacy as { design?: unknown }).design;
    legacy.themeId = "midnight";

    const theme = resolveTheme(designOf(legacy));
    const original = paletteById("midnight");

    expect(theme.background).toBe(original.background);
    expect(theme.accent).toBe(original.accent);
    expect(theme.ink).toBe(original.ink);
  });

  it("maps all six original themes", () => {
    for (const id of ["gold-ivory", "botanical", "kitenge", "midnight", "blush", "slate"]) {
      expect(designFromLegacyTheme(id).paletteId).toBe(id);
    }
  });

  it("prefers an explicit design over the legacy theme", () => {
    const page = defaultPrivatePage("evt_x", { title: "T", startsAt: "" });
    page.themeId = "midnight";
    page.design = design({ paletteId: "botanical" });
    expect(designOf(page).paletteId).toBe("botanical");
  });
});

describe("custom palettes", () => {
  const mine: Palette = {
    id: CUSTOM_PALETTE_ID,
    name: "Ours",
    description: "From your image.",
    family: "Warm",
    background: "#FFF8F0",
    surface: "#FFFFFF",
    accent: "#7A3B2E",
    accentSoft: "#F2DED8",
    ink: "#221A16",
    inkSoft: "#6A5951",
  };

  it("uses the host's own palette when it is selected", () => {
    const theme = resolveTheme(design({ paletteId: CUSTOM_PALETTE_ID, customPalette: mine }));
    expect(theme.accent).toBe("#7A3B2E");
  });

  it("keeps the custom palette when a preset is picked, so it can be returned to", () => {
    const withPreset = design({ paletteId: "slate", customPalette: mine });
    expect(activePalette(withPreset).id).toBe("slate");
    expect(withPreset.customPalette).toBe(mine);
  });

  it("ignores a custom selection with nothing stored", () => {
    expect(activePalette(design({ paletteId: CUSTOM_PALETTE_ID })).id).toBe("gold-ivory");
  });
});

describe("type pairings", () => {
  it("sets ceremonial romans in caps and leaves others alone", () => {
    expect(displayTypeStyle(fontPairingById("grand")).textTransform).toBe("uppercase");
    expect(displayTypeStyle(fontPairingById("classic")).textTransform).toBeUndefined();
  });

  it("gives every pairing a display and a body face", () => {
    for (const pairing of FONT_PAIRINGS) {
      expect(pairing.displayFont).toMatch(/var\(--font-/);
      expect(pairing.bodyFont).toMatch(/var\(--font-/);
    }
  });
});

describe("palette extraction", () => {
  const swatch = (r: number, g: number, b: number, count: number) => ({ r, g, b, count });

  it("assigns the lightest colour to the page and the darkest to the text", () => {
    const palette = paletteFromSwatches([
      swatch(250, 246, 238, 900), // cream ground
      swatch(28, 22, 18, 300), // near-black
      swatch(190, 92, 40, 260), // ochre
    ]);

    expect(palette).not.toBeNull();
    expect(luminance(hexToRgb(palette!.background))).toBeGreaterThan(
      luminance(hexToRgb(palette!.ink)),
    );
  });

  it("picks the colourful one as the accent, not the dominant neutral", () => {
    const palette = paletteFromSwatches([
      swatch(252, 250, 248, 2000), // mostly white
      swatch(20, 18, 16, 200),
      swatch(196, 74, 32, 400), // the colour someone actually liked
    ]);

    const accent = hexToRgb(palette!.accent);
    expect(accent.r).toBeGreaterThan(accent.b);
  });

  it("marks a dark image as a dark palette", () => {
    const palette = paletteFromSwatches([
      swatch(18, 20, 26, 1800),
      swatch(40, 44, 54, 400),
      swatch(200, 162, 39, 200),
    ]);
    expect(palette!.dark).toBe(true);
  });

  it("returns null when there is nothing to read", () => {
    expect(paletteFromSwatches([])).toBeNull();
  });

  it("always emits six-digit hex values", () => {
    const palette = paletteFromSwatches([swatch(120, 130, 140, 10), swatch(9, 9, 9, 5)]);
    for (const key of ["background", "surface", "accent", "accentSoft", "ink", "inkSoft"] as const) {
      expect(palette![key]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

describe("invitation templates", () => {
  it("gives every template defaults that resolve", () => {
    for (const template of INVITATION_TEMPLATES) {
      const theme = resolveTheme({
        templateId: template.id,
        paletteId: template.defaults.paletteId,
        fontId: template.defaults.fontId,
        backgroundId: template.defaults.motifId,
        heroLayout: "FRAMED",
      });
      expect(theme.palette.id).toBe(template.defaults.paletteId);
      expect(theme.fonts.id).toBe(template.defaults.fontId);
      expect(theme.motifId).toBe(template.defaults.motifId);
    }
  });

  it("keeps template ids unique", () => {
    const ids = INVITATION_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the documented default for an unknown id", () => {
    expect(templateById("does-not-exist").id).toBe(DEFAULT_TEMPLATE_ID);
    expect(templateById(undefined).id).toBe(DEFAULT_TEMPLATE_ID);
  });

  it("only places a photo where the composition has room for one", () => {
    for (const template of INVITATION_TEMPLATES) {
      if (template.photo === "SIDE") expect(template.composition).toBe("ASYMMETRIC");
      if (template.photo === "ARCH") expect(template.composition).toBe("ARCH");
      // A bordered card cannot carry a photograph across its head without the
      // rule cutting through it.
      const border = borderById(template.borderId);
      if (border.rules && border.rules.length > 1) {
        expect(template.photo).not.toBe("TOP");
      }
    }
  });

  it("points every template at ornament, colour, type and a motif that exist", () => {
    for (const template of INVITATION_TEMPLATES) {
      expect(BORDERS.some((border) => border.id === template.borderId)).toBe(true);
      expect(PALETTES.some((p) => p.id === template.defaults.paletteId)).toBe(true);
      expect(FONT_PAIRINGS.some((f) => f.id === template.defaults.fontId)).toBe(true);
      expect(MOTIFS.some((m) => m.id === template.defaults.motifId)).toBe(true);
    }
  });

  it("ships a catalogue worth browsing", () => {
    expect(INVITATION_TEMPLATES.length).toBeGreaterThanOrEqual(100);
  });

  it("fills every collection the gallery filters by", () => {
    for (const collection of COLLECTIONS) {
      expect(INVITATION_TEMPLATES.some((t) => t.collection === collection)).toBe(true);
    }
  });
});
