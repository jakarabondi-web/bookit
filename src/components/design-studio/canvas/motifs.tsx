/**
 * Pattern fields.
 *
 * Each returns raw SVG for one tile, coloured from the palette at render time.
 * Kept separate from the ornament library because these repeat and those do
 * not — a tile has to be seamless across its edges, which constrains how it can
 * be drawn.
 */

const tile = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

const MOTIFS: Record<string, (colour: string) => string> = {
  /* Textures ------------------------------------------------------------- */
  grain: (c) =>
    tile(
      28,
      `<g fill="${c}"><circle cx="3" cy="5" r="1"/><circle cx="17" cy="3" r="1"/><circle cx="9" cy="14" r="1"/><circle cx="24" cy="12" r="1"/><circle cx="14" cy="23" r="1"/><circle cx="2" cy="21" r="1"/></g>`,
    ),
  linen: (c) =>
    tile(
      12,
      `<g stroke="${c}" stroke-width="0.8"><path d="M0 3 H12 M0 9 H12"/><path d="M3 0 V12 M9 0 V12"/></g>`,
    ),
  crosshatch: (c) =>
    tile(16, `<g stroke="${c}" stroke-width="0.9"><path d="M-4 4 L4 -4 M0 16 L16 0 M12 20 L20 12"/></g>`),

  /* Geometric ------------------------------------------------------------ */
  "dot-grid": (c) => tile(20, `<circle cx="10" cy="10" r="1.4" fill="${c}"/>`),
  lattice: (c) =>
    tile(
      32,
      `<g stroke="${c}" stroke-width="1" fill="none"><path d="M0 16 L16 0 L32 16 L16 32 Z"/><path d="M16 0 L16 32 M0 16 L32 16" opacity="0.5"/></g>`,
    ),
  herringbone: (c) =>
    tile(
      32,
      `<g stroke="${c}" stroke-width="1.6" stroke-linecap="square"><path d="M0 8 L8 0 M8 0 L16 8 M16 24 L24 16 M24 16 L32 24"/></g>`,
    ),
  moire: (c) =>
    tile(
      48,
      `<g fill="none" stroke="${c}" stroke-width="0.7"><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="24"/></g>`,
    ),
  pinstripe: (c) => tile(12, `<path d="M2 0 V12" stroke="${c}" stroke-width="0.9"/>`),

  /* Deco ------------------------------------------------------------------ */
  "deco-fan": (c) =>
    tile(
      44,
      `<g fill="none" stroke="${c}" stroke-width="1.1"><path d="M0 44 A22 22 0 0 1 44 44"/><path d="M8 44 A14 14 0 0 1 36 44"/><path d="M16 44 A6 6 0 0 1 28 44"/></g>`,
    ),
  "deco-step": (c) =>
    tile(
      36,
      `<g fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="square"><path d="M0 30 L10 30 L10 20 L20 20 L20 10 L30 10 L30 0"/></g>`,
    ),
  arcade: (c) =>
    tile(
      40,
      `<g fill="none" stroke="${c}" stroke-width="1.2"><path d="M4 38 L4 20 A16 16 0 0 1 36 20 L36 38"/></g>`,
    ),

  /* Floral ---------------------------------------------------------------- */
  damask: (c) =>
    tile(
      64,
      `<g fill="none" stroke="${c}" stroke-width="1.1"><path d="M32 6 C44 18 44 30 32 40 C20 30 20 18 32 6 Z"/><path d="M32 40 C32 48 26 54 18 56 C22 46 26 42 32 40 Z"/><path d="M32 40 C32 48 38 54 46 56 C42 46 38 42 32 40 Z"/><circle cx="32" cy="23" r="4"/></g>`,
    ),
  sprigs: (c) =>
    tile(
      56,
      `<g fill="none" stroke="${c}" stroke-width="1.1"><path d="M12 40 C14 30 20 24 28 20"/><ellipse cx="18" cy="30" rx="3.4" ry="2" transform="rotate(-40 18 30)"/><ellipse cx="24" cy="24" rx="3.4" ry="2" transform="rotate(-40 24 24)"/><path d="M40 16 C42 26 46 32 52 36"/><ellipse cx="44" cy="24" rx="3" ry="1.8" transform="rotate(35 44 24)"/></g>`,
    ),
  eucalyptus: (c) =>
    tile(
      60,
      `<g><path d="M-4 44 C14 36 30 24 64 12" fill="none" stroke="${c}" stroke-width="1.1"/><circle cx="10" cy="38" r="4" fill="${c}" opacity="0.6"/><circle cx="24" cy="30" r="4.6" fill="${c}" opacity="0.6"/><circle cx="38" cy="22" r="4" fill="${c}" opacity="0.6"/><circle cx="52" cy="15" r="3.4" fill="${c}" opacity="0.6"/></g>`,
    ),

  /* Textile-derived -------------------------------------------------------- */
  kitenge: (c) =>
    tile(
      56,
      `<g fill="none" stroke="${c}" stroke-width="1.2"><path d="M28 6 L50 28 L28 50 L6 28 Z"/><path d="M28 15 L41 28 L28 41 L15 28 Z"/><path d="M28 24 L32 28 L28 32 L24 28 Z"/></g>`,
    ),
  beadwork: (c) =>
    tile(
      40,
      `<g fill="${c}"><path d="M0 12 L10 0 L20 12 Z"/><path d="M20 12 L30 0 L40 12 Z"/><path d="M0 28 L10 40 L20 28 Z" opacity="0.7"/><path d="M20 28 L30 40 L40 28 Z" opacity="0.7"/></g>`,
    ),
  kanga: (c) =>
    tile(
      48,
      `<g fill="none" stroke="${c}" stroke-width="1.3"><path d="M0 24 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/><path d="M0 40 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/><path d="M0 8 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/></g>`,
    ),
  mudcloth: (c) =>
    tile(
      48,
      `<g stroke="${c}" stroke-width="1.6" stroke-linecap="round"><path d="M6 8 L14 8 M20 8 L28 8 M34 8 L42 8"/><path d="M10 20 L10 28 M24 18 L24 30 M38 20 L38 28"/><path d="M4 40 L12 40 M18 40 L26 40 M32 40 L40 40"/></g>`,
    ),
  "aso-oke": (c) =>
    tile(
      40,
      `<g><rect x="0" y="6" width="40" height="3" fill="${c}"/><rect x="0" y="26" width="40" height="5" fill="${c}" opacity="0.6"/><rect x="8" y="0" width="3" height="40" fill="${c}" opacity="0.7"/><rect x="28" y="0" width="5" height="40" fill="${c}" opacity="0.45"/></g>`,
    ),
  zellige: (c) =>
    tile(
      48,
      `<g fill="none" stroke="${c}" stroke-width="1"><path d="M24 2 L30 18 L46 24 L30 30 L24 46 L18 30 L2 24 L18 18 Z"/><path d="M24 12 L28 22 L38 24 L28 26 L24 36 L20 26 L10 24 L20 22 Z"/></g>`,
    ),
  arabesque: (c) =>
    tile(
      56,
      `<g fill="none" stroke="${c}" stroke-width="1.1"><path d="M0 28 C14 14 14 42 28 28 C42 14 42 42 56 28"/><path d="M28 0 C14 14 42 14 28 28 C14 42 42 42 28 56"/></g>`,
    ),
  "carved-door": (c) =>
    tile(
      52,
      `<g fill="none" stroke="${c}" stroke-width="1.1"><rect x="6" y="6" width="40" height="40"/><path d="M26 6 L46 26 L26 46 L6 26 Z"/><circle cx="26" cy="26" r="6"/></g>`,
    ),
};

export function motifTile(name: string, colour: string): string | null {
  const build = MOTIFS[name];
  if (!build) return null;
  return build(colour).replace(/\s+/g, " ").trim();
}

export const MOTIF_NAMES = Object.keys(MOTIFS);
