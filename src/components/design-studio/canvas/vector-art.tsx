import * as React from "react";

/**
 * The ornament library.
 *
 * Every drawing is authored in a 100 × 100 box and stroked in `currentColor`,
 * so a template places it by name and the palette supplies the colour. Keeping
 * them here rather than in the template files means an ornament can be redrawn
 * once and every design using it improves.
 *
 * These are drawn as line work rather than filled artwork on purpose: line work
 * survives being scaled down to a gallery thumbnail, prints as vector, and
 * reads as engraving rather than as clip art.
 */

export type VectorArtName = keyof typeof ART;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ART = {
  /* ------------------------------------------------------------ corners -- */

  "corner-bracket": <path d="M4 96 L4 4 L96 4" {...stroke} />,

  "corner-deco-fan": (
    <g {...stroke} strokeWidth={2}>
      {[0, 15, 30, 45, 60, 75, 90].map((angle) => {
        const radians = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={6}
            y1={6}
            x2={6 + Math.cos(radians) * 80}
            y2={6 + Math.sin(radians) * 80}
          />
        );
      })}
      <path d="M6 86 A80 80 0 0 0 86 6" />
    </g>
  ),

  "corner-flourish": (
    <g {...stroke} strokeWidth={2.2}>
      <path d="M4 96 C4 46 24 12 84 6" />
      <path d="M84 6 C56 6 42 22 42 38 C42 51 55 56 62 48 C68 41 62 32 53 35" />
      <path d="M4 62 C22 60 33 47 35 29" strokeWidth={1.6} opacity={0.65} />
    </g>
  ),

  /** A leafed stem, for garden and botanical work. */
  "corner-sprig": (
    <g {...stroke} strokeWidth={2}>
      <path d="M6 94 C30 78 56 50 92 8" />
      <path d="M34 62 C27 47 34 34 47 30 C47 45 42 56 34 62 Z" fillOpacity={0.18} fill="currentColor" />
      <path d="M53 45 C64 36 77 39 84 49 C71 56 60 54 53 45 Z" fillOpacity={0.18} fill="currentColor" />
      <path d="M19 79 C12 68 17 57 28 53 C28 66 26 74 19 79 Z" fillOpacity={0.18} fill="currentColor" />
    </g>
  ),

  "corner-step": (
    <>
      <path d="M6 94 L6 46 L46 46 L46 6 L94 6" {...stroke} strokeLinecap="square" strokeWidth={2.6} />
      <path d="M24 94 L24 64 L64 64 L64 24 L94 24" {...stroke} strokeWidth={1.6} opacity={0.5} />
    </>
  ),

  /* ---------------------------------------------------------- fleurons -- */

  /** A printer's fleuron: two answering curves around a point. */
  fleuron: (
    <g {...stroke} strokeWidth={2.4}>
      <path d="M2 50 C22 50 30 30 46 30 C58 30 62 42 52 48 C44 52 36 46 46 40" />
      <path d="M98 50 C78 50 70 30 54 30 C42 30 38 42 48 48 C56 52 64 46 54 40" />
      <circle cx="50" cy="50" r="4" fill="currentColor" stroke="none" />
    </g>
  ),

  /** A slim laurel pair, for crests and seals. */
  laurel: (
    <g {...stroke} strokeWidth={2}>
      <path d="M34 92 C18 74 16 44 30 14" />
      <path d="M66 92 C82 74 84 44 70 14" />
      {[24, 38, 52, 66].map((y, index) => (
        <React.Fragment key={y}>
          <path
            d={`M${30 - index} ${y} C${18 - index} ${y - 6} ${14 - index} ${y + 4} ${22 - index} ${y + 10}`}
            strokeWidth={1.6}
          />
          <path
            d={`M${70 + index} ${y} C${82 + index} ${y - 6} ${86 + index} ${y + 4} ${78 + index} ${y + 10}`}
            strokeWidth={1.6}
          />
        </React.Fragment>
      ))}
    </g>
  ),

  /* --------------------------------------------------------- botanical -- */

  "sprig-olive": (
    <g {...stroke} strokeWidth={1.8}>
      <path d="M50 96 C50 70 50 40 50 6" />
      {[18, 34, 50, 66].map((y) => (
        <React.Fragment key={y}>
          <path d={`M50 ${y} C36 ${y - 8} 26 ${y + 2} 30 ${y + 12} C40 ${y + 12} 47 ${y + 6} 50 ${y}`} fill="currentColor" fillOpacity={0.16} />
          <path d={`M50 ${y + 8} C64 ${y} 74 ${y + 10} 70 ${y + 20} C60 ${y + 20} 53 ${y + 14} 50 ${y + 8}`} fill="currentColor" fillOpacity={0.16} />
        </React.Fragment>
      ))}
    </g>
  ),

  "sprig-eucalyptus": (
    <g {...stroke} strokeWidth={1.8}>
      <path d="M8 92 C30 76 54 50 92 10" />
      {[
        [26, 72],
        [42, 56],
        [58, 40],
        [74, 24],
      ].map(([cx, cy]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r={9} fill="currentColor" fillOpacity={0.14} />
      ))}
    </g>
  ),

  "sprig-fern": (
    <g {...stroke} strokeWidth={1.6}>
      <path d="M50 96 C46 64 46 32 50 4" />
      {[16, 28, 40, 52, 64, 76].map((y, index) => {
        const reach = 34 - index * 3;
        return (
          <React.Fragment key={y}>
            <path d={`M50 ${y} C${50 - reach * 0.6} ${y - 4} ${50 - reach} ${y + 2} ${50 - reach} ${y + 10}`} />
            <path d={`M50 ${y} C${50 + reach * 0.6} ${y - 4} ${50 + reach} ${y + 2} ${50 + reach} ${y + 10}`} />
          </React.Fragment>
        );
      })}
    </g>
  ),

  /* ----------------------------------------------------- architectural -- */

  arch: <path d="M8 98 L8 46 A42 42 0 0 1 92 46 L92 98" {...stroke} />,

  "arch-double": (
    <>
      <path d="M6 98 L6 44 A44 44 0 0 1 94 44 L94 98" {...stroke} />
      <path d="M18 98 L18 48 A32 32 0 0 1 82 48 L82 98" {...stroke} strokeWidth={1.4} opacity={0.55} />
    </>
  ),

  /** A carved Swahili-door panel, reduced to its geometry. */
  "panel-carved": (
    <g {...stroke} strokeWidth={1.8}>
      <rect x="8" y="8" width="84" height="84" />
      <rect x="20" y="20" width="60" height="60" strokeWidth={1.2} opacity={0.6} />
      <path d="M50 20 L80 50 L50 80 L20 50 Z" strokeWidth={1.2} opacity={0.75} />
      <circle cx="50" cy="50" r="10" strokeWidth={1.2} opacity={0.6} />
    </g>
  ),

  /* -------------------------------------------------------- geometric --- */

  /** Woven-stripe geometry, drawn from Aso Oke structure. */
  "weave-band": (
    <g {...stroke} strokeWidth={2.6} strokeLinecap="butt">
      <path d="M0 16 H100" />
      <path d="M0 30 H100" strokeWidth={6} opacity={0.35} />
      <path d="M0 48 H100" strokeWidth={1.4} />
      <path d="M0 62 H100" strokeWidth={9} opacity={0.22} />
      <path d="M0 82 H100" strokeWidth={2.6} />
    </g>
  ),

  /** Beadwork-derived triangle course. */
  "bead-course": (
    <g fill="currentColor" stroke="none">
      {[0, 20, 40, 60, 80].map((x) => (
        <path key={x} d={`M${x} 70 L${x + 10} 30 L${x + 20} 70 Z`} />
      ))}
    </g>
  ),

  "diamond-run": (
    <g {...stroke} strokeWidth={1.8}>
      {[14, 38, 62, 86].map((x) => (
        <path key={x} d={`M${x} 34 L${x + 12} 50 L${x} 66 L${x - 12} 50 Z`} />
      ))}
    </g>
  ),

  /* ------------------------------------------------------------- seals -- */

  "seal-ring": (
    <g {...stroke} strokeWidth={1.6}>
      <circle cx="50" cy="50" r="46" />
      <circle cx="50" cy="50" r="40" strokeWidth={0.9} opacity={0.6} />
    </g>
  ),

  "seal-ring-laurel": (
    <g {...stroke} strokeWidth={1.4}>
      <circle cx="50" cy="50" r="46" />
      <path d="M26 78 C14 62 14 38 26 22" />
      <path d="M74 78 C86 62 86 38 74 22" />
    </g>
  ),
} satisfies Record<string, React.ReactNode>;

export function VectorArt({
  name,
  strokeWidth,
}: {
  name: string;
  strokeWidth?: number;
}) {
  const art = ART[name as VectorArtName];
  if (!art) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
      strokeWidth={strokeWidth}
    >
      {art}
    </svg>
  );
}

export const VECTOR_ART_NAMES = Object.keys(ART);
