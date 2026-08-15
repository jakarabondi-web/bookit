import * as React from "react";
import type { BindingContext } from "@/domain/design-studio/bindings";
import {
  CANVAS_SIZES,
  paletteFor,
  sortedElements,
  type BookitTemplate,
  type CanvasSizeName,
  type DesignElement,
  type PaperStock,
} from "@/domain/design-studio/types";
import { ElementView } from "./element-renderer";

/**
 * A rendered board.
 *
 * One transform scales the whole art board, so every element's numbers mean the
 * same thing at 180px in a gallery tile and at 700px in the editor — there is
 * no second set of sizes to keep in sync, and a design cannot drift between the
 * thumbnail a host chose and the card their guests receive.
 */

export interface DesignBoardProps {
  template: BookitTemplate;
  data: BindingContext;
  /**
   * Rendered width in CSS pixels. Optional: the board is fluid by default and
   * fills its container, which is what keeps a gallery tile and the editor
   * pixel-identical without either of them knowing the other's size.
   */
  width?: number;
  paletteId?: string | null;
  /** Overrides the template's own elements — the editor's working copy. */
  elements?: DesignElement[];
  size?: CanvasSizeName;
  className?: string;
  style?: React.CSSProperties;
  /** Paper texture and edge. Off for exports, on for presentation. */
  presentation?: boolean;
  children?: React.ReactNode;
}

export function DesignBoard({
  template,
  data,
  width,
  paletteId,
  elements,
  size,
  className,
  style,
  presentation = true,
  children,
}: DesignBoardProps) {
  const canvas = CANVAS_SIZES[size ?? template.size];
  const palette = paletteFor(template, paletteId);
  const board = elements ?? template.elements;

  // One board unit as a share of the board's own width. `cqw` resolves against
  // the container below, so every element scales with the board and nothing
  // needs to know how many pixels wide it ended up.
  const unit = 100 / canvas.width;
  const u = (units: number) => `${(units * unit).toFixed(4)}cqw`;

  const context = {
    palette,
    fonts: template.fontSystem,
    data,
    u,
    pxScale: (width ?? canvas.width) / canvas.width,
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: width ?? "100%",
        aspectRatio: `${canvas.width} / ${canvas.height}`,
        // The container every `cqw` in the board resolves against.
        containerType: "inline-size",
        background: palette.ground,
        overflow: "hidden",
        // The board sets its own text colour so any element that forgets to
        // still lands inside the palette rather than inheriting the app's.
        color: palette.ink,
        ...style,
      }}
    >
      {sortedElements(board).map((element) => (
        <ElementView key={element.id} element={element} context={context} />
      ))}

      {presentation && template.paper !== "none" ? <Paper stock={template.paper} /> : null}
      {children}
    </div>
  );
}

/**
 * Paper.
 *
 * A very quiet grain and a fractional inner shadow. The job is to stop a flat
 * rectangle reading as a screenshot — not to look like a texture was applied.
 */
function Paper({ stock }: { stock: Exclude<PaperStock, "none"> }) {
  const grain: Record<Exclude<PaperStock, "none">, { opacity: number; size: number }> = {
    cotton: { opacity: 0.045, size: 140 },
    handmade: { opacity: 0.075, size: 180 },
    linen: { opacity: 0.055, size: 90 },
    vellum: { opacity: 0.03, size: 220 },
  };
  const { opacity, size } = grain[stock];

  const noise = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="${size}" height="${size}" filter="url(%23n)"/></svg>`;

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(noise).replace(/%2523/g, "%23")}")`,
        backgroundSize: `${size}px ${size}px`,
        opacity,
        mixBlendMode: "multiply",
      }}
    />
  );
}
