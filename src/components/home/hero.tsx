import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, Zap } from "lucide-react";
import type { EventSummary } from "@/domain/types";
import { dateBadge, formatPrice, formatTime } from "@/lib/format";
import { cardStatusLabel } from "@/domain/event-type-policy";
import { HeroSearch } from "./hero-search";

/**
 * Homepage hero.
 *
 * Art direction note: the supplied photography is 130px-tall reference crops
 * from the concept board. Stretching one of those across a 1440px hero looks
 * exactly as bad as it sounds, so the composition is built the other way round
 * — a designed gradient canvas carries the full-bleed area, and the photographs
 * appear inside small floating event cards where they render at close to native
 * resolution and stay crisp. A single photo sits behind everything at low
 * opacity and heavy blur, where softness reads as depth of field rather than as
 * a scaling artefact.
 *
 * Swapping in full-resolution photography later is a one-line change per card;
 * nothing about the layout depends on the images being small.
 */

const TRUST = [
  { icon: ShieldCheck, label: "Verified organizers" },
  { icon: Smartphone, label: "Pay with M-PESA" },
  { icon: Zap, label: "Instant tickets" },
] as const;

const STATS = [
  { value: "1,200+", label: "events a year" },
  { value: "48", label: "venues across Kenya" },
  { value: "99.9%", label: "gate scan success" },
] as const;

export function Hero({ spotlight }: { spotlight: EventSummary[] }) {
  const cards = spotlight.slice(0, 3);

  return (
    <section className="page-shell pt-4 lg:pt-6">
      <div className="relative isolate overflow-hidden rounded-hero bg-[#0B1020]">
        {/* Ambient photograph: blurred, low opacity, purely atmospheric. */}
        <Image
          src="/assets/images/hero-banquet.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-35 blur-2xl"
        />

        {/* Designed gradient canvas — this is what actually carries the hero. */}
        <div
          className="absolute inset-0 bg-[radial-gradient(90%_120%_at_8%_10%,rgba(249,115,22,0.30)_0%,transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(70%_90%_at_92%_20%,rgba(251,146,60,0.22)_0%,transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0B1020]/95 via-[#0B1020]/80 to-[#1A1005]/90"
          aria-hidden="true"
        />
        {/* Fine grid, barely visible — gives the flat area some tooth. */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        <div className="relative grid gap-10 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
          {/* Left: copy and search */}
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Kenya&apos;s event platform — tickets, RSVPs and bookings
            </p>

            <h1 className="mt-5 font-display text-[2.5rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              Discover Events.
              <br />
              <span className="bg-gradient-to-r from-primary via-[#fb923c] to-[#fcd34d] bg-clip-text text-transparent">
                Book. Attend. Enjoy.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              From concerts and sports to meetings, weddings, ceremonies and community events —
              find it all on Bookit.
            </p>

            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {TRUST.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-white/70">
                  <item.icon className="size-4 text-primary" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <HeroSearch />
            </div>
          </div>

          {/* Right: floating spotlight cards. Photos render near native size. */}
          {cards.length > 0 ? (
            <div className="relative hidden lg:block" aria-label="Featured events">
              <ul className="flex flex-col gap-3">
                {cards.map((summary, index) => (
                  <li
                    key={summary.event.id}
                    className={
                      index === 1
                        ? "lg:translate-x-8"
                        : index === 2
                          ? "lg:translate-x-3"
                          : undefined
                    }
                  >
                    <SpotlightCard summary={summary} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 px-5 py-6 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-x-10 gap-y-4">
              {STATS.map((stat) => (
                <li key={stat.label}>
                  <p className="font-display text-2xl font-bold tabular text-white">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55">{stat.label}</p>
                </li>
              ))}
            </ul>

            <Link
              href="/organizer/events/new"
              className="group inline-flex items-center gap-2 self-start rounded-pill border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-primary hover:bg-primary/10 sm:self-auto"
            >
              Hosting something? Create an event
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact glass card. The thumbnail is 96px wide — close to the asset's native size. */
function SpotlightCard({ summary }: { summary: EventSummary }) {
  const { event, venue, fromPrice, ticketTypes } = summary;
  const badge = dateBadge(event.startsAt);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex items-center gap-3.5 rounded-card border border-white/15 bg-white/10 p-2.5 backdrop-blur-md transition-colors hover:border-primary/50 hover:bg-white/15"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-card-sm">
        <Image
          src={event.cardImage}
          alt=""
          fill
          sizes="80px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {badge.day} {badge.month}
          <span className="text-white/40">·</span>
          <span className="font-medium normal-case tracking-normal text-white/60">
            {formatTime(event.startsAt)}
          </span>
        </p>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-white">{event.title}</p>
        <p className="line-clamp-1 text-xs text-white/55">
          {venue.name} · {venue.city}
        </p>
      </div>

      <span className="shrink-0 self-start rounded-pill bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
        {ticketTypes.length > 0
          ? formatPrice(fromPrice, { from: true })
          : cardStatusLabel(event.type)}
      </span>
    </Link>
  );
}
