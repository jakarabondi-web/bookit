import * as React from "react";
import { resolveBindings, type BindingContext } from "@/domain/design-studio/bindings";
import {
  colorFor,
  fontFor,
  type DesignElement,
  type FontSystem,
  type MaterialEffect,
  type TemplatePalette,
  type TextElement,
} from "@/domain/design-studio/types";
import { motifTile } from "./motifs";
import { VectorArt } from "./vector-art";

/**
 * Draws one element.
 *
 * The board is rendered as DOM rather than into a canvas, which was the single
 * biggest architectural decision here. It costs some transform convenience and
 * buys four things the product needs more: real self-hosted webfonts with real
 * kerning; text that stays selectable and reachable by a screen reader; print
 * output that leaves the browser as vector at any DPI rather than as a
 * rasterised bitmap; and CSS-only print finishes — letterpress, deboss, foil —
 * that a canvas cannot express without baking them into pixels.
 *
 * Everything is positioned in art-board units and scaled by one transform on
 * the board, so an element's numbers mean the same thing in a 180px thumbnail,
 * a 700px editor and a 300 DPI export.
 */

export interface RenderContext {
  palette: TemplatePalette;
  fonts: FontSystem;
  data: BindingContext;
  /**
   * Board units → CSS length.
   *
   * Everything is expressed in container-query units against the board, so a
   * design is genuinely resolution-independent: the same element numbers draw
   * correctly in a 180px gallery tile, a 700px editor and a print export, and
   * nothing has to know the pixel width in advance. Guessing that width was
   * what clipped designs in the gallery.
   */
  u: (units: number) => string;
  /** Approximate pixels per board unit, for the few places that need a number. */
  pxScale: number;
}

export function ElementView({
  element,
  context,
}: {
  element: DesignElement;
  context: RenderContext;
}) {
  if (element.hidden) return null;

  const frame: React.CSSProperties = {
    position: "absolute",
    left: context.u(element.x),
    top: context.u(element.y),
    width: context.u(element.width),
    height: context.u(element.height),
    opacity: element.opacity,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: "center",
  };

  switch (element.type) {
    case "text":
      return <TextView element={element} context={context} frame={frame} />;

    case "shape": {
      const fill = element.fillRole ? colorFor(context.palette, element.fillRole) : "transparent";
      const stroke = element.strokeRole ? colorFor(context.palette, element.strokeRole) : "none";
      const width = context.u(element.strokeWidth);

      if (element.shape === "rect") {
        return (
          <div
            aria-hidden="true"
            style={{
              ...frame,
              background: fill,
              border:
                element.strokeRole
                  ? `${width} ${element.dashed ? "dashed" : "solid"} ${stroke}`
                  : undefined,
              borderRadius: element.radius ? context.u(element.radius) : undefined,
            }}
          />
        );
      }

      if (element.shape === "line") {
        return (
          <div
            aria-hidden="true"
            style={{ ...frame, background: element.fillRole ? fill : stroke, height: width }}
          />
        );
      }

      return (
        <svg
          aria-hidden="true"
          style={frame}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <ShapePath
            shape={element.shape}
            fill={element.fillRole ? fill : "none"}
            stroke={element.strokeRole ? stroke : "none"}
            strokeWidth={element.strokeWidth}
          />
        </svg>
      );
    }

    case "vector":
      return (
        <div
          aria-hidden="true"
          style={{ ...frame, color: colorFor(context.palette, element.colorRole) }}
        >
          <VectorArt name={element.art} strokeWidth={element.strokeWidth} />
        </div>
      );

    case "pattern": {
      const tile = motifTile(element.motif, colorFor(context.palette, element.colorRole));
      if (!tile) return null;
      const size = context.u(element.scale);
      return (
        <div
          aria-hidden="true"
          style={{
            ...frame,
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(tile)}")`,
            backgroundRepeat: "repeat",
            backgroundSize: `${size} ${size}`,
            opacity: element.patternOpacity,
          }}
        />
      );
    }

    case "divider":
      return (
        <div
          aria-hidden="true"
          style={{
            ...frame,
            color: colorFor(context.palette, element.colorRole),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DividerArt
            style={element.style}
            width={context.u(element.width)}
            strokeWidth={context.u(Math.max(element.strokeWidth, 0.6))}
          />
        </div>
      );

    case "monogram":
      return <MonogramView element={element} context={context} frame={frame} />;

    case "image": {
      const radius =
        element.mask === "circle"
          ? "50%"
          : element.mask === "arch"
            ? `${context.u(element.width)} ${context.u(element.width)} ${context.u(element.radius ?? 4)} ${context.u(element.radius ?? 4)}`
            : element.radius
              ? context.u(element.radius)
              : undefined;

      if (!element.src) {
        return (
          <div
            aria-hidden="true"
            style={{
              ...frame,
              borderRadius: radius,
              background: colorFor(context.palette, "accentSoft"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colorFor(context.palette, "muted"),
              fontSize: context.u(11),
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Your photograph
          </div>
        );
      }

      return (
        <div style={{ ...frame, borderRadius: radius, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={element.src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: element.fit,
              objectPosition: `${element.focalX * 100}% ${element.focalY * 100}%`,
              filter: imageFilter(element.brightness, element.contrast, element.saturation),
              display: "block",
            }}
          />
        </div>
      );
    }

    case "qr": {
      // A code has to be dark modules on a light quiet zone or a phone will not
      // read it, which means it cannot simply take the palette's ink on the
      // palette's ground — on a midnight card that is light-on-dark and does
      // not scan. It gets a plate instead, drawn from whichever two colours in
      // the palette are furthest apart.
      const plate = lightest(context.palette);
      const modules = darkest(context.palette);

      return (
        <div
          style={{
            ...frame,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: context.u(4),
            color: colorFor(context.palette, element.colorRole),
          }}
        >
          <QrPlaceholder
            seed={resolveBindings(element.value, context.data)}
            plate={plate}
            modules={modules}
            radius={context.u(4)}
          />
          {element.caption ? (
            <span
              style={{
                fontFamily: fontFor(context.fonts, "body"),
                fontSize: context.u(9),
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {resolveBindings(element.caption, context.data)}
            </span>
          ) : null}
        </div>
      );
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------- text -- */

function TextView({
  element,
  context,
  frame,
}: {
  element: TextElement;
  context: RenderContext;
  frame: React.CSSProperties;
}) {
  const colour = colorFor(context.palette, element.colorRole);
  const resolved = resolveBindings(element.content, context.data);

  return (
    <div
      style={{
        ...frame,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          element.verticalAlign === "middle"
            ? "center"
            : element.verticalAlign === "bottom"
              ? "flex-end"
              : "flex-start",
        alignItems:
          element.align === "center"
            ? "center"
            : element.align === "right"
              ? "flex-end"
              : "flex-start",
      }}
    >
      <span
        style={{
          fontFamily: fontFor(context.fonts, element.fontRole),
          fontSize: context.u(element.fontSize),
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
          lineHeight: element.lineHeight,
          letterSpacing: `${element.letterSpacing}em`,
          textAlign: element.align,
          textTransform: element.uppercase ? "uppercase" : undefined,
          width: "100%",
          // Long names are a stated QA case; wrapping beats overflowing.
          overflowWrap: "break-word",
          ...effectStyle(element.effect, colour, context.palette),
        }}
      >
        {resolved}
      </span>
    </div>
  );
}

/**
 * Print finishes.
 *
 * Restraint is the whole point. Foil is a narrow warm band travelling across
 * the letterform, not a rainbow; letterpress is a single hairline of shadow
 * suggesting the paper was pressed. Anything stronger reads as costume
 * jewellery — the opposite of what a real finish does.
 */
function effectStyle(
  effect: MaterialEffect | undefined,
  colour: string,
  palette: TemplatePalette,
): React.CSSProperties {
  switch (effect) {
    case "foil-gold":
      return foil(["#8A6524", "#D8BE79", "#A57F33", "#EFDCA4", "#8A6524"]);
    case "foil-silver":
      return foil(["#7C818A", "#D9DDE2", "#9AA0A8", "#EFF2F5", "#7C818A"]);
    case "foil-rose":
      return foil(["#96604F", "#E2B3A2", "#B57A66", "#F2D3C6", "#96604F"]);
    case "letterpress":
      return {
        color: colour,
        textShadow: palette.dark
          ? "0 1px 0 rgba(255,255,255,0.10)"
          : "0 1px 0 rgba(255,255,255,0.85), 0 -0.5px 0 rgba(0,0,0,0.16)",
      };
    case "deboss":
      return {
        color: "transparent",
        WebkitTextStroke: `0.4px ${colour}`,
        textShadow: palette.dark
          ? "0 1px 1px rgba(255,255,255,0.10)"
          : "0 1px 1px rgba(0,0,0,0.14)",
        opacity: 0.9,
      };
    case "emboss":
      return {
        color: palette.ground,
        textShadow: palette.dark
          ? `0 1px 0 ${colour}, 0 -1px 1px rgba(0,0,0,0.4)`
          : `0 1px 0 rgba(255,255,255,0.9), 0 -1px 1px ${colour}55`,
      };
    default:
      return { color: colour };
  }
}

function foil(stops: string[]): React.CSSProperties {
  return {
    backgroundImage: `linear-gradient(104deg, ${stops.join(", ")})`,
    backgroundSize: "220% 100%",
    backgroundPosition: "30% 50%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}

/* --------------------------------------------------------------- monogram -- */

function MonogramView({
  element,
  context,
  frame,
}: {
  element: Extract<DesignElement, { type: "monogram" }>;
  context: RenderContext;
  frame: React.CSSProperties;
}) {
  const colour = colorFor(context.palette, element.colorRole);
  const strokeColour = colorFor(context.palette, element.strokeRole ?? element.colorRole);
  const letters = element.text ?? context.data.couple.initials;

  const type: React.CSSProperties = {
    fontFamily: fontFor(context.fonts, element.fontRole),
    fontSize: context.u(element.fontSize),
    letterSpacing: "0.06em",
    lineHeight: 1,
    ...effectStyle(element.effect, colour, context.palette),
  };

  const centred: React.CSSProperties = {
    ...frame,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (element.style === "plain") {
    return <div style={{ ...centred }}><span style={type}>{letters}</span></div>;
  }

  if (element.style === "stacked" || element.style === "slashed") {
    const parts = letters.split(/\s*[&/·]\s*/).filter(Boolean);
    return (
      <div style={{ ...centred, flexDirection: element.style === "stacked" ? "column" : "row", gap: 2 }}>
        <span style={type}>{parts[0]}</span>
        <span style={{ ...type, opacity: 0.55, fontSize: context.u(element.fontSize * 0.72) }}>
          {element.style === "stacked" ? "—" : "/"}
        </span>
        <span style={type}>{parts[1] ?? ""}</span>
      </div>
    );
  }

  const border = `${context.u(1.2)} solid ${strokeColour}`;

  if (element.style === "seal") {
    return (
      <div style={centred}>
        <div style={{ position: "absolute", inset: 0, color: strokeColour }}>
          <VectorArt name="seal-ring-laurel" />
        </div>
        <span style={type}>{letters}</span>
      </div>
    );
  }

  if (element.style === "shield") {
    return (
      <div style={centred}>
        <svg viewBox="0 0 100 115" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
          <path
            d="M50 2 L96 16 L96 62 C96 90 74 106 50 113 C26 106 4 90 4 62 L4 16 Z"
            fill="none"
            stroke={strokeColour}
            strokeWidth={2.4}
          />
        </svg>
        <span style={{ ...type, position: "relative" }}>{letters}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...centred,
        border,
        borderRadius: element.style === "circle" ? "50%" : 0,
        transform: element.style === "diamond" ? "rotate(45deg)" : frame.transform,
      }}
    >
      <span style={{ ...type, transform: element.style === "diamond" ? "rotate(-45deg)" : undefined }}>
        {letters}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- shapes -- */

function ShapePath({
  shape,
  fill,
  stroke,
  strokeWidth,
}: {
  shape: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  // `non-scaling-stroke` keeps a stretched shape's outline even, instead of
  // fat on one axis and hairline on the other.
  const props = {
    fill,
    stroke,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (shape) {
    case "ellipse":
      return <ellipse cx="50" cy="50" rx="49" ry="49" {...props} />;
    case "arch":
      return <path d="M1 100 L1 50 A49 49 0 0 1 99 50 L99 100 Z" {...props} />;
    case "hexagon":
      return <path d="M50 1 L99 26 L99 74 L50 99 L1 74 L1 26 Z" {...props} />;
    case "shield":
      return (
        <path d="M50 1 L97 15 L97 58 C97 84 76 96 50 99 C24 96 3 84 3 58 L3 15 Z" {...props} />
      );
    default:
      return <rect x="0" y="0" width="100" height="100" {...props} />;
  }
}

/* -------------------------------------------------------------- dividers -- */

function DividerArt({
  style,
  width,
  strokeWidth,
}: {
  style: string;
  width: string;
  strokeWidth: string;
}) {
  if (style === "fleuron") {
    return (
      <div style={{ width, aspectRatio: "6 / 1", color: "inherit" }}>
        <VectorArt name="fleuron" />
      </div>
    );
  }

  if (style === "dots") {
    return (
      <span style={{ display: "flex", gap: `calc(${strokeWidth} * 5)`, alignItems: "center" }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{
              width: `calc(${strokeWidth} * 3)`,
              height: `calc(${strokeWidth} * 3)`,
              borderRadius: "50%",
              background: "currentColor",
            }}
          />
        ))}
      </span>
    );
  }

  if (style === "diamond") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: `calc(${strokeWidth} * 6)`, width: "100%" }}>
        <span style={{ flex: 1, height: strokeWidth, background: "currentColor", opacity: 0.6 }} />
        <span
          style={{
            width: `calc(${strokeWidth} * 5)`,
            height: `calc(${strokeWidth} * 5)`,
            background: "currentColor",
            transform: "rotate(45deg)",
          }}
        />
        <span style={{ flex: 1, height: strokeWidth, background: "currentColor", opacity: 0.6 }} />
      </span>
    );
  }

  if (style === "double") {
    return (
      <span style={{ width: "100%", display: "flex", flexDirection: "column", gap: `calc(${strokeWidth} * 2)` }}>
        <span style={{ height: strokeWidth, background: "currentColor" }} />
        <span style={{ height: `calc(${strokeWidth} * 0.6)`, background: "currentColor", opacity: 0.5 }} />
      </span>
    );
  }

  return <span style={{ width: "100%", height: strokeWidth, background: "currentColor" }} />;
}

/* -------------------------------------------------------------------- qr -- */

/**
 * A stand-in code.
 *
 * The real one is generated per guest at send time, signed, and pointed at that
 * guest's own invitation. What matters in a preview is that the block reads as
 * a code at a glance and occupies exactly the space the real one will — a
 * sparse decorative approximation looks like a rendering fault on a card
 * someone is deciding whether to pay for. The fill is derived from the value,
 * so two different links do not draw the same square.
 */
const GRID = 21;

function moduleMap(seed: string): boolean[][] {
  // A small deterministic PRNG. Not cryptography — this is a drawing.
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000) / 1000;
  };

  const reserved = (x: number, y: number) =>
    // The three finders and their separators, plus the timing rows.
    (x < 8 && y < 8) || (x > GRID - 9 && y < 8) || (x < 8 && y > GRID - 9) || x === 6 || y === 6;

  return Array.from({ length: GRID }, (_, y) =>
    Array.from({ length: GRID }, (_, x) => (reserved(x, y) ? false : random() > 0.5)),
  );
}

function QrPlaceholder({
  seed,
  plate,
  modules,
  radius,
}: {
  seed: string;
  plate: string;
  modules: string;
  radius: string;
}) {
  const map = React.useMemo(() => moduleMap(seed), [seed]);

  return (
    <svg
      viewBox="-2 -2 25 25"
      style={{ width: "100%", flex: 1, borderRadius: radius, background: plate }}
      aria-hidden="true"
    >
      {[
        [0, 0],
        [GRID - 7, 0],
        [0, GRID - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} fill={modules}>
          <rect x={x} y={y} width="7" height="7" />
          <rect x={x! + 1} y={y! + 1} width="5" height="5" fill={plate} />
          <rect x={x! + 2} y={y! + 2} width="3" height="3" />
        </g>
      ))}

      <g fill={modules}>
        {/* Timing rows, which is what makes the block read as a code. */}
        {Array.from({ length: GRID - 16 }, (_, index) => (
          <rect key={`t-${index}`} x={8 + index} y={6} width={index % 2 ? 0 : 1} height="1" />
        ))}
        {Array.from({ length: GRID - 16 }, (_, index) => (
          <rect key={`v-${index}`} x={6} y={8 + index} width="1" height={index % 2 ? 0 : 1} />
        ))}
        {map.flatMap((row, y) =>
          row.map((on, x) =>
            on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null,
          ),
        )}
      </g>
    </svg>
  );
}

/** The palette's two extremes, for anything that has to be read by a machine. */
function lightest(palette: TemplatePalette): string {
  return palette.dark ? palette.ink : palette.ground;
}

function darkest(palette: TemplatePalette): string {
  return palette.dark ? palette.ground : palette.ink;
}

function imageFilter(brightness?: number, contrast?: number, saturation?: number): string | undefined {
  const parts: string[] = [];
  if (brightness !== undefined && brightness !== 1) parts.push(`brightness(${brightness})`);
  if (contrast !== undefined && contrast !== 1) parts.push(`contrast(${contrast})`);
  if (saturation !== undefined && saturation !== 1) parts.push(`saturate(${saturation})`);
  return parts.length ? parts.join(" ") : undefined;
}
