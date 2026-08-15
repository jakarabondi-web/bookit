/**
 * Background motifs.
 *
 * Every one is drawn from the palette's own accent at render time, so a motif
 * can never clash with the colours around it, nothing has to be uploaded or
 * licensed, and a whole field of ornament costs a few hundred bytes of CSS.
 *
 * Opacity is baked into each tile rather than left to the caller: a damask
 * wants to sit at 8% and a mudcloth at 22%, and letting a single global
 * strength control both is how one of them always looks wrong.
 */

export type MotifFamily =
  | "PLAIN"
  | "TEXTURE"
  | "GEOMETRIC"
  | "FLORAL"
  | "AFRICAN"
  | "DECO"
  | "PHOTO";

export interface Motif {
  id: string;
  name: string;
  description: string;
  family: MotifFamily;
  /** Tile edge in CSS pixels. */
  size: number;
  /** Builds the tile. Returns raw SVG; the caller encodes it. */
  tile?: (accent: string) => string;
}

/** Shorthand for the repetitive parts of a tile. */
const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

export const MOTIFS: Motif[] = [
  {
    id: "plain",
    name: "Plain",
    description: "Just the palette colour.",
    family: "PLAIN",
    size: 0,
  },
  {
    id: "photo",
    name: "Your photograph",
    description: "The cover photo behind a wash of the palette.",
    family: "PHOTO",
    size: 0,
  },

  /* --------------------------------------------------------- textures --- */
  {
    id: "grain",
    name: "Paper grain",
    description: "A faint speckle, like a printed card in raking light.",
    family: "TEXTURE",
    size: 28,
    tile: (a) =>
      svg(
        28,
        `<g fill="${a}" opacity="0.16"><circle cx="3" cy="5" r="1"/><circle cx="17" cy="3" r="1"/><circle cx="9" cy="14" r="1"/><circle cx="24" cy="12" r="1"/><circle cx="14" cy="23" r="1"/><circle cx="2" cy="21" r="1"/></g>`,
      ),
  },
  {
    id: "linen",
    name: "Linen weave",
    description: "A fine cross-hatch, like woven cloth.",
    family: "TEXTURE",
    size: 12,
    tile: (a) =>
      svg(
        12,
        `<g stroke="${a}" stroke-width="0.8" opacity="0.14"><path d="M0 3 H12 M0 9 H12"/><path d="M3 0 V12 M9 0 V12"/></g>`,
      ),
  },
  {
    id: "crosshatch",
    name: "Crosshatch",
    description: "Engraver's shading, run at a diagonal.",
    family: "TEXTURE",
    size: 16,
    tile: (a) =>
      svg(
        16,
        `<g stroke="${a}" stroke-width="0.9" opacity="0.13"><path d="M-4 4 L4 -4 M0 16 L16 0 M12 20 L20 12"/></g>`,
      ),
  },
  {
    id: "terrazzo",
    name: "Terrazzo",
    description: "Chips of colour scattered across the ground.",
    family: "TEXTURE",
    size: 60,
    tile: (a) =>
      svg(
        60,
        `<g fill="${a}" opacity="0.2">
           <ellipse cx="10" cy="14" rx="4" ry="2.6" transform="rotate(20 10 14)"/>
           <ellipse cx="42" cy="8" rx="3" ry="2" transform="rotate(-40 42 8)"/>
           <ellipse cx="28" cy="34" rx="5" ry="3" transform="rotate(65 28 34)"/>
           <ellipse cx="52" cy="44" rx="3.4" ry="2.2" transform="rotate(10 52 44)"/>
           <ellipse cx="14" cy="50" rx="3" ry="2" transform="rotate(-15 14 50)"/>
         </g>`,
      ),
  },
  {
    id: "marble",
    name: "Marble vein",
    description: "Slow veining across the page.",
    family: "TEXTURE",
    size: 90,
    tile: (a) =>
      svg(
        90,
        `<g fill="none" stroke="${a}" opacity="0.14">
           <path d="M-10 60 C20 40 30 70 60 46 C76 33 84 44 100 30" stroke-width="1.6"/>
           <path d="M-10 24 C14 14 26 30 44 18 C62 6 74 18 100 8" stroke-width="1"/>
           <path d="M-10 84 C22 74 34 90 58 78" stroke-width="0.8"/>
         </g>`,
      ),
  },

  /* -------------------------------------------------------- geometric --- */
  {
    id: "dot-grid",
    name: "Dot grid",
    description: "An even field of dots. Quiet and orderly.",
    family: "GEOMETRIC",
    size: 20,
    tile: (a) => svg(20, `<circle cx="10" cy="10" r="1.4" fill="${a}" opacity="0.2"/>`),
  },
  {
    id: "lattice",
    name: "Lattice",
    description: "A diagonal trellis, as on a garden screen.",
    family: "GEOMETRIC",
    size: 32,
    tile: (a) =>
      svg(
        32,
        `<g stroke="${a}" stroke-width="1" opacity="0.18" fill="none"><path d="M0 16 L16 0 L32 16 L16 32 Z"/><path d="M16 0 L16 32 M0 16 L32 16" opacity="0.5"/></g>`,
      ),
  },
  {
    id: "herringbone",
    name: "Herringbone",
    description: "Short strokes laid in alternating courses.",
    family: "GEOMETRIC",
    size: 32,
    tile: (a) =>
      svg(
        32,
        `<g stroke="${a}" stroke-width="1.6" opacity="0.17" stroke-linecap="square"><path d="M0 8 L8 0 M8 0 L16 8 M16 24 L24 16 M24 16 L32 24"/></g>`,
      ),
  },
  {
    id: "chevron",
    name: "Chevron",
    description: "Continuous zigzag bands.",
    family: "GEOMETRIC",
    size: 40,
    tile: (a) =>
      svg(
        40,
        `<g stroke="${a}" stroke-width="2" fill="none" opacity="0.16"><path d="M0 28 L10 16 L20 28 L30 16 L40 28"/><path d="M0 12 L10 0 L20 12 L30 0 L40 12"/></g>`,
      ),
  },
  {
    id: "scales",
    name: "Fish scale",
    description: "Overlapping arcs, like tilework.",
    family: "GEOMETRIC",
    size: 32,
    tile: (a) =>
      svg(
        32,
        `<g fill="none" stroke="${a}" stroke-width="1.1" opacity="0.18"><path d="M0 16 A16 16 0 0 1 32 16"/><path d="M-16 32 A16 16 0 0 1 16 32"/><path d="M16 32 A16 16 0 0 1 48 32"/></g>`,
      ),
  },
  {
    id: "hexagons",
    name: "Honeycomb",
    description: "A field of hexagons.",
    family: "GEOMETRIC",
    size: 36,
    tile: (a) =>
      svg(
        36,
        `<g fill="none" stroke="${a}" stroke-width="1" opacity="0.16"><path d="M18 2 L31 10 L31 26 L18 34 L5 26 L5 10 Z"/></g>`,
      ),
  },
  {
    id: "moire",
    name: "Moiré",
    description: "Fine concentric rings, as on an engraved plate.",
    family: "GEOMETRIC",
    size: 48,
    tile: (a) =>
      svg(
        48,
        `<g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.15"><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="24"/></g>`,
      ),
  },
  {
    id: "pinstripe",
    name: "Pinstripe",
    description: "Narrow vertical rules. Tailored and quiet.",
    family: "GEOMETRIC",
    size: 12,
    tile: (a) => svg(12, `<path d="M2 0 V12" stroke="${a}" stroke-width="0.9" opacity="0.16"/>`),
  },

  /* ------------------------------------------------------------ deco --- */
  {
    id: "deco-fan",
    name: "Deco fan",
    description: "Radiating fans in ordered rows. Nineteen-twenties.",
    family: "DECO",
    size: 44,
    tile: (a) =>
      svg(
        44,
        `<g fill="none" stroke="${a}" stroke-width="1.1" opacity="0.2">
           <path d="M0 44 A22 22 0 0 1 44 44"/><path d="M8 44 A14 14 0 0 1 36 44"/><path d="M16 44 A6 6 0 0 1 28 44"/>
         </g>`,
      ),
  },
  {
    id: "sunburst",
    name: "Sunburst",
    description: "Rays spreading from a point. Grand and theatrical.",
    family: "DECO",
    size: 64,
    tile: (a) => {
      const rays = Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return `<line x1="32" y1="32" x2="${32 + Math.cos(angle) * 46}" y2="${32 + Math.sin(angle) * 46}"/>`;
      }).join("");
      return svg(64, `<g stroke="${a}" stroke-width="1" opacity="0.14">${rays}</g>`);
    },
  },
  {
    id: "deco-steps",
    name: "Stepped",
    description: "Ziggurat steps in a repeating field.",
    family: "DECO",
    size: 36,
    tile: (a) =>
      svg(
        36,
        `<g fill="none" stroke="${a}" stroke-width="1.4" opacity="0.18" stroke-linecap="square"><path d="M0 30 L10 30 L10 20 L20 20 L20 10 L30 10 L30 0"/></g>`,
      ),
  },
  {
    id: "arcade",
    name: "Arcade",
    description: "A row of arches, repeated. Architectural.",
    family: "DECO",
    size: 40,
    tile: (a) =>
      svg(
        40,
        `<g fill="none" stroke="${a}" stroke-width="1.2" opacity="0.17"><path d="M4 38 L4 20 A16 16 0 0 1 36 20 L36 38"/></g>`,
      ),
  },

  /* ---------------------------------------------------------- floral --- */
  {
    id: "damask",
    name: "Damask",
    description: "A formal repeating flourish. The wallpaper of a state room.",
    family: "FLORAL",
    size: 64,
    tile: (a) =>
      svg(
        64,
        `<g fill="none" stroke="${a}" stroke-width="1.1" opacity="0.16">
           <path d="M32 6 C44 18 44 30 32 40 C20 30 20 18 32 6 Z"/>
           <path d="M32 40 C32 48 26 54 18 56 C22 46 26 42 32 40 Z"/>
           <path d="M32 40 C32 48 38 54 46 56 C42 46 38 42 32 40 Z"/>
           <circle cx="32" cy="23" r="4"/>
         </g>`,
      ),
  },
  {
    id: "toile-sprig",
    name: "Sprigs",
    description: "Small scattered stems, as on printed toile.",
    family: "FLORAL",
    size: 56,
    tile: (a) =>
      svg(
        56,
        `<g fill="none" stroke="${a}" stroke-width="1.1" opacity="0.2">
           <path d="M12 40 C14 30 20 24 28 20"/><ellipse cx="18" cy="30" rx="3.4" ry="2" transform="rotate(-40 18 30)"/><ellipse cx="24" cy="24" rx="3.4" ry="2" transform="rotate(-40 24 24)"/>
           <path d="M40 16 C42 26 46 32 52 36"/><ellipse cx="44" cy="24" rx="3" ry="1.8" transform="rotate(35 44 24)"/>
         </g>`,
      ),
  },
  {
    id: "eucalyptus",
    name: "Eucalyptus",
    description: "Round leaves along a trailing stem.",
    family: "FLORAL",
    size: 60,
    tile: (a) =>
      svg(
        60,
        `<g opacity="0.2"><path d="M-4 44 C14 36 30 24 64 12" fill="none" stroke="${a}" stroke-width="1.1"/>
           <circle cx="10" cy="38" r="4" fill="${a}" opacity="0.55"/><circle cx="24" cy="30" r="4.6" fill="${a}" opacity="0.55"/>
           <circle cx="38" cy="22" r="4" fill="${a}" opacity="0.55"/><circle cx="52" cy="15" r="3.4" fill="${a}" opacity="0.55"/></g>`,
      ),
  },
  {
    id: "palm-frond",
    name: "Palm",
    description: "Fronds sweeping across the ground. Coastal.",
    family: "FLORAL",
    size: 72,
    tile: (a) =>
      svg(
        72,
        `<g fill="none" stroke="${a}" stroke-width="1" opacity="0.18">
           <path d="M6 66 C22 46 34 28 40 6"/>
           <path d="M40 6 C34 16 26 20 16 20 M40 6 C44 18 52 24 62 26 M22 40 C16 44 10 44 4 42 M30 26 C36 32 44 34 52 34"/>
         </g>`,
      ),
  },

  /* --------------------------------------------------------- african --- */
  {
    id: "kitenge",
    name: "Kitenge",
    description: "Concentric diamonds, the way a wax print builds a field.",
    family: "AFRICAN",
    size: 56,
    tile: (a) =>
      svg(
        56,
        `<g fill="none" stroke="${a}" stroke-width="1.2" opacity="0.2"><path d="M28 6 L50 28 L28 50 L6 28 Z"/><path d="M28 15 L41 28 L28 41 L15 28 Z"/><path d="M28 24 L32 28 L28 32 L24 28 Z"/></g>`,
      ),
  },
  {
    id: "beadwork",
    name: "Beadwork",
    description: "Courses of small triangles, borrowed from beaded collars.",
    family: "AFRICAN",
    size: 40,
    tile: (a) =>
      svg(
        40,
        `<g fill="${a}" opacity="0.18"><path d="M0 12 L10 0 L20 12 Z"/><path d="M20 12 L30 0 L40 12 Z"/><path d="M0 28 L10 40 L20 28 Z" opacity="0.7"/><path d="M20 28 L30 40 L40 28 Z" opacity="0.7"/></g>`,
      ),
  },
  {
    id: "kanga",
    name: "Kanga border",
    description: "A scalloped repeat, like the printed edge of a kanga.",
    family: "AFRICAN",
    size: 48,
    tile: (a) =>
      svg(
        48,
        `<g fill="none" stroke="${a}" stroke-width="1.3" opacity="0.2"><path d="M0 24 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/><path d="M0 40 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/><path d="M0 8 a12 12 0 0 1 24 0 a12 12 0 0 0 24 0"/></g>`,
      ),
  },
  {
    id: "mudcloth",
    name: "Mudcloth",
    description: "Hand-drawn marks and dashes on a woven ground.",
    family: "AFRICAN",
    size: 48,
    tile: (a) =>
      svg(
        48,
        `<g stroke="${a}" stroke-width="1.6" opacity="0.22" stroke-linecap="round">
           <path d="M6 8 L14 8 M20 8 L28 8 M34 8 L42 8"/>
           <path d="M10 20 L10 28 M24 18 L24 30 M38 20 L38 28"/>
           <path d="M4 40 L12 40 M18 40 L26 40 M32 40 L40 40"/>
         </g>`,
      ),
  },
  {
    id: "kente",
    name: "Kente stripes",
    description: "Woven bands crossing at right angles.",
    family: "AFRICAN",
    size: 40,
    tile: (a) =>
      svg(
        40,
        `<g opacity="0.18"><rect x="0" y="6" width="40" height="3" fill="${a}"/><rect x="0" y="26" width="40" height="5" fill="${a}" opacity="0.6"/><rect x="8" y="0" width="3" height="40" fill="${a}" opacity="0.7"/><rect x="28" y="0" width="5" height="40" fill="${a}" opacity="0.45"/></g>`,
      ),
  },
  {
    id: "adinkra",
    name: "Adinkra marks",
    description: "Stamped symbols set in a grid.",
    family: "AFRICAN",
    size: 52,
    tile: (a) =>
      svg(
        52,
        `<g fill="none" stroke="${a}" stroke-width="1.4" opacity="0.2">
           <circle cx="14" cy="14" r="7"/><path d="M14 7 L14 21 M7 14 L21 14"/>
           <path d="M38 6 C46 12 46 22 38 28 C30 22 30 12 38 6 Z"/>
           <path d="M8 38 L20 38 L14 48 Z"/>
           <circle cx="38" cy="42" r="6"/>
         </g>`,
      ),
  },
  {
    id: "zellige",
    name: "Zellige",
    description: "Interlocking star tilework. Swahili coast and beyond.",
    family: "AFRICAN",
    size: 48,
    tile: (a) =>
      svg(
        48,
        `<g fill="none" stroke="${a}" stroke-width="1" opacity="0.18">
           <path d="M24 2 L30 18 L46 24 L30 30 L24 46 L18 30 L2 24 L18 18 Z"/>
           <path d="M24 12 L28 22 L38 24 L28 26 L24 36 L20 26 L10 24 L20 22 Z"/>
         </g>`,
      ),
  },
  {
    id: "arabesque",
    name: "Arabesque",
    description: "Interlaced curves without beginning or end.",
    family: "AFRICAN",
    size: 56,
    tile: (a) =>
      svg(
        56,
        `<g fill="none" stroke="${a}" stroke-width="1.1" opacity="0.17">
           <path d="M0 28 C14 14 14 42 28 28 C42 14 42 42 56 28"/>
           <path d="M28 0 C14 14 42 14 28 28 C14 42 42 42 28 56"/>
         </g>`,
      ),
  },
];

export function motifById(id: string | null | undefined): Motif {
  return MOTIFS.find((motif) => motif.id === id) ?? MOTIFS[0]!;
}

/** The CSS `background` value for a motif over a ground colour. */
export function motifBackground(motif: Motif, accent: string, ground: string): string {
  if (!motif.tile) return ground;
  const encoded = encodeURIComponent(motif.tile(accent).replace(/\s+/g, " ").trim());
  return `url("data:image/svg+xml,${encoded}") repeat, ${ground}`;
}
