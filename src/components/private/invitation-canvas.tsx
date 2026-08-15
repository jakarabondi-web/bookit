import * as React from "react";
import { displayTypeStyle, type ResolvedTheme } from "@/domain/private-design";
import type { InvitationTemplate } from "@/domain/invitation-templates";

/**
 * Draws an invitation from a template.
 *
 * One renderer for all of them, because the templates differ in composition
 * rather than in kind: the same six pieces of content — eyebrow, names, date,
 * place, note, photograph — arranged, framed and set differently. Keeping it
 * one component is what stops the ninth template being the ninth near-copy of
 * a layout file.
 *
 * Everything scales from `scale`, so the same design draws as a 320px preview
 * tile, a 560px e-card and a full-width microsite hero without a second set of
 * numbers to keep in sync.
 */

export interface InvitationContent {
  eyebrow: string;
  /** Already joined the way the headline should read them. */
  names: string;
  /** Two initials for templates that show a monogram. */
  monogram: string;
  dateLine: string;
  /** e.g. "12" — used by the numeral and stamp date settings. */
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  timeLine: string;
  placeLine: string;
  note?: string | null;
  photoUrl?: string | null;
}

export interface InvitationCanvasProps {
  template: InvitationTemplate;
  theme: ResolvedTheme;
  content: InvitationContent;
  /** 1 is the e-card's natural size. */
  scale?: number;
  /**
   * Thumbnail mode: drops the long note. A gallery tile is showing the design,
   * and a paragraph of body copy at 0.4 scale is a grey smudge that pushes the
   * composition out of frame.
   */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const BASE_NAME_SIZE = 42;

export function InvitationCanvas({
  template,
  theme,
  content,
  scale = 1,
  compact = false,
  className,
  style,
}: InvitationCanvasProps) {
  const px = (value: number) => Math.round(value * scale);
  const accent = theme.accent;

  const showPhoto = Boolean(content.photoUrl) && template.photo !== "NONE";
  const motif =
    template.motifStrength === "NONE" ? theme.background : theme.pageBackground;

  const nameStyle: React.CSSProperties = {
    ...displayTypeStyle(theme.fonts),
    fontSize: px(BASE_NAME_SIZE * template.nameScale),
    lineHeight: template.nameSetting === "STACKED_PLAIN" ? 0.98 : 1.08,
    margin: 0,
    color: theme.ink,
    ...(template.nameUppercase ? { textTransform: "uppercase" as const } : {}),
    ...(template.nameTracking ? { letterSpacing: template.nameTracking } : {}),
  };

  const names = <Names template={template} content={content} style={nameStyle} px={px} accent={accent} />;

  const eyebrow =
    template.eyebrow === "HIDDEN" ? null : (
      <p
        style={
          template.eyebrow === "SMALL_ITALIC"
            ? {
                margin: 0,
                fontFamily: theme.fonts.displayFont,
                fontStyle: "italic",
                fontSize: px(15),
                color: theme.inkSoft,
              }
            : {
                margin: 0,
                fontSize: px(10),
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: theme.inkSoft,
              }
        }
      >
        {content.eyebrow}
      </p>
    );

  const divider = <Divider kind={template.divider} accent={accent} px={px} />;

  const date = <DateBlock template={template} theme={theme} content={content} px={px} />;

  const details = (
    <p style={{ margin: 0, fontSize: px(12.5), lineHeight: 1.6, color: theme.inkSoft }}>
      {content.timeLine} · {content.placeLine}
    </p>
  );

  const note = content.note && !compact ? (
    <p
      style={{
        margin: 0,
        fontSize: px(12),
        lineHeight: 1.65,
        color: theme.inkSoft,
        maxWidth: "30em",
      }}
    >
      {content.note}
    </p>
  ) : null;

  const photo = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={content.photoUrl!}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  ) : null;

  /* ------------------------------------------------------ compositions -- */

  let body: React.ReactNode;

  if (template.composition === "ASYMMETRIC") {
    body = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showPhoto && template.photo === "SIDE" ? "1.15fr 0.85fr" : "1fr",
          alignItems: "stretch",
          minHeight: px(320),
        }}
      >
        <div
          style={{
            padding: `${px(38)}px ${px(30)}px`,
            display: "flex",
            flexDirection: "column",
            gap: px(16),
            justifyContent: "center",
            textAlign: "left",
          }}
        >
          {eyebrow}
          {names}
          {date}
          {details}
          {note}
        </div>
        {showPhoto && template.photo === "SIDE" ? (
          <div style={{ position: "relative" }}>{photo}</div>
        ) : null}
      </div>
    );
  } else if (template.composition === "SPLIT") {
    const [left, right] = splitNames(content.names);
    body = (
      <div
        style={{
          padding: `${px(40)}px ${px(30)}px`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: px(18),
          alignItems: "center",
        }}
      >
        {eyebrow}
        <Monogram style={template.monogram} text={content.monogram} theme={theme} px={px} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: px(18),
            width: "100%",
          }}
        >
          <span style={{ ...nameStyle, textAlign: "right" }}>{left}</span>
          <span
            aria-hidden="true"
            style={{ width: 1, height: px(52), background: `${accent}66`, justifySelf: "center" }}
          />
          <span style={{ ...nameStyle, textAlign: "left" }}>{right}</span>
        </div>
        {date}
        {details}
        {note}
      </div>
    );
  } else if (template.composition === "ARCH") {
    body = (
      <div
        style={{
          padding: `${px(28)}px ${px(30)}px ${px(38)}px`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: px(16),
          alignItems: "center",
        }}
      >
        {showPhoto && template.photo === "ARCH" ? (
          <div
            style={{
              width: "68%",
              aspectRatio: "4 / 5",
              minHeight: 0,
              flexShrink: 1,
              // The arch is the whole idea of this one: a window, not a card.
              borderRadius: `${px(999)}px ${px(999)}px ${px(8)}px ${px(8)}px`,
              overflow: "hidden",
              border: `1px solid ${accent}55`,
            }}
          >
            {photo}
          </div>
        ) : null}
        {eyebrow}
        {names}
        {divider}
        {date}
        {details}
        {note}
      </div>
    );
  } else if (template.composition === "POSTER") {
    body = (
      <div
        style={{
          padding: `${px(34)}px ${px(26)}px`,
          display: "flex",
          flexDirection: "column",
          gap: px(14),
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        {eyebrow}
        <div>{names}</div>
        <span
          aria-hidden="true"
          style={{ display: "block", height: px(5), width: "100%", background: accent }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: px(16), alignItems: "baseline" }}>
          {date}
          {details}
        </div>
        {note}
      </div>
    );
  } else if (template.composition === "BANDED") {
    body = (
      <div
        style={{
          padding: `${px(34)}px ${px(30)}px`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: px(16),
          alignItems: "center",
        }}
      >
        {eyebrow}
        {names}
        {date}
        {details}
        {note}
      </div>
    );
  } else {
    // CENTRED
    body = (
      <div
        style={{
          padding: `${px(38)}px ${px(30)}px`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: px(16),
          alignItems: "center",
        }}
      >
        <Monogram style={template.monogram} text={content.monogram} theme={theme} px={px} />
        {eyebrow}
        {names}
        {divider}
        {date}
        {details}
        {note}
      </div>
    );
  }

  /* ------------------------------------------------------------ frames -- */

  const hasTopPhoto = showPhoto && template.photo === "TOP";

  return (
    <div
      className={className}
      style={{
        background: motif,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Photograph above the card, for the compositions that do not place it
          themselves. */}
      {hasTopPhoto ? (
        <div style={{ height: px(150), position: "relative", flexShrink: 0 }}>{photo}</div>
      ) : null}

      {/* The type block takes the remaining height and centres in it, so a
          short invitation sits in the middle of its card rather than stranding
          empty ground beneath it. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent:
            template.composition === "ASYMMETRIC" || template.composition === "POSTER"
              ? "stretch"
              : "center",
        }}
      >
        {template.frame === "TOP_BOTTOM_BAND" ? (
          <>
            <Band theme={theme} px={px} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {body}
            </div>
            <Band theme={theme} px={px} flip />
          </>
        ) : (
          body
        )}
      </div>

      {/* Ornament frames the whole card, not just the type block. */}
      {template.frame === "DOUBLE_RULE" ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: px(12),
            border: `1px solid ${accent}`,
            outline: `1px solid ${accent}`,
            outlineOffset: px(3),
            pointerEvents: "none",
          }}
        />
      ) : null}

      {template.frame === "HAIRLINE" ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: px(14),
            border: `1px solid ${accent}99`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {template.frame === "CORNERS" ? <Corners accent={accent} px={px} /> : null}
    </div>
  );
}
/* ------------------------------------------------------------------ bits -- */

function Names({
  template,
  content,
  style,
  px,
  accent,
}: {
  template: InvitationTemplate;
  content: InvitationContent;
  style: React.CSSProperties;
  px: (value: number) => number;
  accent: string;
}) {
  if (template.nameSetting === "STACKED_AMPERSAND") {
    const [left, right] = splitNames(content.names);
    return (
      <p style={{ ...style, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span>{left}</span>
        <span
          style={{
            fontSize: px(28 * template.nameScale),
            color: accent,
            lineHeight: 1.4,
            fontStyle: "italic",
          }}
        >
          &amp;
        </span>
        <span>{right}</span>
      </p>
    );
  }

  if (template.nameSetting === "STACKED_PLAIN") {
    const [left, right] = splitNames(content.names);
    return (
      <p style={style}>
        {left}
        {right ? (
          <>
            <br />
            {right}
          </>
        ) : null}
      </p>
    );
  }

  return <p style={style}>{content.names}</p>;
}

/** Splits "Wanjiru & Kevin" into its two halves, tolerating any connector. */
function splitNames(names: string): [string, string] {
  const parts = names.split(/\s*(?:&|and|·)\s*/i);
  if (parts.length >= 2) return [parts[0]!, parts.slice(1).join(" & ")];
  return [names, ""];
}

function Monogram({
  style,
  text,
  theme,
  px,
}: {
  style: InvitationTemplate["monogram"];
  text: string;
  theme: ResolvedTheme;
  px: (value: number) => number;
}) {
  if (style === "NONE") return null;

  const size = px(64);
  const shared: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: theme.fonts.displayFont,
    fontSize: px(17),
    letterSpacing: "0.04em",
    color: theme.accent,
  };

  if (style === "PLAIN_INITIALS") {
    return <span style={{ ...shared, letterSpacing: "0.2em" }}>{text}</span>;
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...shared,
        width: size,
        height: size,
        border: `1px solid ${theme.accent}`,
        borderRadius: style === "CIRCLE" ? "50%" : 0,
        transform: style === "DIAMOND" ? "rotate(45deg)" : undefined,
      }}
    >
      <span style={style === "DIAMOND" ? { transform: "rotate(-45deg)" } : undefined}>{text}</span>
    </span>
  );
}

function Divider({
  kind,
  accent,
  px,
}: {
  kind: InvitationTemplate["divider"];
  accent: string;
  px: (value: number) => number;
}) {
  if (kind === "NONE") return null;

  if (kind === "RULE") {
    return (
      <span aria-hidden="true" style={{ width: px(52), height: 1, background: accent, opacity: 0.7 }} />
    );
  }

  if (kind === "DOTS") {
    return (
      <span aria-hidden="true" style={{ display: "flex", gap: px(6) }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{ width: px(4), height: px(4), borderRadius: "50%", background: accent }}
          />
        ))}
      </span>
    );
  }

  // DIAMOND — a rule broken by a lozenge, the engraver's mark.
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: px(10) }}>
      <span style={{ width: px(36), height: 1, background: accent, opacity: 0.6 }} />
      <span style={{ width: px(6), height: px(6), background: accent, transform: "rotate(45deg)" }} />
      <span style={{ width: px(36), height: 1, background: accent, opacity: 0.6 }} />
    </span>
  );
}

function DateBlock({
  template,
  theme,
  content,
  px,
}: {
  template: InvitationTemplate;
  theme: ResolvedTheme;
  content: InvitationContent;
  px: (value: number) => number;
}) {
  if (template.dateStyle === "NUMERAL") {
    return (
      <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: px(10) }}>
        <span
          style={{
            ...displayTypeStyle(theme.fonts),
            fontSize: px(56),
            lineHeight: 0.9,
            color: theme.accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {content.dateDay}
        </span>
        <span
          style={{
            fontSize: px(11),
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.inkSoft,
          }}
        >
          {content.dateMonth}
          <br />
          {content.dateYear}
        </span>
      </p>
    );
  }

  if (template.dateStyle === "STAMP") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: px(8),
          padding: `${px(6)}px ${px(12)}px`,
          border: `1px solid ${theme.accent}66`,
          borderRadius: px(4),
          fontSize: px(11),
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: theme.accent,
        }}
      >
        {content.dateDay} {content.dateMonth} {content.dateYear}
      </span>
    );
  }

  return (
    <p
      style={{
        ...displayTypeStyle(theme.fonts),
        margin: 0,
        fontSize: px(19),
        color: theme.ink,
      }}
    >
      {content.dateLine}
    </p>
  );
}

/** The printed band a kanga carries at its head and foot. */
function Band({
  theme,
  px,
  flip,
}: {
  theme: ResolvedTheme;
  px: (value: number) => number;
  flip?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        height: px(26),
        background: theme.accent,
        opacity: 0.92,
        transform: flip ? "scaleY(-1)" : undefined,
        maskImage:
          "repeating-linear-gradient(90deg, #000 0 14px, transparent 14px 20px)",
        WebkitMaskImage:
          "repeating-linear-gradient(90deg, #000 0 14px, transparent 14px 20px)",
      }}
    />
  );
}

function Corners({ accent, px }: { accent: string; px: (value: number) => number }) {
  const arm = px(22);
  const inset = px(12);
  const common: React.CSSProperties = {
    position: "absolute",
    width: arm,
    height: arm,
    pointerEvents: "none",
  };
  return (
    <span aria-hidden="true">
      <span
        style={{
          ...common,
          top: inset,
          left: inset,
          borderTop: `1px solid ${accent}`,
          borderLeft: `1px solid ${accent}`,
        }}
      />
      <span
        style={{
          ...common,
          top: inset,
          right: inset,
          borderTop: `1px solid ${accent}`,
          borderRight: `1px solid ${accent}`,
        }}
      />
      <span
        style={{
          ...common,
          bottom: inset,
          left: inset,
          borderBottom: `1px solid ${accent}`,
          borderLeft: `1px solid ${accent}`,
        }}
      />
      <span
        style={{
          ...common,
          bottom: inset,
          right: inset,
          borderBottom: `1px solid ${accent}`,
          borderRight: `1px solid ${accent}`,
        }}
      />
    </span>
  );
}
