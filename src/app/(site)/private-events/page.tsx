import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Gift, Link2, Lock, Mail, MessageSquare, Palette, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";

export const metadata: Metadata = {
  title: "Private events",
  description:
    "Invitation-only pages for ruracio ceremonies, weddings, chama meetings and family gatherings. Never listed, never searchable.",
};

const STEPS = [
  {
    number: "01",
    title: "Create your event and keep it private",
    body: "Choose Private Invitation, Banquet or Recurring Meeting. From that moment the event is invisible — no homepage, no search, no public page. Even someone who guesses the address gets nothing.",
  },
  {
    number: "02",
    title: "Design the page your guests will see",
    body: "Pick a theme, add the host names, write your story, lay out the programme, set a dress code, add directions and a gift registry. There is a live preview as you go.",
  },
  {
    number: "03",
    title: "Send personal invitation links",
    body: "Paste your guest list and Bookit creates one private link per person, each with its own guest allowance. Send by email, SMS or WhatsApp.",
  },
  {
    number: "04",
    title: "Watch the replies come in",
    body: "See who has opened their invitation, who has replied, meal choices, dietary needs and the notes they left. Message any group of them at once.",
  },
];

const TOOLS: Array<{ icon: typeof Palette; title: string; body: string }> = [
  {
    icon: Palette,
    title: "Six invitation themes",
    body: "Gold & Ivory, Botanical, Kitenge, Midnight, Blush and Slate — each with matched colours and typography.",
  },
  {
    icon: Users,
    title: "Host names and roles",
    body: "Bride and groom, celebrant, both families — however your occasion is arranged.",
  },
  {
    icon: Mail,
    title: "E-card designer",
    body: "Four layouts with a live preview. Generated, not uploaded, so it stays sharp everywhere and updates instantly.",
  },
  {
    icon: Link2,
    title: "One link per guest",
    body: "Personal, single-purpose links with their own guest allowance and expiry. Revoke any one of them at any time.",
  },
  {
    icon: Gift,
    title: "Gift registry",
    body: "Items guests can claim so nobody buys the same thing twice, plus cash funds with an M-PESA number and a progress bar.",
  },
  {
    icon: MessageSquare,
    title: "Broadcasts",
    body: "Message everyone, only those who confirmed, or only those who have not replied — by email, SMS or WhatsApp.",
  },
  {
    icon: EyeOff,
    title: "Guest privacy",
    body: "Your guest list is never public. You choose whether guests can even see the confirmed count.",
  },
  {
    icon: Lock,
    title: "Moderated message wall",
    body: "Notes guests leave with their RSVP wait for your approval before anyone else sees them.",
  },
];

const OCCASIONS: Array<{ icon: BookitIconName; title: string; body: string }> = [
  {
    icon: "wedding",
    title: "Ruracio & traditional ceremonies",
    body: "Guest counts per family, meal choices, contribution tracking and a programme for the day.",
  },
  {
    icon: "seat",
    title: "Wedding receptions",
    body: "Seated dinners with tables, meal choices, dietary needs and a gift registry.",
  },
  {
    icon: "meeting",
    title: "Chama & committee meetings",
    body: "A recurring series with per-meeting attendance and contributions, members only.",
  },
  {
    icon: "community",
    title: "Family gatherings",
    body: "Simple headcounts, directions and a note wall — nothing more complicated than it needs to be.",
  },
];

export default function PrivateEventsPage() {
  return (
    <div className="page-shell py-8 lg:py-12">
      {/* Hero */}
      <div className="overflow-hidden rounded-hero border border-line bg-gradient-to-br from-[#1B1F29] via-[#1B1710] to-[#241A0E] px-6 py-14 text-center sm:px-10 lg:py-20">
        <p className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/85">
          <Lock className="size-3" aria-hidden="true" />
          Invitation only
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
          A beautiful private page for the events that aren&apos;t for everyone.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 lg:text-lg">
          Ruracio, weddings, chama meetings, family gatherings. Bookit gives them their own
          invitation page — themed the way you want, sent only to the people you choose, and
          invisible to everybody else.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
            <Link href="/organizer/events">Open the organizer dashboard</Link>
          </Button>
        </div>
      </div>

      {/* The privacy promise */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-ink">What &ldquo;private&rdquo; actually means</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Not a hidden listing. Not an unlisted link that anyone can forward and open. A private
          event on Bookit has no public page at all — the invitation token is the only key, and
          the platform refuses to return the event to any query that is not yours.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Never on the homepage",
            "Never in search or listings",
            "No public event page to find",
            "One link per guest, revocable",
          ].map((claim) => (
            <li
              key={claim}
              className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-4"
            >
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-ink">{claim}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-ink">How it works</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.number}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <span className="font-display text-3xl font-bold text-primary/30">
                    {step.number}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Tools */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-ink">Everything you can customise</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <li key={tool.title}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <tool.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{tool.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{tool.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Occasions */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-ink">Built for how Kenyans actually celebrate</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.title}>
              <Card className="h-full">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <BookitIcon name={occasion.icon} className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{occasion.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                      {occasion.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-hero border border-primary/15 bg-primary-tint p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold text-ink">Ready to send your invitations?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-secondary">
          Creating a private event takes a few minutes. Nothing is visible to anyone until you
          send the first link — and even then, only to the person you sent it to.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/organizer/events/new?type=PRIVATE_INVITATION">Get started</Link>
        </Button>
      </section>
    </div>
  );
}
