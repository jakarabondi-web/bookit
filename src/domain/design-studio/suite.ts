import {
  DEFAULT_MENU,
  DEFAULT_PROGRAMME,
  type BindingContext,
} from "./bindings";
import { roleOf } from "./semantics";
import {
  CANVAS_SIZES,
  type BookitTemplate,
  type CanvasSizeName,
  type ColorRole,
  type DesignElement,
  type DividerElement,
  type FontRole,
  type MaterialEffect,
  type MonogramElement,
  type PatternElement,
  type ShapeElement,
  type SuitePiece,
  type SuitePieceKind,
  type TextAlign,
  type TextElement,
  type VectorElement,
} from "./types";

/**
 * The rest of the stationery.
 *
 * A wedding is not one card. It is a save the date in March, a details card in
 * the envelope, a programme in the hand, a menu on the table, a place card at
 * every seat, a sign at the door and a thank you in July — and the thing that
 * makes it read as one wedding is that all of them were set by the same
 * designer on the same day.
 *
 * That is the argument for deriving them rather than drawing them. The suite is
 * not twelve templates × ten hand-composed pieces; it is one reading of the
 * invitation's grammar — its margins, its type scale, its frame, its ornament,
 * how it aligns — replayed at nine other sizes. Which means the suite follows
 * the design: change the type in the studio and the menu changes with it, ask
 * for gold foil and the welcome sign is foiled too. Nothing can fall out of
 * sync, because there is only one design.
 *
 * Sizes are physical. The board is 144 units to the inch, so a 46-unit name is
 * a third of an inch on the invitation and a third of an inch on the place
 * card. Each piece therefore sets its own type sizes rather than scaling the
 * invitation's, because a name on a place card should be smaller in the hand,
 * not merely smaller in proportion.
 */

/* -------------------------------------------------------------------------- */
/* Reading the invitation                                                      */
/* -------------------------------------------------------------------------- */

interface TextStyle {
  fontRole: FontRole;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: number;
  lineHeight: number;
  uppercase: boolean;
  colorRole: ColorRole;
  effect?: MaterialEffect;
}

interface FrameSpec {
  /** Inset as a fraction of the board, so a frame keeps its proportions. */
  inset: number;
  strokeRole: ColorRole;
  strokeWidth: number;
  opacity: number;
  radius?: number;
}

export interface DesignSignature {
  margin: number;
  align: TextAlign;
  names: TextStyle;
  heading: TextStyle;
  meta: TextStyle;
  body: TextStyle;
  frames: FrameSpec[];
  pattern: PatternElement | null;
  divider: DividerElement | null;
  monogram: MonogramElement | null;
  cornerArt: string | null;
  ornamentArt: string | null;
}

const FALLBACK: Pick<DesignSignature, "names" | "heading" | "meta" | "body"> = {
  names: {
    fontRole: "display",
    fontSize: 46,
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: 0.02,
    lineHeight: 1.15,
    uppercase: false,
    colorRole: "ink",
  },
  heading: {
    fontRole: "display",
    fontSize: 22,
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: 0.04,
    lineHeight: 1.3,
    uppercase: false,
    colorRole: "ink",
  },
  meta: {
    fontRole: "body",
    fontSize: 11,
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: 0.24,
    lineHeight: 1.4,
    uppercase: true,
    colorRole: "muted",
  },
  body: {
    fontRole: "body",
    fontSize: 14,
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: 0.01,
    lineHeight: 1.5,
    uppercase: false,
    colorRole: "ink",
  },
};

function styleOf(element: TextElement): TextStyle {
  return {
    fontRole: element.fontRole,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    fontStyle: element.fontStyle ?? "normal",
    letterSpacing: element.letterSpacing,
    lineHeight: element.lineHeight,
    uppercase: element.uppercase ?? false,
    colorRole: element.colorRole,
    effect: element.effect,
  };
}

/**
 * Reads the design's grammar off the invitation.
 *
 * Deliberately derived rather than declared. A template that has been through
 * the studio no longer matches whatever its author wrote down, so the only
 * honest source for "what does this design look like" is the design.
 */
export function signatureOf(
  template: BookitTemplate,
  elements: DesignElement[],
): DesignSignature {
  const canvas = CANVAS_SIZES[template.size];
  const visible = elements.filter((element) => !element.hidden);
  const texts = visible.filter((element): element is TextElement => element.type === "text");

  const named = (role: string) =>
    texts.filter((element) => roleOf(element, template) === role);

  const names = named("names")[0];
  const heading = named("occasion")[0];
  const smalls = texts
    .filter((element) => element.fontSize <= 16)
    .sort((a, b) => a.fontSize - b.fontSize);
  const meta = smalls.find((element) => element.uppercase) ?? smalls[0];
  const body =
    named("venue")[0] ??
    named("date").find((element) => element.fontSize >= 13) ??
    texts.find((element) => element.fontSize >= 13 && element.fontSize <= 24);

  const frames = visible
    .filter(
      (element): element is ShapeElement =>
        element.type === "shape" &&
        element.shape === "rect" &&
        Boolean(element.strokeRole) &&
        !element.fillRole &&
        element.width > canvas.width * 0.55,
    )
    .map((element) => ({
      inset: element.x / canvas.width,
      strokeRole: element.strokeRole!,
      strokeWidth: element.strokeWidth,
      opacity: element.opacity,
      radius: element.radius,
    }));

  const vectors = visible.filter((element): element is VectorElement => element.type === "vector");

  return {
    margin: template.designRules.minMargin,
    align: names?.align ?? "center",
    names: names ? styleOf(names) : FALLBACK.names,
    heading: heading ? styleOf(heading) : FALLBACK.heading,
    meta: meta ? styleOf(meta) : FALLBACK.meta,
    body: body ? styleOf(body) : FALLBACK.body,
    frames,
    pattern: visible.find((element): element is PatternElement => element.type === "pattern") ?? null,
    divider: visible.find((element): element is DividerElement => element.type === "divider") ?? null,
    monogram:
      visible.find((element): element is MonogramElement => element.type === "monogram") ?? null,
    cornerArt: vectors.find((element) => element.art.startsWith("corner-"))?.art ?? null,
    ornamentArt: vectors.find((element) => !element.art.startsWith("corner-"))?.art ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* A sheet                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One piece under construction.
 *
 * Content flows down the page from a cursor rather than being placed at fixed
 * coordinates, so a menu with four courses and a menu with seven both sit
 * correctly on the sheet without a second layout being written for each.
 */
class Sheet {
  readonly canvas: { width: number; height: number };
  readonly margin: number;
  readonly elements: DesignElement[] = [];
  private sequence = 0;
  /** How many elements the sheet's own chrome took, so content can be moved. */
  private chrome = 0;
  cursor: number;

  constructor(
    private readonly prefix: string,
    readonly size: CanvasSizeName,
    private readonly sig: DesignSignature,
    options: { frame?: boolean; corners?: boolean } = {},
  ) {
    this.canvas = CANVAS_SIZES[size];
    // Margins are physical too: the same fraction of an inch at every size
    // would crowd a place card, so the margin narrows with the sheet.
    const base = Math.round(sig.margin * Math.min(1, this.canvas.width / 720) * 0.92);

    // A framed design's margin has to clear its own frame. Without this the
    // content margin and the frame inset are computed independently, and on a
    // wide sheet the columns of a chart run straight through the rule.
    const deepest =
      options.frame === false || sig.frames.length === 0
        ? 0
        : Math.max(...sig.frames.map((frame) => frame.inset * this.canvas.width));
    this.margin = Math.round(Math.max(base, deepest + base * 0.55));
    this.cursor = this.margin;

    this.push({
      id: "ground",
      type: "shape",
      shape: "rect",
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      rotation: 0,
      opacity: 1,
      locked: true,
      zIndex: 0,
      fillRole: "ground",
      strokeRole: null,
      strokeWidth: 0,
    });

    if (sig.pattern) {
      this.push({
        ...sig.pattern,
        id: this.id("pattern"),
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
        zIndex: this.next(),
      });
    }

    if (options.frame !== false) {
      for (const frame of sig.frames) {
        const inset = Math.max(frame.inset * this.canvas.width, 10);
        this.push({
          id: this.id("frame"),
          type: "shape",
          shape: "rect",
          x: inset,
          y: inset,
          width: this.canvas.width - inset * 2,
          height: this.canvas.height - inset * 2,
          rotation: 0,
          opacity: frame.opacity,
          locked: true,
          zIndex: this.next(),
          fillRole: null,
          strokeRole: frame.strokeRole,
          strokeWidth: frame.strokeWidth,
          radius: frame.radius,
        });
      }
    }

    if (options.corners && sig.cornerArt) {
      const size = Math.round(this.canvas.width * 0.11);
      const inset = this.margin;
      const corners: [number, number, number][] = [
        [inset, inset, 0],
        [this.canvas.width - inset - size, inset, 90],
        [this.canvas.width - inset - size, this.canvas.height - inset - size, 180],
        [inset, this.canvas.height - inset - size, 270],
      ];
      for (const [x, y, rotation] of corners) {
        this.push({
          id: this.id("corner"),
          type: "vector",
          art: sig.cornerArt,
          x,
          y,
          width: size,
          height: size,
          rotation,
          opacity: 0.85,
          locked: true,
          zIndex: this.next(),
          colorRole: "accent",
        });
      }
    }


    this.chrome = this.elements.length;
  }

  private id(kind: string): string {
    this.sequence += 1;
    return `${this.prefix}-${kind}-${this.sequence}`;
  }

  private next(): number {
    return this.elements.length;
  }

  private push(element: DesignElement): void {
    this.elements.push(element);
  }

  get inner(): number {
    return this.canvas.width - this.margin * 2;
  }

  /** Where a left-aligned design starts and a centred one centres. */
  private box(width: number, align: TextAlign): number {
    if (align === "left") return this.margin;
    if (align === "right") return this.canvas.width - this.margin - width;
    return (this.canvas.width - width) / 2;
  }

  text(
    content: string,
    style: TextStyle,
    options: {
      size?: number;
      align?: TextAlign;
      width?: number;
      x?: number;
      y?: number;
      lines?: number;
      colorRole?: ColorRole;
      effect?: MaterialEffect | null;
      gap?: number;
      tracking?: number;
    } = {},
  ): TextElement {
    const fontSize = options.size ?? style.fontSize;
    const align = options.align ?? this.sig.align;
    const width = options.width ?? this.inner;
    const height = fontSize * style.lineHeight * (options.lines ?? 1) + fontSize * 0.35;
    const y = options.y ?? this.cursor;

    const element: TextElement = {
      id: this.id("text"),
      type: "text",
      content,
      x: round(options.x ?? this.box(width, align)),
      y: round(y),
      width: round(width),
      height: round(height),
      rotation: 0,
      opacity: 1,
      locked: false,
      zIndex: this.next(),
      fontRole: style.fontRole,
      fontSize: round(fontSize),
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      lineHeight: style.lineHeight,
      letterSpacing: options.tracking ?? style.letterSpacing,
      align,
      colorRole: options.colorRole ?? style.colorRole,
      uppercase: style.uppercase,
      effect: options.effect === null ? undefined : (options.effect ?? style.effect),
      verticalAlign: "top",
    };

    this.push(element);
    if (options.y === undefined) this.cursor = y + height + (options.gap ?? fontSize * 0.5);
    return element;
  }

  /** The design's own divider, or a plain rule when it has none. */
  rule(options: { width?: number; gap?: number } = {}): void {
    const width = options.width ?? Math.min(this.inner, this.canvas.width * 0.34);
    const style = this.sig.divider?.style ?? "rule";
    this.push({
      id: this.id("divider"),
      type: "divider",
      style,
      x: round(this.box(width, this.sig.align)),
      y: round(this.cursor),
      width: round(width),
      height: 16,
      rotation: 0,
      opacity: this.sig.divider?.opacity ?? 0.8,
      locked: true,
      zIndex: this.next(),
      colorRole: this.sig.divider?.colorRole ?? "accent",
      strokeWidth: this.sig.divider?.strokeWidth ?? 1,
    });
    this.cursor += 16 + (options.gap ?? 10);
  }

  mark(size: number, options: { y?: number } = {}): void {
    const mono = this.sig.monogram;
    if (!mono) return;
    const y = options.y ?? this.cursor;
    this.push({
      ...mono,
      id: this.id("monogram"),
      x: round((this.canvas.width - size) / 2),
      y: round(y),
      width: size,
      height: size,
      fontSize: round(size * 0.3),
      zIndex: this.next(),
      hidden: false,
    });
    if (options.y === undefined) this.cursor = y + size + 18;
  }

  ornament(width: number, options: { gap?: number } = {}): void {
    if (!this.sig.ornamentArt) return this.rule({ gap: options.gap });
    const height = width / 3.2;
    this.push({
      id: this.id("ornament"),
      type: "vector",
      art: this.sig.ornamentArt,
      x: round(this.box(width, this.sig.align)),
      y: round(this.cursor),
      width: round(width),
      height: round(height),
      rotation: 0,
      opacity: 0.9,
      locked: true,
      zIndex: this.next(),
      colorRole: "accent",
    });
    this.cursor += height + (options.gap ?? 12);
  }

  /** Pins content to the bottom margin rather than to the flow. */
  footer(content: string, style: TextStyle, size: number): void {
    const height = size * 1.5;
    this.text(content, style, {
      size,
      y: this.canvas.height - this.margin - height,
      lines: 1,
    });
  }

  /**
   * Centres the content in the space that was left for it.
   *
   * Everything the sheet drew for itself — the ground, the field, the frame,
   * the corner ornaments — is excluded by construction rather than by testing
   * whether an element is locked. Filtering on `locked` was wrong in a way that
   * only showed up on the page: the rule under a heading is locked, so it
   * stayed where it was while the type moved down past it, and the ornament
   * ended up above the words it was meant to sit under.
   */
  centreFrom(from: number, until = this.canvas.height - this.margin): void {
    const placed = this.elements.slice(this.chrome).filter((element) => element.y >= from - 0.01);
    if (placed.length === 0) return;
    const top = Math.min(...placed.map((element) => element.y));
    const bottom = Math.max(...placed.map((element) => element.y + element.height));
    const shift = (until - bottom - (top - from)) / 2;
    if (shift <= 0) return;
    for (const element of placed) element.y = round(element.y + shift);
    this.cursor += shift;
  }

  piece(kind: SuitePieceKind, name: string): SuitePiece {
    return { kind, name, size: this.size, elements: this.elements };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* The pieces                                                                  */
/* -------------------------------------------------------------------------- */

const NAMES_ONE_LINE = "{{couple.firstName}} & {{couple.secondName}}";

function saveTheDate(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("std", "invitation", sig, { corners: true });
  const start = sheet.cursor;

  sheet.text("Save the date", sig.meta, { size: 12, tracking: 0.3, gap: 26 });
  sheet.mark(74);
  sheet.text("{{couple.firstName}}", sig.names, { size: 44, gap: 6 });
  sheet.text("and", sig.heading, { size: 20, colorRole: "accent", gap: 6 });
  sheet.text("{{couple.secondName}}", sig.names, { size: 44, gap: 26 });
  sheet.ornament(180, { gap: 26 });
  sheet.text("{{event.dateLong}}", sig.body, { size: 18, gap: 8 });
  sheet.text("{{event.city}} · {{event.country}}", sig.meta, { size: 11, gap: 0 });

  sheet.centreFrom(start);
  sheet.footer("Invitation to follow", sig.meta, 10);
  return sheet.piece("saveTheDate", "Save the date");
}

function details(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("det", "invitation", sig, { corners: false });
  const start = sheet.cursor;

  sheet.text("Details", sig.meta, { size: 12, tracking: 0.3, gap: 30 });

  const block = (label: string, lines: string[], size = 15) => {
    sheet.text(label, sig.meta, { size: 10, gap: 12 });
    for (const line of lines) sheet.text(line, sig.body, { size, gap: 6 });
    sheet.cursor += 26;
  };

  block("The ceremony", ["{{event.dateLong}}", "{{event.time}}"]);
  block("Where", ["{{event.venue}}", "{{event.address}}", "{{event.city}}, {{event.country}}"]);
  block("Dress", ["{{event.dressCode}}"]);
  block("Reply", ["by {{event.rsvpBy}}", "{{event.rsvpUrl}}"]);

  // Four short blocks on a 5 × 7 sheet leave a lot of paper; the stack sits in
  // the middle of it rather than hanging off the top.
  sheet.centreFrom(start, sheet.canvas.height - sheet.margin * 2.4);
  sheet.footer("{{event.hashtag}}", sig.meta, 10);
  return sheet.piece("details", "Details card");
}

function rsvp(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("rsv", "place", sig, {});
  const qr = 104;
  const pad = sheet.margin + 14;
  const column = sheet.canvas.width - pad * 2 - qr - 22;
  // The text block is set against the code rather than against the top edge, so
  // the two read as one line of information across the card.
  const top = (sheet.canvas.height - 104) / 2;

  sheet.text("Kindly reply", sig.meta, {
    size: 9,
    tracking: 0.28,
    x: pad,
    width: column,
    align: "left",
    y: top,
  });
  sheet.text("by {{event.rsvpBy}}", sig.body, {
    size: 16,
    x: pad,
    width: column,
    align: "left",
    y: top + 20,
  });
  sheet.text("{{event.rsvpUrl}}", sig.meta, {
    size: 8,
    tracking: 0.06,
    x: pad,
    width: column,
    align: "left",
    y: top + 56,
  });
  sheet.text("Scan to open your invitation", sig.meta, {
    size: 7.5,
    tracking: 0.06,
    x: pad,
    width: column,
    align: "left",
    lines: 2,
    y: top + 76,
  });

  sheet.elements.push({
    id: "rsv-qr",
    type: "qr",
    value: "{{guest.url}}",
    x: sheet.canvas.width - pad - qr,
    y: (sheet.canvas.height - qr) / 2,
    width: qr,
    height: qr,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: sheet.elements.length,
    colorRole: "ink",
  });

  return sheet.piece("rsvp", "Reply card");
}

function programme(sig: DesignSignature, data: BindingContext): SuitePiece {
  const sheet = new Sheet("prg", "invitation", sig, { corners: false });
  const rows = data.programme?.length ? data.programme : DEFAULT_PROGRAMME;

  sheet.text("Order of the day", sig.meta, { size: 12, tracking: 0.3, gap: 14 });
  sheet.text(NAMES_ONE_LINE, sig.names, { size: 26, gap: 22 });
  sheet.rule({ gap: 30 });

  // Times run down a ruled column and items sit against them, which is what
  // makes a programme scannable in a low-lit room.
  const timeWidth = 92;
  const gutter = 22;
  for (const row of rows) {
    const y = sheet.cursor;
    sheet.text(row.time, sig.meta, {
      size: 11,
      x: sheet.margin,
      width: timeWidth,
      align: "right",
      y,
    });
    sheet.text(row.item, sig.body, {
      size: 15,
      x: sheet.margin + timeWidth + gutter,
      width: sheet.inner - timeWidth - gutter,
      align: "left",
      y,
    });
    sheet.cursor = y + 34;
  }

  sheet.footer("{{event.venue}} · {{event.city}}", sig.meta, 10);
  return sheet.piece("programme", "Programme");
}

function menu(sig: DesignSignature, data: BindingContext): SuitePiece {
  const sheet = new Sheet("mnu", "invitation", sig, { corners: true });
  const rows = data.menu?.length ? data.menu : DEFAULT_MENU;
  const start = sheet.cursor;

  sheet.text("Menu", sig.meta, { size: 12, tracking: 0.3, gap: 16 });
  sheet.text(NAMES_ONE_LINE, sig.names, { size: 24, gap: 24 });
  sheet.ornament(140, { gap: 30 });

  for (const row of rows) {
    sheet.text(row.course, sig.meta, { size: 9, gap: 8 });
    sheet.text(row.dish, sig.body, { size: 16, lines: 2, gap: 22 });
  }

  sheet.centreFrom(start);
  return sheet.piece("menu", "Menu");
}

function placeCard(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("plc", "place", sig, { frame: false });

  sheet.cursor = sheet.canvas.height * 0.3;
  sheet.text("{{guest.name}}", sig.names, {
    size: 26,
    align: "center",
    x: sheet.margin,
    width: sheet.inner,
    gap: 12,
  });
  sheet.text("Table {{guest.table}}", sig.meta, {
    size: 9,
    align: "center",
    x: sheet.margin,
    width: sheet.inner,
    gap: 0,
  });

  return sheet.piece("placeCard", "Place card");
}

function tableNumber(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("tbl", "place", sig, {});

  sheet.cursor = sheet.canvas.height * 0.2;
  sheet.text("Table", sig.meta, { size: 9, align: "center", x: sheet.margin, width: sheet.inner, gap: 6 });
  sheet.text("{{guest.table}}", sig.names, {
    size: 84,
    align: "center",
    x: sheet.margin,
    width: sheet.inner,
    gap: 0,
  });

  return sheet.piece("tableNumber", "Table number");
}

function welcomeSign(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("wel", "landscape", sig, { corners: true });
  const start = sheet.cursor;

  sheet.text("Welcome to the wedding of", sig.meta, { size: 13, tracking: 0.28, gap: 30 });
  sheet.text(NAMES_ONE_LINE, sig.names, { size: 76, lines: 1, gap: 30 });
  sheet.ornament(260, { gap: 30 });
  sheet.text("{{event.dateLong}} · {{event.venue}}", sig.body, { size: 20, gap: 0 });

  sheet.centreFrom(start);
  return sheet.piece("welcomeSign", "Welcome sign");
}

function seatingChart(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("sea", "landscape", sig, { corners: false });

  sheet.text("Find your table", sig.meta, { size: 12, tracking: 0.3, gap: 14 });
  sheet.text(NAMES_ONE_LINE, sig.names, { size: 30, gap: 26 });
  sheet.rule({ gap: 34 });

  // A published chart is filled from the guest list. What a host is judging
  // here is the grid it prints into: the numeral in the design's display face,
  // the count beneath it, a hairline holding each column.
  const columns = 4;
  const rows = 3;
  const cell = sheet.inner / columns;
  const top = sheet.cursor;
  // The pitch is whatever is left, divided by the rows, so the grid fills the
  // sheet rather than hanging off the top of it.
  const pitch = (sheet.canvas.height - sheet.margin - top) / rows;

  for (let index = 0; index < columns * rows; index += 1) {
    const x = sheet.margin + (index % columns) * cell;
    const y = top + Math.floor(index / columns) * pitch;

    sheet.elements.push({
      id: `sea-rule-${index + 1}`,
      type: "divider",
      style: "rule",
      x: round(x),
      y: round(y),
      width: round(cell - 26),
      height: 16,
      rotation: 0,
      opacity: 0.5,
      locked: true,
      zIndex: sheet.elements.length,
      colorRole: "accent",
      strokeWidth: 1,
    });

    sheet.text(`${index + 1}`, sig.names, {
      size: 34,
      x,
      width: cell - 26,
      align: "left",
      y: y + 22,
    });
    sheet.text("Eight seats", sig.meta, {
      size: 9,
      x,
      width: cell - 26,
      align: "left",
      y: y + 70,
    });
  }

  return sheet.piece("seatingChart", "Seating chart");
}

function thankYou(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("thx", "square", sig, { corners: true });
  const start = sheet.cursor;

  sheet.mark(84);
  sheet.text("Thank you", sig.names, { size: 40, gap: 22 });
  sheet.text(
    "For being with us, and for making the day what it was.",
    sig.body,
    { size: 16, lines: 2, width: sheet.inner * 0.74, gap: 26 },
  );
  sheet.ornament(150, { gap: 24 });
  sheet.text(NAMES_ONE_LINE, sig.meta, { size: 11, gap: 0 });

  sheet.centreFrom(start);
  return sheet.piece("thankYou", "Thank you card");
}

function story(sig: DesignSignature): SuitePiece {
  const sheet = new Sheet("sty", "story", sig, { frame: false });
  const start = sheet.cursor;

  sheet.text("{{event.kind}}", sig.meta, { size: 12, tracking: 0.3, gap: 30 });
  sheet.text("{{couple.firstName}}", sig.names, { size: 52, gap: 8 });
  sheet.text("and", sig.heading, { size: 22, colorRole: "accent", gap: 8 });
  sheet.text("{{couple.secondName}}", sig.names, { size: 52, gap: 30 });
  sheet.ornament(170, { gap: 30 });
  sheet.text("{{event.dateLong}}", sig.body, { size: 18, gap: 8 });
  sheet.text("{{event.venue}} · {{event.city}}", sig.meta, { size: 11, gap: 0 });

  sheet.centreFrom(start);
  sheet.footer("{{event.hashtag}}", sig.meta, 11);
  return sheet.piece("mobile", "Share card");
}

/* -------------------------------------------------------------------------- */
/* The suite                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every piece, in the order a host meets them.
 *
 * A hand-authored piece on the template wins: derivation is the default, not a
 * constraint, and a design that wants its menu composed differently can say so.
 */
export function buildSuite(
  template: BookitTemplate,
  elements: DesignElement[],
  data: BindingContext,
): SuitePiece[] {
  const sig = signatureOf(template, elements);

  const derived: SuitePiece[] = [
    saveTheDate(sig),
    details(sig),
    rsvp(sig),
    programme(sig, data),
    menu(sig, data),
    placeCard(sig),
    tableNumber(sig),
    welcomeSign(sig),
    seatingChart(sig),
    thankYou(sig),
    story(sig),
  ];

  return derived.map(
    (piece) => template.suite.find((authored) => authored.kind === piece.kind) ?? piece,
  );
}

/** What each piece is for, in the language a host would use. */
export const SUITE_NOTES: Partial<Record<SuitePieceKind, string>> = {
  invitation: "The card everything else is set from. Change it and the suite follows.",
  saveTheDate: "Sent first, months ahead. Names, date, city — nothing else to decide yet.",
  details: "Goes in the envelope with the invitation. Everything a guest has to look up.",
  rsvp: "Reply card, with the guest's own link and a code that opens it on their phone.",
  programme: "In the hand during the ceremony. Set to be read in a low-lit room.",
  menu: "On the table. Courses in the design's own type, not the caterer's.",
  placeCard: "One per seat, printed from the guest list with the table already on it.",
  tableNumber: "Read across a room, so the numeral carries and nothing else competes.",
  welcomeSign: "At the door. The first thing a guest sees, in the same hand as the invitation.",
  seatingChart: "Printed from the seating plan once the tables are settled.",
  thankYou: "Sent after. The same identity, months later, which is the point of a suite.",
  mobile: "For WhatsApp and Instagram — the way most Kenyan guests will actually see it.",
};
