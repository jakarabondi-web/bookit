import Link from "next/link";
import { ArrowRight, EyeOff, Link2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";

/**
 * Private events on the homepage.
 *
 * This is deliberately a showcase, not a rail of events. A ruracio, a wedding
 * reception or a family gathering must never be listed publicly — so the
 * homepage sells the capability and links to the create flow, and the events
 * themselves live behind an invitation at `/i/[token]`.
 */

const OCCASIONS: Array<{ icon: BookitIconName; label: string }> = [
  { icon: "wedding", label: "Ruracio ceremonies" },
  { icon: "seat", label: "Wedding receptions" },
  { icon: "meeting", label: "Chama meetings" },
  { icon: "community", label: "Family gatherings" },
  { icon: "conference", label: "Corporate dinners" },
  { icon: "party", label: "Milestone birthdays" },
];

const GUARANTEES = [
  {
    icon: Lock,
    title: "Invitation only",
    body: "Your event is never listed, never searchable and has no public page. The only way in is a link you send.",
  },
  {
    icon: Link2,
    title: "A page of your own",
    body: "Host names, your story, the programme, dress code, directions and a gift registry — themed the way you want it.",
  },
  {
    icon: Mail,
    title: "E-cards and reminders",
    body: "Design the invitation, send it by email, SMS or WhatsApp, and see exactly who has opened and replied.",
  },
  {
    icon: EyeOff,
    title: "Guests stay private",
    body: "Your guest list is yours. Nobody outside it sees who was invited, who is coming or what they gave.",
  },
];

export function PrivateEventsShowcase() {
  return (
    <section className="page-shell py-10">
      <div className="overflow-hidden rounded-hero border border-line bg-gradient-to-br from-[#1B1F29] via-[#1B1710] to-[#241A0E]">
        <div className="grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:p-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/85">
              <Lock className="size-3" aria-hidden="true" />
              Private &amp; invitation-only
            </p>

            <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
              Some events are nobody else&apos;s business.
            </h2>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70">
              Ruracio, weddings, chama meetings, family gatherings — Bookit gives them a beautiful
              private page that never appears in search, on this homepage, or anywhere else. Only
              the people you invite can open it.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2">
              {OCCASIONS.map((occasion) => (
                <li key={occasion.label}>
                  <span className="inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white/80">
                    <BookitIcon name={occasion.icon} className="size-4 text-primary" />
                    {occasion.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/organizer/events/new?type=PRIVATE_INVITATION">
                  Create a private event
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/private-events">
                  See how it works
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {GUARANTEES.map((guarantee) => (
              <li
                key={guarantee.title}
                className="rounded-card border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <guarantee.icon className="size-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-white">{guarantee.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{guarantee.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
