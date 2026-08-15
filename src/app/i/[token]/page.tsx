import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, MessageCircle, Phone, Shirt } from "lucide-react";
import { designOf, hostHeadline, monogramFor } from "@/domain/private-event";
import { displayTypeStyle, resolveTheme } from "@/domain/private-design";
import { getContainer } from "@/server/container";
import { Ecard } from "@/components/private/ecard";
import { GiftRegistry } from "@/components/private/gift-registry";
import { RsvpForm } from "@/components/private/rsvp-form";
import { formatDate, formatEventWindow, formatTime } from "@/lib/format";

/**
 * The private invitation microsite.
 *
 * Reached only by holding a valid invitation token. It deliberately does not
 * use the Bookit chrome — no header, no footer, no branding above the fold —
 * because to the guest this is the hosts' page, not ours.
 */

export const dynamic = "force-dynamic";

/** Never let a private invitation reach a search index or a link preview. */
export const metadata: Metadata = {
  title: "You're invited",
  robots: { index: false, follow: false, nocache: true },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getContainer().privateEvents.resolveInvite(token);

  // An unknown, revoked or non-private token is a plain 404. We never confirm
  // whether the event exists.
  if (!context) notFound();

  const { invite, event, venue, page, booking, gifts, myClaims, messages } = context;
  const design = designOf(page);
  const theme = resolveTheme(design);
  const cardTheme = page.ecard.themeId
    ? resolveTheme({ ...design, paletteId: page.ecard.themeId })
    : theme;
  const headline = hostHeadline(page);

  // The composition the host chose, and whether it can show their photograph.
  const layout = theme.heroLayout.id;
  const cover = theme.heroLayout.usesCover ? page.coverImageUrl : null;
  // Only the full-bleed arrangement puts type over the image, so only it needs
  // the light-on-dark treatment.
  const onPhoto = layout === "OVERLAY" && Boolean(cover);

  const sectionTitle = {
    ...displayTypeStyle(theme.fonts),
    fontSize: 30,
    margin: "0 0 20px",
    color: theme.ink,
  } as const;

  return (
    <div
      style={{
        background: theme.pageBackground,
        color: theme.ink,
        fontFamily: theme.bodyFont,
        minHeight: "100vh",
      }}
    >
      {/* Cover */}
      <header style={{ position: "relative" }}>
        {cover ? (
          <div
            style={{
              position: "relative",
              // OVERLAY runs the photograph tall so the names can sit inside
              // it; the other arrangements keep it to a band above the type.
              height: onPhoto ? "min(66vh, 540px)" : "min(42vh, 360px)",
              margin: layout === "FRAMED" ? "28px clamp(16px, 5vw, 56px) 0" : undefined,
              borderRadius: layout === "FRAMED" ? 10 : 0,
              overflow: layout === "FRAMED" ? "hidden" : undefined,
              border: layout === "FRAMED" ? `1px solid ${theme.accent}55` : undefined,
            }}
          >
            <Image
              src={cover}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            {/* The headline sits over the lower third, so that band is darkened
                hard — a gradient that fades to the page background would leave
                white text on cream and unreadable. Only OVERLAY needs it; the
                other arrangements keep the type off the photograph entirely. */}
            {onPhoto ? (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, rgba(12,10,8,0.25) 0%, rgba(12,10,8,0.35) 42%, rgba(12,10,8,0.78) 100%)",
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            maxWidth: 640,
            margin: onPhoto ? "-210px auto 0" : "28px auto 0",
            padding: "0 20px 48px",
            position: "relative",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: onPhoto ? "#FFFFFFD9" : theme.inkSoft,
              marginBottom: 14,
            }}
          >
            {page.eyebrow}
          </p>
          <h1
            style={{
              ...displayTypeStyle(theme.fonts),
              fontSize: "clamp(38px, 10vw, 62px)",
              lineHeight: 1.05,
              margin: 0,
              color: onPhoto ? "#FFFFFF" : theme.ink,
              textShadow: onPhoto ? "0 2px 24px rgba(0,0,0,0.4)" : undefined,
            }}
          >
            {headline}
          </h1>
          {page.tagline ? (
            <p
              style={{
                margin: "18px auto 0",
                maxWidth: "34em",
                fontSize: 16,
                lineHeight: 1.7,
                color: onPhoto ? "#FFFFFFE0" : theme.inkSoft,
                textShadow: onPhoto ? "0 1px 12px rgba(0,0,0,0.5)" : undefined,
              }}
            >
              {page.tagline}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 28,
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 20,
              padding: "16px 26px",
              borderRadius: 14,
              background: theme.surface,
              border: `1px solid ${theme.accent}2E`,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <CalendarDays size={16} style={{ color: theme.accent }} aria-hidden="true" />
              {formatDate(event.startsAt)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Clock size={16} style={{ color: theme.accent }} aria-hidden="true" />
              {formatTime(event.startsAt)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <MapPin size={16} style={{ color: theme.accent }} aria-hidden="true" />
              {venue.name}
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 80px" }}>
        {/* E-card */}
        <section style={{ marginBottom: 56 }}>
          <Ecard
            design={page.ecard}
            theme={cardTheme}
            monogram={monogramFor(page)}
            hostNames={headline}
            startsAt={event.startsAt}
            venueName={venue.name}
            venueCity={venue.city}
          />
        </section>

        {/* RSVP */}
        <section id="rsvp" style={{ marginBottom: 56 }}>
          <h2 style={sectionTitle}>RSVP</h2>
          {context.rsvpClosed ? (
            <div
              style={{
                padding: 28,
                borderRadius: 14,
                background: theme.surface,
                border: `1px solid ${theme.accent}2E`,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 15, color: theme.inkSoft, margin: 0 }}>
                RSVPs closed on {formatDate(page.rsvp.deadline!)}. If your plans have changed,
                please call {page.contactName ?? "the hosts"}
                {page.contactPhone ? ` on ${page.contactPhone}` : ""}.
              </p>
            </div>
          ) : (
            <div
              style={{
                padding: 26,
                borderRadius: 16,
                background: theme.surface,
                border: `1px solid ${theme.accent}2E`,
              }}
            >
              {page.rsvp.deadline ? (
                <p style={{ fontSize: 13, color: theme.inkSoft, margin: "0 0 18px" }}>
                  Kindly respond by {formatDate(page.rsvp.deadline)}.
                </p>
              ) : null}
              <RsvpForm
                token={token}
                theme={theme}
                settings={page.rsvp}
                maxGuests={invite.maxGuests}
                inviteeName={invite.inviteeName}
                current={
                  booking
                    ? {
                        attending:
                          booking.status !== "DECLINED" && booking.status !== "CANCELLED",
                        guestCount: booking.guestCount,
                        mealChoice: booking.mealChoice,
                      }
                    : null
                }
                confirmationMessage={page.confirmationMessage}
              />
              {context.confirmedGuests !== null ? (
                <p
                  style={{
                    marginTop: 18,
                    fontSize: 13,
                    textAlign: "center",
                    color: theme.inkSoft,
                  }}
                >
                  {context.confirmedGuests} guests have confirmed so far.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Story */}
        {page.story ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Our story</h2>
            <div style={{ fontSize: 16, lineHeight: 1.8, color: theme.inkSoft }}>
              {page.story.split("\n\n").map((paragraph, index) => (
                <p key={index} style={{ margin: index === 0 ? 0 : "16px 0 0" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {/* Hosts */}
        {page.hosts.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>The hosts</h2>
            <ul
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: page.hosts.length > 1 ? "1fr 1fr" : "1fr",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {page.hosts.map((host) => (
                <li
                  key={host.id}
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    background: theme.surface,
                    border: `1px solid ${theme.accent}2E`,
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: theme.accent,
                      margin: 0,
                    }}
                  >
                    {host.role}
                  </p>
                  <p
                    style={{
                      fontFamily: theme.displayFont,
                      fontSize: 24,
                      margin: "8px 0 0",
                      color: theme.ink,
                    }}
                  >
                    {host.name}
                  </p>
                  {host.bio ? (
                    <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: theme.inkSoft }}>
                      {host.bio}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Programme */}
        {page.programme.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>The day</h2>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {page.programme.map((item, index) => (
                <li key={item.id} style={{ display: "flex", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 9,
                        height: 9,
                        marginTop: 7,
                        borderRadius: "50%",
                        background: theme.accent,
                      }}
                    />
                    {index < page.programme.length - 1 ? (
                      <span
                        aria-hidden="true"
                        style={{ width: 1, flex: 1, background: `${theme.accent}44` }}
                      />
                    ) : null}
                  </div>
                  <div style={{ paddingBottom: 26 }}>
                    <p
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: theme.accent,
                        margin: 0,
                      }}
                    >
                      {formatTime(item.time)}
                    </p>
                    <p
                      style={{
                        fontFamily: theme.displayFont,
                        fontSize: 20,
                        margin: "4px 0 0",
                        color: theme.ink,
                      }}
                    >
                      {item.title}
                    </p>
                    {item.description ? (
                      <p style={{ marginTop: 5, fontSize: 14, lineHeight: 1.6, color: theme.inkSoft }}>
                        {item.description}
                      </p>
                    ) : null}
                    {item.location ? (
                      <p style={{ marginTop: 4, fontSize: 13, color: theme.inkSoft }}>
                        {item.location}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Dress code */}
        {page.dressCode ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Dress code</h2>
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: 20,
                borderRadius: 14,
                background: theme.accentSoft,
              }}
            >
              <Shirt size={20} style={{ color: theme.accent, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: theme.ink }}>
                  {page.dressCode}
                </p>
                {page.dressCodeNote ? (
                  <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: theme.inkSoft }}>
                    {page.dressCodeNote}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Getting there */}
        {page.travel.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Getting there</h2>
            <p style={{ fontSize: 14, color: theme.inkSoft, margin: "0 0 18px" }}>
              {venue.name} · {venue.addressLine}
            </p>
            <ul style={{ display: "grid", gap: 14, listStyle: "none", padding: 0, margin: 0 }}>
              {page.travel.map((note) => (
                <li
                  key={note.id}
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    background: theme.surface,
                    border: `1px solid ${theme.accent}2E`,
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: theme.ink }}>
                    {note.title}
                  </p>
                  <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.65, color: theme.inkSoft }}>
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Gift registry */}
        {page.giftRegistryEnabled && gifts.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Gift registry</h2>
            <GiftRegistry
              token={token}
              theme={theme}
              gifts={gifts}
              myClaims={myClaims}
              note={page.giftRegistryNote}
            />
          </section>
        ) : null}

        {/* FAQ */}
        {page.faq.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Questions</h2>
            <dl style={{ margin: 0 }}>
              {page.faq.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "18px 0",
                    borderBottom: `1px solid ${theme.accent}22`,
                  }}
                >
                  <dt style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>
                    {item.question}
                  </dt>
                  <dd
                    style={{
                      margin: "6px 0 0",
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: theme.inkSoft,
                    }}
                  >
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* Message wall */}
        {page.messageWallEnabled && messages.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <h2 style={sectionTitle}>Notes from guests</h2>
            <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
              {messages.map((message) => (
                <li
                  key={message.id}
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    background: theme.surface,
                    border: `1px solid ${theme.accent}2E`,
                  }}
                >
                  <p style={{ fontSize: 15, lineHeight: 1.65, margin: 0, color: theme.ink }}>
                    &ldquo;{message.body}&rdquo;
                  </p>
                  <p style={{ marginTop: 8, fontSize: 13, color: theme.accent }}>
                    — {message.authorName}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Contact + hashtag */}
        <footer style={{ textAlign: "center", paddingTop: 32, borderTop: `1px solid ${theme.accent}22` }}>
          {page.hashtag ? (
            <p
              style={{
                fontFamily: theme.displayFont,
                fontSize: 24,
                margin: "0 0 18px",
                color: theme.accent,
              }}
            >
              {page.hashtag}
            </p>
          ) : null}

          {page.contactName ? (
            <p
              style={{
                fontSize: 14,
                color: theme.inkSoft,
                display: "flex",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <MessageCircle size={15} style={{ color: theme.accent }} aria-hidden="true" />
              Questions? Contact {page.contactName}
              {page.contactPhone ? (
                <a
                  href={`tel:${page.contactPhone.replace(/\s/g, "")}`}
                  style={{
                    color: theme.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Phone size={14} aria-hidden="true" />
                  {page.contactPhone}
                </a>
              ) : null}
            </p>
          ) : null}

          <p style={{ marginTop: 26, fontSize: 12, color: theme.inkSoft, opacity: 0.7 }}>
            {formatEventWindow(event.startsAt, event.endsAt)}
          </p>
          <p style={{ marginTop: 12, fontSize: 11, color: theme.inkSoft, opacity: 0.55 }}>
            A private invitation · not listed publicly
          </p>
        </footer>
      </main>
    </div>
  );
}
