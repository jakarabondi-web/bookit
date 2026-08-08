import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface Article {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string[] }>;
}

const ARTICLES: Record<string, Article> = {
  refunds: {
    title: "Refunds",
    intro:
      "Each organizer sets their own refund policy, shown on the event page before you pay. These rules apply on top of it.",
    sections: [
      {
        heading: "When a refund is automatic",
        body: [
          "If an organizer cancels an event, every unused ticket is refunded in full — you do not need to ask. Refunds go back to the M-PESA number or card that paid, usually within three business days.",
        ],
      },
      {
        heading: "When you can request one",
        body: [
          "Within the organizer's stated refund window, and while the ticket is still yours and unused. Request it from My Tickets.",
          "A ticket that has been checked in, transferred to someone else, or sold on the resale marketplace can no longer be refunded against your order — it belongs to someone else now.",
        ],
      },
      {
        heading: "How the money moves",
        body: [
          "Refunds are taken back out of the organizer's balance, not out of a shared pool, and every refund is posted to our ledger as a balanced transaction. That is why an organizer's available balance drops when a refund is issued.",
          "Bookit's service fee is disclosed separately at checkout. Whether it is refunded depends on the organizer's policy for that event.",
        ],
      },
      {
        heading: "If something went wrong with payment",
        body: [
          "If money left your account but no ticket arrived, do not pay again. Contact us with your M-PESA receipt number — we can match it to the transaction and either issue the ticket or return the money.",
        ],
      },
    ],
  },
  resale: {
    title: "Verified resale",
    intro:
      "If you can no longer attend, you can sell your ticket to someone else on Bookit — when the organizer allows it.",
    sections: [
      {
        heading: "Why it is safe",
        body: [
          "Only tickets Bookit issued can be listed. There are no PDF uploads and no screenshots of a confirmation email, so there is nothing to forge.",
          "We verify you still own the ticket at the moment you list it, and the ticket is locked while listed — it cannot be transferred or listed twice.",
          "When a buyer pays, ownership moves in a single database transaction and a new credential is issued to them. Your QR code stops working immediately. A ticket can never be sold to two people.",
        ],
      },
      {
        heading: "What organizers control",
        body: [
          "Whether resale is allowed at all, the maximum price above face value, when the resale window opens and closes, how many listings one account may have, and how long seller proceeds are held before payout.",
          "Many organizers cap resale at face value. That is deliberate — it keeps tickets in the hands of fans rather than touts.",
        ],
      },
      {
        heading: "Getting paid",
        body: [
          "Proceeds are held for the organizer's stated payout delay after the sale completes, then released to you. This window exists so a fraudulent sale can be reversed before the money leaves the platform.",
          "Bookit charges a service fee on completed resales, shown to you before you confirm the listing.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact us",
    intro: "The faster you give us the right reference, the faster this gets fixed.",
    sections: [
      {
        heading: "Have this ready",
        body: [
          "For a ticket problem: your order reference (it starts BK-ORD) or the ticket code on the ticket itself.",
          "For a booking or RSVP: your booking reference (it starts BK-).",
          "For a payment problem: the M-PESA receipt number from your confirmation SMS, and the phone number that paid.",
        ],
      },
      {
        heading: "How to reach us",
        body: [
          "Email help@bookit.co.ke — best for anything needing a receipt or screenshot.",
          "Call +254 700 000 000 between 8:00 AM and 8:00 PM East Africa Time.",
          "On event days we staff support until the last gate closes.",
        ],
      },
      {
        heading: "Organizers",
        body: [
          "If you run events on Bookit, use the support contact in your organizer dashboard. Anything involving payouts or your settlement account is handled by a separate team and will require you to confirm your identity.",
        ],
      },
      {
        heading: "Reporting fraud",
        body: [
          "If someone offers to sell you a Bookit ticket outside Bookit, it cannot be verified and we cannot help you if it fails at the gate. Report it to help@bookit.co.ke and we will investigate the account.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(ARTICLES).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const article = ARTICLES[topic];
  return article ? { title: article.title, description: article.intro } : { title: "Help" };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const article = ARTICLES[topic];
  if (!article) notFound();

  return (
    <div className="page-shell py-8 lg:py-12">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Help centre
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-ink lg:text-3xl">{article.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-secondary">{article.intro}</p>

        <div className="mt-8 flex flex-col gap-8">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
              <div className="mt-2 flex flex-col gap-3">
                {section.body.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-ink-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
