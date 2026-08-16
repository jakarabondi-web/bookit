import type { TemplatePalette } from "./types";

/**
 * Colour, as a set of moves rather than a picker.
 *
 * A host asked to choose six hexadecimal values will produce a palette that
 * looks like six hexadecimal values. What they actually want to say is
 * "warmer", "quieter", "darker than that" — so the studio takes the designer's
 * colourway as the starting point and moves it, keeping the relationships the
 * designer set: the accent stays the accent, the ground stays the ground, and
 * text never drops below a contrast a printed card would hold.
 *
 * The maths is deliberately in HSL rather than a perceptual space. It is not
 * the most accurate model, but it is the one whose behaviour matches the words:
 * "warmer" is a hue rotation toward amber, "richer" is saturation, "deeper" is
 * lightness. A host can predict what the next nudge will do, which matters more
 * here than colorimetric correctness.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hue = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = channel(Number.parseInt(value.slice(0, 2), 16));
  const g = channel(Number.parseInt(value.slice(2, 4), 16));
  const b = channel(Number.parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------- */
/* Moves                                                                       */
/* -------------------------------------------------------------------------- */

export type ColourMove =
  | "warmer"
  | "cooler"
  | "deeper"
  | "lighter"
  | "softer"
  | "richer"
  | "invert";

interface MoveSpec {
  label?: string;
  /** Hue the palette drifts toward, and how far. */
  towards?: number;
  pull?: number;
  /** Saturation multiplier. */
  saturate?: number;
  /** Lightness delta on the ground, in HSL points. */
  lift?: number;
  /** Lightness delta on the accent. */
  accentLift?: number;
}

const MOVES: Record<Exclude<ColourMove, "invert">, MoveSpec & { label: string }> = {
  warmer: { label: "warmer", towards: 30, pull: 0.3, saturate: 1.08, accentLift: 2 },
  cooler: { label: "cooler", towards: 214, pull: 0.3, saturate: 1.02, accentLift: -1 },
  deeper: { label: "deeper", saturate: 1.1, lift: -7, accentLift: -3 },
  lighter: { label: "lighter", saturate: 0.96, lift: 7, accentLift: 3 },
  softer: { label: "softer", saturate: 0.72, accentLift: 2 },
  richer: { label: "richer", saturate: 1.28, accentLift: -2 },
};

export const COLOUR_MOVES = Object.keys(MOVES) as Exclude<ColourMove, "invert">[];

function move(hex: string, spec: MoveSpec, lift = spec.lift ?? 0): string {
  const hsl = hexToHsl(hex);
  const h =
    spec.towards !== undefined && hsl.s > 4
      ? hsl.h + shortestArc(hsl.h, spec.towards) * (spec.pull ?? 0.3)
      : hsl.h;
  return hslToHex({
    h,
    s: clamp(hsl.s * (spec.saturate ?? 1), 0, 92),
    l: clamp(hsl.l + lift, 3, 98),
  });
}

/** Rotating 350° → 30° should travel 40° forward, not 320° back. */
function shortestArc(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return delta;
}

/**
 * Pushes ink away from ground until the pair is readable.
 *
 * The guard exists because "lighter, lighter, lighter" is a perfectly natural
 * three prompts in a row, and the third one is where the names stop being
 * legible on a printed card. The studio moves the text instead of refusing.
 */
export function ensureContrast(ink: string, ground: string, minimum = 4.5): string {
  if (contrast(ink, ground) >= minimum) return ink;

  const hsl = hexToHsl(ink);
  // Try the obvious direction first — away from the ground — but try the other
  // one too. Ink that is already at 96% lightness cannot get lighter, and a
  // guard that only knew one direction would give up there and ship grey names
  // on a pale card.
  const first = luminance(ground) > 0.4 ? -1 : 1;

  for (const direction of [first, -first]) {
    for (let step = 1; step <= 40; step += 1) {
      const candidate = hslToHex({ ...hsl, l: clamp(hsl.l + direction * step * 2.5, 0, 100) });
      if (contrast(candidate, ground) >= minimum) return candidate;
    }
  }

  return contrast("#111111", ground) > contrast("#FFFFFF", ground) ? "#111111" : "#FFFFFF";
}

/**
 * Applies a move to a whole colourway.
 *
 * Every role moves together so the palette stays a palette. Ink and muted are
 * then re-checked against the new ground rather than moved blindly, because
 * lightening a card should not quietly lighten the words on it.
 */
export function shiftPalette(palette: TemplatePalette, direction: ColourMove): TemplatePalette {
  if (direction === "invert") return invertPalette(palette);

  const spec = MOVES[direction];
  // A colourway keeps its polarity. "Lighter" on a midnight card opens it up;
  // it does not turn it cream — partly because that is not what anyone means,
  // and partly because a ground drifting into the middle of the range is a
  // ground no ink can hold a printable contrast against.
  const wasDark = luminance(palette.ground) < 0.34;
  const ground = keepPolarity(move(palette.ground, spec), wasDark);
  const surface = move(palette.surface, spec);
  const accentSoft = move(palette.accentSoft, spec);
  const accent = move(palette.accent, spec, spec.accentLift ?? 0);

  const dark = wasDark;
  const ink = ensureContrast(move(palette.ink, { saturate: spec.saturate }), ground, 7);
  const muted = ensureContrast(move(palette.muted, spec, 0), ground, 3.4);

  return {
    ...palette,
    id: `${palette.id}--${direction}`,
    name: `${baseName(palette.name)}, ${spec.label}`,
    ground,
    surface,
    ink,
    muted,
    accent,
    accentSoft,
    dark,
  };
}

/** Holds a ground on its own side of the range. */
function keepPolarity(hex: string, wasDark: boolean): string {
  const hsl = hexToHsl(hex);
  const l = wasDark ? Math.min(hsl.l, 26) : Math.max(hsl.l, 76);
  return hslToHex({ ...hsl, l });
}

/** Same colourway, night side out. */
function invertPalette(palette: TemplatePalette): TemplatePalette {
  const ground = palette.ink;
  const ink = palette.ground;
  return {
    ...palette,
    id: `${palette.id}--invert`,
    name: `${baseName(palette.name)}, reversed`,
    ground,
    surface: palette.accentSoft,
    ink: ensureContrast(ink, ground, 7),
    muted: ensureContrast(palette.muted, ground, 3.4),
    accent: ensureContrast(palette.accent, ground, 2.4),
    accentSoft: palette.surface,
    dark: luminance(ground) < 0.34,
  };
}

/** Strips previously appended move labels so they do not stack up in the name. */
function baseName(name: string): string {
  const comma = name.indexOf(",");
  return comma === -1 ? name : name.slice(0, comma);
}

/** Applies a stack of moves in order. */
export function applyMoves(palette: TemplatePalette, moves: ColourMove[]): TemplatePalette {
  return moves.reduce((current, direction) => shiftPalette(current, direction), palette);
}
