import Image from "next/image";
import type { EcardDesign, PrivateTheme } from "@/domain/private-event";
import { formatDate, formatTime } from "@/lib/format";

/**
 * The e-card.
 *
 * Rendered from the host's design settings rather than uploaded as an image, so
 * it stays sharp at any size, reflows on a phone, is readable by a screen
 * reader, and can be regenerated the moment a detail changes.
 */

export interface EcardProps {
  design: EcardDesign;
  theme: PrivateTheme;
  monogram: string;
  hostNames: string;
  startsAt: string;
  venueName: string;
  venueCity: string;
  className?: string;
}

export function Ecard({
  design,
  theme,
  monogram,
  hostNames,
  startsAt,
  venueName,
  venueCity,
  className,
}: EcardProps) {
  const frame =
    design.layout === "BORDERED"
      ? { padding: "10px", border: `1px solid ${theme.accent}` }
      : undefined;

  return (
    <figure
      className={className}
      style={{
        background: theme.surface,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 18px 48px -18px rgb(0 0 0 / 0.28)",
      }}
    >
      <div style={frame}>
        <div
          style={{
            border:
              design.layout === "BORDERED" ? `1px solid ${theme.accent}66` : "none",
            padding: design.layout === "MINIMAL" ? "40px 28px" : "44px 32px",
            textAlign: "center",
          }}
        >
          {design.layout === "PHOTO" && design.photoUrl ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3 / 2",
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 28,
              }}
            >
              <Image src={design.photoUrl} alt="" fill sizes="480px" style={{ objectFit: "cover" }} />
            </div>
          ) : null}

          {design.layout === "MONOGRAM" ? (
            <div
              aria-hidden="true"
              style={{
                width: 76,
                height: 76,
                margin: "0 auto 24px",
                borderRadius: "50%",
                border: `1px solid ${theme.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: theme.displayFont,
                fontSize: 22,
                letterSpacing: "0.04em",
                color: theme.accent,
              }}
            >
              {monogram}
            </div>
          ) : null}

          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.inkSoft,
              marginBottom: 18,
            }}
          >
            {design.eyebrow}
          </p>

          <p
            style={{
              fontFamily: theme.displayFont,
              fontSize: "clamp(30px, 7vw, 44px)",
              lineHeight: 1.1,
              margin: 0,
              color: theme.ink,
            }}
          >
            {hostNames}
          </p>

          <p
            style={{
              margin: "18px auto 0",
              maxWidth: "26em",
              fontSize: 14,
              lineHeight: 1.65,
              color: theme.inkSoft,
            }}
          >
            {design.invitationLine}
          </p>

          {/* Rule */}
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 1,
              background: theme.accent,
              margin: "26px auto",
              opacity: 0.6,
            }}
          />

          <p
            style={{
              fontFamily: theme.displayFont,
              fontSize: 19,
              margin: 0,
              color: theme.ink,
            }}
          >
            {formatDate(startsAt)}
          </p>
          <p style={{ marginTop: 6, fontSize: 13, color: theme.inkSoft }}>
            {formatTime(startsAt)} · {venueName}, {venueCity}
          </p>

          {design.footnote ? (
            <p
              style={{
                marginTop: 24,
                fontSize: 12,
                letterSpacing: "0.06em",
                color: theme.inkSoft,
                fontStyle: "italic",
              }}
            >
              {design.footnote}
            </p>
          ) : null}
        </div>
      </div>
    </figure>
  );
}
