import * as React from "react";
import type { BandSpec, BorderStyle, CornerSpec, PlateSpec } from "@/domain/design/borders";

/**
 * Draws a border spec.
 *
 * Everything is SVG so it stays crisp from a 130px gallery thumbnail up to a
 * full-bleed hero, and everything is stroked or filled in the palette's own
 * accent so no ornament can fight the colours around it.
 *
 * The overlay sits above the ground and below the type, and never takes a
 * pointer event — it is decoration, and it is hidden from assistive technology
 * for the same reason.
 */

export interface BorderOverlayProps {
  border: BorderStyle;
  accent: string;
  /** Multiplies every dimension in the spec. */
  scale: number;
}

export function BorderOverlay({ border, accent, scale }: BorderOverlayProps) {
  const px = (value: number) => value * scale;

  if (!border.rules?.length && !border.corner && !border.band && !border.plate) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {border.rules?.map((rule, index) => (
        <span
          key={`rule-${index}`}
          style={{
            position: "absolute",
            inset: px(rule.inset),
            border: `${px(rule.width)}px ${rule.dashed ? "dashed" : "solid"} ${accent}`,
            borderRadius: rule.radius ? px(rule.radius) : undefined,
            opacity: rule.opacity,
          }}
        />
      ))}

      {/* The plate sits behind everything else, inset so a rule can frame it. */}
      {border.plate ? (
        <span style={{ position: "absolute", inset: px(20) }}>
          <Plate spec={border.plate} accent={accent} />
        </span>
      ) : null}
      {border.corner ? <Corners spec={border.corner} accent={accent} px={px} /> : null}
      {border.band ? <Bands spec={border.band} accent={accent} px={px} /> : null}
    </span>
  );
}

/* ---------------------------------------------------------------- corners -- */

function Corners({
  spec,
  accent,
  px,
}: {
  spec: CornerSpec;
  accent: string;
  px: (value: number) => number;
}) {
  const size = px(spec.size);
  const inset = px(spec.inset);
  const opacity = spec.opacity ?? 1;

  // Each corner is the same drawing, rotated. Authoring one and turning it is
  // what keeps these consistent — a hand-drawn set never quite matches.
  const rotations = [0, 90, 180, 270];
  const positions = [
    { top: inset, left: inset },
    { top: inset, right: inset },
    { bottom: inset, right: inset },
    { bottom: inset, left: inset },
  ];

  return (
    <>
      {positions.map((position, index) => (
        <svg
          key={index}
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: "absolute", ...position, opacity }}
        >
          <g transform={`rotate(${rotations[index]} 50 50)`}>
            <CornerArt kind={spec.kind} accent={accent} />
          </g>
        </svg>
      ))}
    </>
  );
}

function CornerArt({ kind, accent }: { kind: CornerSpec["kind"]; accent: string }) {
  const stroke = { stroke: accent, fill: "none", strokeWidth: 4, strokeLinecap: "round" as const };

  switch (kind) {
    case "BRACKET":
      return <path d="M4 96 L4 4 L96 4" {...stroke} />;

    case "TICK":
      return (
        <>
          <path d="M0 22 L46 22" {...stroke} strokeWidth={3} />
          <path d="M22 0 L22 46" {...stroke} strokeWidth={3} />
        </>
      );

    case "ARC":
      return <path d="M4 96 A92 92 0 0 1 96 4" {...stroke} />;

    case "LOZENGE":
      return <rect x="30" y="30" width="40" height="40" fill={accent} transform="rotate(45 50 50)" />;

    case "STEP":
      return (
        <>
          <path d="M6 94 L6 46 L46 46 L46 6 L94 6" {...stroke} strokeLinecap="square" />
          <path d="M22 94 L22 62 L62 62 L62 22 L94 22" {...stroke} strokeWidth={2.5} opacity={0.55} />
        </>
      );

    case "FAN":
      // A quarter of radiating lines, longest on the diagonal.
      return (
        <g {...stroke} strokeWidth={3}>
          {[0, 15, 30, 45, 60, 75, 90].map((angle) => {
            const radians = (angle * Math.PI) / 180;
            const length = 78;
            return (
              <line
                key={angle}
                x1={8}
                y1={8}
                x2={8 + Math.cos(radians) * length}
                y2={8 + Math.sin(radians) * length}
              />
            );
          })}
          <path d="M8 86 A78 78 0 0 0 86 8" {...stroke} strokeWidth={3} />
        </g>
      );

    case "FLOURISH":
      // A curling terminal — one long sweep with a smaller answering curl.
      return (
        <g {...stroke} strokeWidth={3.5}>
          <path d="M6 94 C6 44 26 12 84 8" />
          <path d="M84 8 C58 8 44 22 44 38 C44 50 56 54 62 47 C67 41 62 33 54 35" />
          <path d="M6 60 C22 58 32 46 34 30" strokeWidth={2.5} opacity={0.6} />
        </g>
      );

    case "SPRIG":
      // A stem with leaves alternating off it.
      return (
        <g {...stroke} strokeWidth={3}>
          <path d="M8 92 C30 78 54 52 88 12" />
          <path d="M34 62 C28 48 34 36 46 32 C46 46 42 56 34 62 Z" fill={accent} opacity={0.22} />
          <path d="M52 46 C62 38 74 40 80 50 C68 56 58 54 52 46 Z" fill={accent} opacity={0.22} />
          <path d="M20 78 C14 68 18 58 28 54 C28 66 26 74 20 78 Z" fill={accent} opacity={0.22} />
        </g>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ bands -- */

function Bands({
  spec,
  accent,
  px,
}: {
  spec: BandSpec;
  accent: string;
  px: (value: number) => number;
}) {
  const height = px(spec.height);
  const inset = px(spec.inset);
  const opacity = spec.opacity ?? 1;

  const horizontal = (position: "top" | "bottom") => (
    <span
      key={position}
      style={{
        position: "absolute",
        left: inset,
        right: inset,
        [position]: inset,
        height,
        opacity,
        transform: position === "bottom" ? "scaleY(-1)" : undefined,
      }}
    >
      <BandRun kind={spec.kind} accent={accent} filled={spec.filled} height={height} />
    </span>
  );

  const vertical = (
    <span
      key="left"
      style={{
        position: "absolute",
        top: inset,
        bottom: inset,
        left: inset,
        width: height,
        opacity,
        background: accent,
      }}
    />
  );

  if (spec.edges === "LEFT") return vertical;
  if (spec.edges === "TOP") return horizontal("top");
  if (spec.edges === "BOTTOM") return horizontal("bottom");

  if (spec.edges === "ALL") {
    return (
      <>
        {horizontal("top")}
        {horizontal("bottom")}
        {/* The sides reuse the same run, rotated a quarter turn. */}
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            style={{
              position: "absolute",
              top: inset,
              bottom: inset,
              [side]: inset,
              width: height,
              opacity,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "absolute",
                transformOrigin: "top left",
                transform: side === "left" ? "rotate(90deg)" : "rotate(90deg) scaleY(-1)",
                width: "100vh",
                height,
                left: side === "left" ? height : height,
                top: 0,
              }}
            >
              <BandRun kind={spec.kind} accent={accent} filled={spec.filled} height={height} />
            </span>
          </span>
        ))}
      </>
    );
  }

  return (
    <>
      {horizontal("top")}
      {horizontal("bottom")}
    </>
  );
}

/**
 * One repeating run of ornament.
 *
 * Drawn as a tiling SVG background rather than a stretched one, so the motif
 * keeps its proportions however wide the card is — a stretched greek key
 * immediately looks wrong.
 */
function BandRun({
  kind,
  accent,
  filled,
  height,
}: {
  kind: BandSpec["kind"];
  accent: string;
  filled?: boolean;
  height: number;
}) {
  const tile = bandTile(kind, accent, filled);
  return (
    <span
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(tile.svg)}")`,
        backgroundRepeat: "repeat-x",
        backgroundSize: `${(tile.width / tile.height) * height}px ${height}px`,
        backgroundPosition: "center",
      }}
    />
  );
}

function bandTile(
  kind: BandSpec["kind"],
  accent: string,
  filled?: boolean,
): { svg: string; width: number; height: number } {
  const s = (body: string, width: number, height: number) => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
    width,
    height,
  });

  // Parameterised, because emitting `${line} stroke-width="3"` produced a
  // duplicate attribute — malformed SVG that a browser drops entirely, which
  // is why several of these bands used to render as empty swatches.
  const line = (width = 2) => `fill="none" stroke="${accent}" stroke-width="${width}"`;
  const solid = `fill="${accent}"`;

  switch (kind) {
    case "GREEK_KEY":
      return s(
        `<path d="M2 22 L2 6 L18 6 L18 16 L10 16 L10 12 L14 12" ${line()} stroke-linecap="square"/>`,
        24,
        28,
      );

    case "VINE":
      return s(
        `<path d="M0 18 C8 8 16 28 24 18 C32 8 40 28 48 18" ${line()}/>
         <ellipse cx="12" cy="10" rx="4" ry="2.6" ${solid} opacity="0.8" transform="rotate(-25 12 10)"/>
         <ellipse cx="36" cy="26" rx="4" ry="2.6" ${solid} opacity="0.8" transform="rotate(-25 36 26)"/>`,
        48,
        36,
      );

    case "GUILLOCHE":
      return s(
        `<path d="M0 16 C8 2 16 30 24 16 C32 2 40 30 48 16" ${line(1.4)}/>
         <path d="M0 16 C8 30 16 2 24 16 C32 30 40 2 48 16" ${line(1.4)}/>`,
        48,
        32,
      );

    case "BEAD":
      return s(
        `<circle cx="8" cy="12" r="4" ${solid}/><circle cx="20" cy="12" r="2" ${solid} opacity="0.65"/>`,
        24,
        24,
      );

    case "ROPE":
      return s(
        `<path d="M0 14 C6 2 12 2 18 14 C24 26 30 26 36 14" ${line(3)} stroke-linecap="round"/>`,
        36,
        28,
      );

    case "CHAIN":
      return s(
        `<ellipse cx="12" cy="14" rx="10" ry="6" ${line(2.2)}/>
         <ellipse cx="28" cy="14" rx="10" ry="6" ${line(2.2)}/>`,
        32,
        28,
      );

    case "DENTIL":
      return s(`<rect x="0" y="6" width="10" height="16" ${solid}/>`, 18, 28);

    case "DIAMOND_RUN":
      return s(
        `<path d="M14 4 L24 14 L14 24 L4 14 Z" ${filled ? solid : line()}/>`,
        28,
        28,
      );

    case "TRIANGLE_RUN":
      return s(`<path d="M0 24 L12 4 L24 24 Z" ${solid}/>`, 24, 28);

    case "WAVE":
      return s(
        `<path d="M0 14 C8 4 16 24 24 14 C32 4 40 24 48 14" ${line(2.4)}/>`,
        48,
        28,
      );

    case "ZIGZAG":
      return s(`<path d="M0 22 L12 6 L24 22 L36 6 L48 22" ${line(2.6)}/>`, 48, 28);

    case "BLOCK_DASH":
    default:
      return s(`<rect x="0" y="0" width="16" height="28" ${solid}/>`, 24, 28);
  }
}

/* ----------------------------------------------------------------- plates -- */

/** The shape sat behind the names, drawn beneath the type. */
export function Plate({ spec, accent }: { spec: PlateSpec; accent: string }) {
  if (spec.kind === "NONE") return null;

  // `vector-effect` keeps the stroke one CSS pixel however the viewBox is
  // stretched — without it a plate scaled to a wide card grows a fat vertical
  // stroke and a hairline horizontal one.
  const common = {
    fill: spec.fill > 0 ? accent : "none",
    fillOpacity: spec.fill,
    stroke: spec.stroke ? accent : "none",
    strokeWidth: 1.4,
    strokeOpacity: 0.55,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {spec.kind === "OVAL" ? <ellipse cx="100" cy="100" rx="96" ry="94" {...common} /> : null}
      {spec.kind === "ROUNDED" ? (
        <rect x="4" y="4" width="192" height="192" rx="16" {...common} />
      ) : null}
      {spec.kind === "ARCH" ? (
        <path d="M6 196 L6 96 A94 94 0 0 1 194 96 L194 196 Z" {...common} />
      ) : null}
      {spec.kind === "SHIELD" ? (
        <path d="M100 4 L192 32 L192 108 C192 158 148 186 100 196 C52 186 8 158 8 108 L8 32 Z" {...common} />
      ) : null}
      {spec.kind === "HEXAGON" ? (
        <path d="M100 4 L192 52 L192 148 L100 196 L8 148 L8 52 Z" {...common} />
      ) : null}
    </svg>
  );
}
