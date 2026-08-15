import { CUSTOM_PALETTE_ID, type Palette } from "@/domain/private-design";

/**
 * Builds a palette out of a picture.
 *
 * This is how a host brings in an idea from somewhere else. They save the
 * invitation they liked on Etsy, the flat-lay from an Instagram post, or a
 * photograph of the flowers they have already ordered, drop it in, and the
 * studio reads the colours back out as a palette they can then use and edit.
 *
 * It reads an image the host supplies and nothing else — there is no fetching
 * from Etsy or Instagram, and no attempt to reproduce anyone's artwork. What
 * comes out is six colours, which are facts about a picture rather than a
 * design belonging to whoever made it.
 *
 * Everything runs on a canvas in the browser: no upload, no round trip, and a
 * result fast enough to feel like part of dragging the file in.
 */

interface Swatch {
  r: number;
  g: number;
  b: number;
  count: number;
}

/** How finely colours are grouped. 5 bits per channel is 32k buckets. */
const BITS = 5;

/** Sampling target — enough pixels to be representative, few enough to be instant. */
const SAMPLE_EDGE = 160;

function quantise(value: number): number {
  return value >> (8 - BITS);
}

function toHex({ r, g, b }: Rgb): string {
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/** Perceived brightness, 0–255. Weighted for how the eye actually works. */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Distance from grey, 0–1. */
function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

type Rgb = { r: number; g: number; b: number };

function mix(colour: Rgb, towards: Rgb, amount: number): Rgb {
  return {
    r: colour.r + (towards.r - colour.r) * amount,
    g: colour.g + (towards.g - colour.g) * amount,
    b: colour.b + (towards.b - colour.b) * amount,
  };
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/**
 * Groups an image's pixels into the colours that actually occupy it.
 *
 * A straight histogram would return a hundred near-identical creams, so pixels
 * are bucketed coarsely first and each bucket averaged back to its true mean —
 * that keeps a colour's real value rather than the corner of its bucket.
 */
function collectSwatches(data: Uint8ClampedArray): Swatch[] {
  const buckets = new Map<number, Swatch>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;
    if (alpha < 200) continue; // Ignore transparent edges and rounded corners.

    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const key =
      (quantise(r) << (BITS * 2)) | (quantise(g) << BITS) | quantise(b);

    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Assigns the extracted colours to the roles a palette needs.
 *
 * The picture decides the hues; the roles are then enforced so the result is
 * always readable. The lightest common colour becomes the ground, the darkest
 * becomes the text, and the most saturated colour that is not one of those
 * becomes the accent — that last one is usually the thing the host actually
 * liked about the image.
 */
export function paletteFromSwatches(swatches: Swatch[], name = "From your image"): Palette | null {
  const significant = swatches.filter((swatch) => swatch.count > 0).slice(0, 48);
  if (significant.length === 0) return null;

  const byLuminance = [...significant].sort((a, b) => luminance(a) - luminance(b));
  const darkest = byLuminance[0]!;
  const lightest = byLuminance[byLuminance.length - 1]!;

  const totalPixels = significant.reduce((sum, swatch) => sum + swatch.count, 0);

  // Whether the result is a light or a dark palette is decided by the image as
  // a whole, not by its lightest pixel. A photograph of an evening reception is
  // mostly dark, and forcing it onto a cream ground would throw away the very
  // thing the host liked about it.
  const meanLuminance =
    significant.reduce((sum, swatch) => sum + luminance(swatch) * swatch.count, 0) / totalPixels;
  const dark = meanLuminance < 100;

  // The most colourful swatch, weighted by how much of the image it covers so a
  // handful of stray saturated pixels cannot win.
  const accentSource = [...significant].sort((a, b) => {
    const score = (swatch: Swatch) =>
      saturation(swatch) * (0.35 + 0.65 * Math.sqrt(swatch.count / totalPixels));
    return score(b) - score(a);
  })[0]!;

  // Ground and text are pinned to a readable range whichever way round they go:
  // an image can suggest the hues, but it cannot be allowed to produce grey
  // text on a grey page.
  const ground = dark
    ? (luminance(darkest) < 40 ? (darkest as Rgb) : mix(darkest, BLACK, 0.72))
    : luminance(lightest) > 236
      ? (lightest as Rgb)
      : mix(lightest, WHITE, 0.8);

  const ink = dark
    ? (luminance(lightest) > 226 ? (lightest as Rgb) : mix(lightest, WHITE, 0.8))
    : luminance(darkest) < 62
      ? (darkest as Rgb)
      : mix(darkest, BLACK, 0.72);

  // A near-grey accent has nothing to say, so it is pushed away from the ground
  // rather than left to disappear into it.
  const accent =
    saturation(accentSource) < 0.12
      ? mix(accentSource, dark ? WHITE : BLACK, 0.4)
      : (accentSource as Rgb);

  return {
    id: CUSTOM_PALETTE_ID,
    name,
    description: "Built from an image you chose.",
    family: "Warm",
    background: toHex(ground),
    surface: toHex(dark ? mix(ground, WHITE, 0.07) : WHITE),
    accent: toHex(accent),
    accentSoft: toHex(mix(accent, ground, 0.82)),
    ink: toHex(ink),
    inkSoft: toHex(mix(ink, ground, 0.42)),
    ...(dark ? { dark: true } : {}),
  };
}

/**
 * Reads a palette out of an image file.
 *
 * Downscaled to a small square first: at 160px the colour distribution is the
 * same and the work is a fraction of a frame, so a 12-megapixel photograph
 * costs no more than a screenshot.
 */
export async function extractPalette(file: File | Blob, name?: string): Promise<Palette | null> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(SAMPLE_EDGE / bitmap.width, SAMPLE_EDGE / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);

    return paletteFromSwatches(collectSwatches(data), name);
  } finally {
    bitmap.close();
  }
}

export { collectSwatches };
export type { Swatch };
