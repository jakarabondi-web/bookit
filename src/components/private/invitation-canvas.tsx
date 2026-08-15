import * as React from "react";
import { displayTypeStyle, type ResolvedTheme } from "@/domain/private-design";
import type { InvitationTemplate } from "@/domain/design/templates";
import { BorderOverlay, Plate } from "./border-overlay";

/**
 * Draws an invitation from a template.
 *
 * One renderer for the whole catalogue, because the designs differ in
 * composition rather than in kind: the same handful of content — eyebrow,
 * names, date, place, note, photograph — arranged, framed and set differently.
 * Keeping it one component is what stops the hundredth template being the
 * hundredth near-copy of a layout file.
 *
 * Everything scales from `scale`, so the same design draws as a 130px gallery
 * tile, a 560px e-card and a full-width hero without a second set of numbers to
 * keep in sync.
 */

export interface InvitationContent {
  eyebrow: string;
  names: string;
  monogram: string;
  dateLine: string;
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  dateWeekday: string;
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
  /** Thumbnail mode: drops the long note, which is a smudge below ~0.5. */
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
  const px = (value: number) => value * scale;
  const accent = theme.accent;
  const border = theme.border;

  const photoPlacement = content.photoUrl ? template.photo : "NONE";
  const showPhoto = photoPlacement !== "NONE";

  // The optical size correction from the type pairing — a script at 42px reads
  // far smaller than a Didone at 42px.
  const nameSize = px(BASE_NAME_SIZE * template.nameScale * (theme.fonts.sizeAdjust ?? 1));

  const nameStyle: React.CSSProperties = {
    ...displayTypeStyle(theme.fonts),
    fontSize: nameSize,
    lineHeight: template.nameSetting === "STACKED_PLAIN" ? 0.96 : 1.08,
    margin: 0,
    color: theme.ink,
    ...(template.nameUppercase ? { textTransform: "uppercase" as const } : {}),
    ...(template.nameTracking ? { letterSpacing: template.nameTracking } : {}),
  };

  const names = <Names template={template} content={content} style={nameStyle} theme={theme} />;
  const eyebrow = <Eyebrow template={template} theme={theme} content={content} px={px} />;
  const divider = <Divider kind={template.divider} accent={accent} px={px} />;
  const date = <DateBlock template={template} theme={theme} content={content} px={px} />;

  const details = (
    <p style={{ margin: 0, fontSize: px(12.5), lineHeight: 1.6, color: theme.inkSoft }}>
      {content.timeLine} · {content.placeLine}
    </p>
  );

  const note =
    content.note && !compact ? (
      <p
        style={{
          margin: 0,
          fontSize: px(12),
          lineHeight: 1.65,
          color: theme.inkSoft,
          maxWidth: "32em",
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

  const stack = (children: React.ReactNode, align: "center" | "left" = "center") => (
    <div
      style={{
        padding: `${px(38)}px ${px(30)}px`,
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        gap: px(15),
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {children}
    </div>
  );

  /* ------------------------------------------------------ compositions -- */

  let body: React.ReactNode;

  switch (template.composition) {
    case "ASYMMETRIC":
      body = (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: photoPlacement === "SIDE" ? "1.1fr 0.9fr" : "1fr",
            alignItems: "stretch",
            height: "100%",
          }}
        >
          {stack(
            <>
              {eyebrow}
              {names}
              {date}
              {details}
              {note}
            </>,
            "left",
          )}
          {photoPlacement === "SIDE" ? <div style={{ position: "relative" }}>{photo}</div> : null}
        </div>
      );
      break;

    case "SPLIT": {
      const [left, right] = splitNames(content.names);
      body = stack(
        <>
          {eyebrow}
          <Monogram style={template.monogram} text={content.monogram} theme={theme} px={px} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: px(16),
              width: "100%",
            }}
          >
            <span style={{ ...nameStyle, textAlign: "right" }}>{left}</span>
            <span
              aria-hidden="true"
              style={{ width: 1, height: nameSize * 1.4, background: `${accent}66`, justifySelf: "center" }}
            />
            <span style={{ ...nameStyle, textAlign: "left" }}>{right}</span>
          </div>
          {date}
          {details}
          {note}
        </>,
      );
      break;
    }

    case "ARCH":
      body = stack(
        <>
          {photoPlacement === "ARCH" ? (
            <div
              style={{
                width: "66%",
                aspectRatio: "4 / 5",
                minHeight: 0,
                flexShrink: 1,
                borderRadius: `${px(999)}px ${px(999)}px ${px(6)}px ${px(6)}px`,
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
        </>,
      );
      break;

    case "POSTER":
      body = (
        <div
          style={{
            padding: `${px(32)}px ${px(26)}px`,
            display: "flex",
            flexDirection: "column",
            gap: px(14),
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: px(12) }}>
            {eyebrow}
            {names}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: px(12) }}>
            <span
              aria-hidden="true"
              style={{ display: "block", height: px(5), width: "100%", background: accent }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: px(14), alignItems: "baseline" }}>
              {date}
              {details}
            </div>
            {note}
          </div>
        </div>
      );
      break;

    case "STACKED_RULES":
      body = stack(
        <>
          {eyebrow}
          <span aria-hidden="true" style={{ width: "100%", height: 1, background: `${accent}55` }} />
          {names}
          <span aria-hidden="true" style={{ width: "100%", height: 1, background: `${accent}55` }} />
          {date}
          {details}
          {note}
        </>,
        "left",
      );
      break;

    case "PLATE":
      body = (
        <div style={{ position: "relative", padding: px(22), height: "100%" }}>
          {border.plate ? (
            <Plate spec={border.plate} accent={accent} />
          ) : null}
          <div style={{ position: "relative", height: "100%" }}>
            {stack(
              <>
                {eyebrow}
                <Monogram style={template.monogram} text={content.monogram} theme={theme} px={px} />
                {names}
                {divider}
                {date}
                {details}
                {note}
              </>,
            )}
          </div>
        </div>
      );
      break;

    case "CORNER":
      body = stack(
        <>
          {eyebrow}
          {names}
          {date}
          {details}
          {note}
        </>,
        "left",
      );
      break;

    case "BANDED":
    case "CENTRED":
    default:
      body = stack(
        <>
          <Monogram style={template.monogram} text={content.monogram} theme={theme} px={px} />
          {eyebrow}
          {names}
          {divider}
          {date}
          {details}
          {note}
        </>,
      );
  }

  /* --------------------------------------------------------- assembly -- */

  const fullBleed = photoPlacement === "FULL_BLEED";
  const topPhoto = photoPlacement === "TOP";

  return (
    <div
      className={className}
      style={{
        background: theme.pageBackground,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {fullBleed ? (
        <>
          <span style={{ position: "absolute", inset: 0 }}>{photo}</span>
          {/* Type over a photograph needs its own ground to stay readable. */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(10,9,8,0.30) 0%, rgba(10,9,8,0.52) 55%, rgba(10,9,8,0.72) 100%)",
            }}
          />
        </>
      ) : null}

      {topPhoto ? (
        <div style={{ height: px(150), position: "relative", flexShrink: 0 }}>{photo}</div>
      ) : null}

      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent:
            template.composition === "ASYMMETRIC" || template.composition === "POSTER"
              ? "stretch"
              : "center",
          // Over a photograph the palette's ink would vanish; force light type.
          color: fullBleed ? "#FFFFFF" : undefined,
        }}
      >
        <FullBleedTypeColour active={fullBleed}>{body}</FullBleedTypeColour>
      </div>

      <BorderOverlay border={border} accent={fullBleed ? "#FFFFFF" : accent} scale={scale} />
    </div>
  );
}

/**
 * Over a full-bleed photograph every colour in the palette is wrong, so the
 * type is forced light rather than each element being asked to decide.
 */
function FullBleedTypeColour({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <div
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--forced" as any]: "#FFFFFF",
        color: "#FFFFFF",
        textShadow: "0 1px 18px rgba(0,0,0,0.45)",
      }}
    >
      <span style={{ display: "contents" }}>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ bits -- */

function Eyebrow({
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
  if (template.eyebrow === "HIDDEN") return null;

  if (template.eyebrow === "SMALL_ITALIC") {
    return (
      <p
        style={{
          margin: 0,
          fontFamily: theme.fonts.displayFont,
          fontStyle: "italic",
          fontSize: px(15),
          color: theme.inkSoft,
        }}
      >
        {content.eyebrow}
      </p>
    );
  }

  if (template.eyebrow === "RULED") {
    return (
      <p
        style={{
          margin: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: px(10),
          fontSize: px(10),
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: theme.inkSoft,
        }}
      >
        {content.eyebrow}
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: `${theme.accent}55` }} />
      </p>
    );
  }

  return (
    <p
      style={{
        margin: 0,
        fontSize: px(10),
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: theme.inkSoft,
      }}
    >
      {content.eyebrow}
    </p>
  );
}

function Names({
  template,
  content,
  style,
  theme,
}: {
  template: InvitationTemplate;
  content: InvitationContent;
  style: React.CSSProperties;
  theme: ResolvedTheme;
}) {
  const [left, right] = splitNames(content.names);

  if (template.nameSetting === "INITIALS_LARGE") {
    return (
      <p style={{ ...style, fontSize: Number(style.fontSize) * 1.9, lineHeight: 1 }}>
        {content.monogram}
      </p>
    );
  }

  if (template.nameSetting === "STACKED_AMPERSAND") {
    return (
      <p style={{ ...style, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span>{left}</span>
        <span
          style={{
            fontSize: Number(style.fontSize) * 0.62,
            color: theme.accent,
            lineHeight: 1.35,
            fontStyle: "italic",
            textTransform: "none",
          }}
        >
          &amp;
        </span>
        <span>{right}</span>
      </p>
    );
  }

  if (template.nameSetting === "STACKED_PLAIN") {
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

/** Splits "Wanjiru & Kevin" into its halves, tolerating any connector. */
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

  const size = px(60);
  const shared: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: theme.fonts.displayFont,
    fontSize: px(16),
    letterSpacing: "0.04em",
    color: theme.accent,
    flexShrink: 0,
  };

  if (style === "PLAIN_INITIALS") {
    return <span style={{ ...shared, letterSpacing: "0.24em" }}>{text}</span>;
  }

  if (style === "SHIELD") {
    return (
      <span style={{ ...shared, position: "relative", width: size, height: size * 1.15 }}>
        <svg
          viewBox="0 0 100 115"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <path
            d="M50 2 L96 16 L96 62 C96 90 74 106 50 113 C26 106 4 90 4 62 L4 16 Z"
            fill="none"
            stroke={theme.accent}
            strokeWidth="3"
          />
        </svg>
        <span style={{ position: "relative" }}>{text}</span>
      </span>
    );
  }

  return (
    <span
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

  if (kind === "ORNAMENT") {
    // A printer's fleuron: two answering curves around a centre point.
    return (
      <svg width={px(56)} height={px(14)} viewBox="0 0 112 28" aria-hidden="true">
        <g fill="none" stroke={accent} strokeWidth="2" opacity="0.8">
          <path d="M2 14 C20 14 26 4 38 4 C48 4 52 12 44 16 C38 19 32 14 40 10" />
          <path d="M110 14 C92 14 86 4 74 4 C64 4 60 12 68 16 C74 19 80 14 72 10" />
        </g>
        <circle cx="56" cy="14" r="3" fill={accent} />
      </svg>
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
          borderRadius: px(3),
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

  if (template.dateStyle === "STACKED") {
    return (
      <p
        style={{
          margin: 0,
          fontSize: px(11),
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          lineHeight: 1.9,
          color: theme.inkSoft,
        }}
      >
        {content.dateWeekday}
        <br />
        {content.dateDay} {content.dateMonth} {content.dateYear}
      </p>
    );
  }

  if (template.dateStyle === "RULED") {
    return (
      <p
        style={{
          margin: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: px(10),
          fontSize: px(12),
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: theme.inkSoft,
        }}
      >
        {content.dateDay} {content.dateMonth} {content.dateYear}
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: `${theme.accent}44` }} />
      </p>
    );
  }

  return (
    <p style={{ ...displayTypeStyle(theme.fonts), margin: 0, fontSize: px(19), color: theme.ink }}>
      {content.dateLine}
    </p>
  );
}
