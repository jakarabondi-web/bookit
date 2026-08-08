import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers about tickets, bookings, refunds, transfers and verified resale on Bookit.",
};

const TOPICS: Array<{ href: string; icon: BookitIconName; title: string; body: string }> = [
  {
    href: "/help/refunds",
    icon: "ticket",
    title: "Refunds",
    body: "When you can get your money back, and how long it takes.",
  },
  {
    href: "/help/resale",
    icon: "gift",
    title: "Verified resale",
    body: "How selling a ticket you can no longer use actually works.",
  },
  {
    href: "/help/contact",
    icon: "user",
    title: "Contact us",
    body: "Reach a human — and what to have ready when you do.",
  },
];

const QUICK = [
  {
    question: "My QR code will not scan at the gate.",
    answer:
      "Open the ticket in the Bookit app or site rather than a screenshot — codes refresh every few seconds and screenshots stop working almost immediately. If you have no signal, gate staff can find you by booking reference or phone number.",
  },
  {
    question: "I paid with M-PESA but have no ticket.",
    answer:
      "A payment only issues tickets once Safaricom confirms it to us directly. If your M-PESA message arrived but the ticket has not, wait two minutes and refresh — our reconciliation job picks up callbacks that went missing. If it still has not arrived, contact us with your M-PESA receipt number.",
  },
  {
    question: "Can I send my ticket to someone else?",
    answer:
      "If the organizer allows transfers, yes. Go to My Tickets, choose Transfer Ticket and enter their email. Ownership only moves when they accept, and your copy of the code stops working the instant it does.",
  },
  {
    question: "I RSVP'd but I am on a waitlist.",
    answer:
      "The event is at capacity. If someone cancels, the longest-waiting person is promoted automatically and we email you — you do not need to check back.",
  },
];

export default function HelpPage() {
  return (
    <div className="page-shell py-8 lg:py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">Help centre</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Most questions are about the same four things. Start here.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {TOPICS.map((topic) => (
          <li key={topic.href}>
            <Link href={topic.href} className="block h-full">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <BookitIcon name={topic.icon} className="size-5" />
                  </span>
                  <h2 className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    {topic.title}
                    <ArrowRight className="size-3.5 text-muted" aria-hidden="true" />
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-secondary">{topic.body}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Common questions</h2>
        <dl className="mt-4 flex flex-col gap-4">
          {QUICK.map((item) => (
            <div key={item.question} className="rounded-card border border-line bg-surface p-5">
              <dt className="text-sm font-semibold text-ink">{item.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-hero border border-primary/15 bg-primary-tint p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <LifeBuoy className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-ink">Still stuck?</h2>
            <p className="mt-1.5 max-w-xl text-sm text-ink-secondary">
              Support is open 8:00 AM to 8:00 PM East Africa Time, seven days a week, and until the
              last gate closes on event days.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="flex items-center gap-2 text-ink-secondary">
                <Mail className="size-4 text-primary" aria-hidden="true" />
                <a href="mailto:help@bookit.co.ke" className="hover:text-primary hover:underline">
                  help@bookit.co.ke
                </a>
              </li>
              <li className="flex items-center gap-2 text-ink-secondary">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                <a href="tel:+254700000000" className="hover:text-primary hover:underline">
                  +254 700 000 000
                </a>
              </li>
              <li className="flex items-center gap-2 text-ink-secondary">
                <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                WhatsApp support
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
