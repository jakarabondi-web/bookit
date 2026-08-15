import { CANVAS_SIZES } from "./types";
import type {
  ColorRole,
  DesignElement,
  DividerElement,
  FontRole,
  ImageElement,
  MaterialEffect,
  MonogramElement,
  PatternElement,
  ShapeElement,
  TextAlign,
  TextElement,
  VectorElement,
} from "./types";

/**
 * Authoring helpers.
 *
 * Twelve hand-composed templates are a lot of element literals, and an element
 * literal with fourteen required fields is unreadable — the composition
 * disappears under the boilerplate. These builders carry the defaults so a
 * template file reads as a description of the design: what is on the board,
 * where, and how big.
 *
 * `zIndex` auto-increments per template so authoring order is paint order,
 * which is how a designer actually thinks about a layered composition.
 */

let sequence = 0;

/** Call at the top of each template file so ids stay stable and readable. */
export function beginTemplate(prefix: string): void {
  sequence = 0;
  currentPrefix = prefix;
}

let currentPrefix = "el";

function nextId(kind: string): string {
  sequence += 1;
  return `${currentPrefix}-${kind}-${sequence}`;
}

function base(x: number, y: number, width: number, height: number) {
  return {
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: sequence,
  };
}

export interface TextOptions {
  size: number;
  role?: FontRole;
  color?: ColorRole;
  align?: TextAlign;
  weight?: number;
  italic?: boolean;
  lineHeight?: number;
  tracking?: number;
  uppercase?: boolean;
  effect?: MaterialEffect;
  locked?: boolean;
  id?: string;
  verticalAlign?: "top" | "middle" | "bottom";
  opacity?: number;
}

export function text(
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: TextOptions,
): TextElement {
  return {
    ...base(x, y, width, height),
    id: options.id ?? nextId("text"),
    type: "text",
    content,
    fontRole: options.role ?? "body",
    fontSize: options.size,
    fontWeight: options.weight ?? 400,
    fontStyle: options.italic ? "italic" : "normal",
    lineHeight: options.lineHeight ?? 1.2,
    letterSpacing: options.tracking ?? 0,
    align: options.align ?? "center",
    colorRole: options.color ?? "ink",
    uppercase: options.uppercase,
    effect: options.effect,
    verticalAlign: options.verticalAlign ?? "top",
    locked: options.locked ?? false,
    opacity: options.opacity ?? 1,
  };
}

export function shape(
  kind: ShapeElement["shape"],
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: ColorRole | null;
    stroke?: ColorRole | null;
    strokeWidth?: number;
    radius?: number;
    dashed?: boolean;
    opacity?: number;
    locked?: boolean;
    id?: string;
    rotation?: number;
  } = {},
): ShapeElement {
  return {
    ...base(x, y, width, height),
    id: options.id ?? nextId("shape"),
    type: "shape",
    shape: kind,
    fillRole: options.fill ?? null,
    strokeRole: options.stroke ?? null,
    strokeWidth: options.strokeWidth ?? 1,
    radius: options.radius,
    dashed: options.dashed,
    opacity: options.opacity ?? 1,
    locked: options.locked ?? true,
    rotation: options.rotation ?? 0,
  };
}

export function vector(
  art: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    color?: ColorRole;
    opacity?: number;
    rotation?: number;
    strokeWidth?: number;
    locked?: boolean;
    id?: string;
  } = {},
): VectorElement {
  return {
    ...base(x, y, width, height),
    id: options.id ?? nextId("vector"),
    type: "vector",
    art,
    colorRole: options.color ?? "accent",
    opacity: options.opacity ?? 1,
    rotation: options.rotation ?? 0,
    strokeWidth: options.strokeWidth,
    locked: options.locked ?? true,
  };
}

export function pattern(
  motif: string,
  options: {
    color?: ColorRole;
    scale?: number;
    opacity?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    id?: string;
  } = {},
): PatternElement {
  const size = CANVAS_SIZES.invitation;
  return {
    ...base(
      options.x ?? 0,
      options.y ?? 0,
      options.width ?? size.width,
      options.height ?? size.height,
    ),
    id: options.id ?? nextId("pattern"),
    type: "pattern",
    motif,
    colorRole: options.color ?? "accent",
    scale: options.scale ?? 56,
    patternOpacity: options.opacity ?? 0.14,
    opacity: 1,
    locked: true,
  };
}

export function divider(
  style: DividerElement["style"],
  x: number,
  y: number,
  width: number,
  options: { color?: ColorRole; strokeWidth?: number; opacity?: number; id?: string } = {},
): DividerElement {
  return {
    ...base(x, y, width, 16),
    id: options.id ?? nextId("divider"),
    type: "divider",
    style,
    colorRole: options.color ?? "accent",
    strokeWidth: options.strokeWidth ?? 1,
    opacity: options.opacity ?? 1,
    locked: true,
  };
}

export function monogram(
  style: MonogramElement["style"],
  x: number,
  y: number,
  size: number,
  options: {
    text?: string | null;
    fontSize?: number;
    color?: ColorRole;
    stroke?: ColorRole;
    role?: FontRole;
    effect?: MaterialEffect;
    id?: string;
  } = {},
): MonogramElement {
  return {
    ...base(x, y, size, size),
    id: options.id ?? nextId("monogram"),
    type: "monogram",
    style,
    text: options.text ?? null,
    fontRole: options.role ?? "display",
    fontSize: options.fontSize ?? size * 0.34,
    colorRole: options.color ?? "accent",
    strokeRole: options.stroke ?? options.color ?? "accent",
    effect: options.effect,
    locked: false,
  };
}

export function image(
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    src?: string | null;
    mask?: ImageElement["mask"];
    fit?: ImageElement["fit"];
    focalX?: number;
    focalY?: number;
    radius?: number;
    opacity?: number;
    id?: string;
    locked?: boolean;
  } = {},
): ImageElement {
  return {
    ...base(x, y, width, height),
    id: options.id ?? nextId("image"),
    type: "image",
    src: options.src ?? null,
    focalX: options.focalX ?? 0.5,
    focalY: options.focalY ?? 0.5,
    fit: options.fit ?? "cover",
    mask: options.mask ?? "none",
    radius: options.radius,
    opacity: options.opacity ?? 1,
    locked: options.locked ?? false,
  };
}

/** Fills the board with the palette's ground. Every template starts with one. */
export function ground(role: ColorRole = "ground", size = CANVAS_SIZES.invitation): ShapeElement {
  return shape("rect", 0, 0, size.width, size.height, {
    fill: role,
    locked: true,
    id: "ground",
  });
}

/** Assigns paint order from array order, which is how the files read. */
export function stack(elements: DesignElement[]): DesignElement[] {
  return elements.map((element, index) => ({ ...element, zIndex: index }));
}
