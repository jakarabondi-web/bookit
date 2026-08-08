import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { HeroSearch } from "./hero-search";

/**
 * Homepage hero — USIKU.
 *
 * Events in Kenya are a nighttime economy, and the hero commits to the hour
 * they happen: full-bleed concert photography under two veils — a black
 * gradient doing the legibility work, a violet stage-glow doing the
 * temperature — with the headline set in Anton, the poster face. The panel is
 * deliberately dark in both themes; it is an artwork, not a surface, so it
 * does not re-theme. Everything around it does.
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

export function Hero({ liveCount }: { liveCount: number }) {
  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date());

  return (
    <section className="page-shell pt-4 lg:pt-6">
      <div className="relative isolate overflow-hidden rounded-hero bg-[#0A0B14]">
        {/* The photograph carries the hero — sharp, not wallpaper. */}
        <Image
          src="/assets/images/hero-concert.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        {/* Legibility veil… */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0A0B14]/70 via-[#0A0B14]/25 to-[#0A0B14]"
          aria-hidden="true"
        />
        {/* …and stage temperature. */}
        <div
          className="absolute inset-0 bg-[radial-gradient(70%_90%_at_85%_0%,rgba(122,59,255,0.32)_0%,transparent_60%)]"
          aria-hidden="true"
        />

        <div className="relative px-5 pb-10 pt-16 sm:px-8 sm:pt-24 lg:px-14 lg:pb-12 lg:pt-36">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FFC981]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#FFA028] opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#FFA028] shadow-[0_0_12px_#FFA028]" />
            </span>
            {today} · {liveCount} events on sale
          </p>

          <h1 className="mt-4 font-poster text-[3.4rem] font-normal uppercase leading-[0.92] tracking-[0.005em] text-[#F2F1EC] sm:text-[5rem] lg:text-[6.5rem]">
            Tonight in
            <br />
            <span className="text-[#FFA028]">Nairobi.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#C9C7BE] sm:text-lg">
            Concerts, derbies, comedy and everything with a queue outside — verified tickets,
            straight to M-PESA.
          </p>

          <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {TRUST.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-white/70">
                <item.icon className="size-4 text-[#FFA028]" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="mt-8 max-w-3xl">
            <HeroSearch />
          </div>
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
              className="group inline-flex items-center gap-2 self-start rounded-pill border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#FFA028] hover:bg-[#FFA028]/10 sm:self-auto"
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
