import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

/**
 * Legal pages.
 *
 * These are plain-language summaries of how the platform actually behaves —
 * accurate to the implementation, and useful to a reader. They are not a
 * substitute for terms drafted and reviewed by a Kenyan lawyer, and the notice
 * at the top of each page says so rather than pretending otherwise.
 */

interface LegalDoc {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
}

const DOCS: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of service",
    updated: "Draft — pending legal review",
    sections: [
      {
        heading: "What Bookit does",
        body: [
          "Bookit is a platform connecting organizers with attendees. When you buy a ticket or make a booking, your contract for attending the event is with the organizer. Bookit provides ticketing, payment collection, guest management and verified ownership on their behalf.",
        ],
      },
      {
        heading: "Tickets and ownership",
        body: [
          "The authoritative record of a ticket is the record held by Bookit, not the QR code on your screen. A QR code is a short-lived, signed assertion about that record; it expires within seconds and is reissued continuously while you look at it.",
          "Transferring or reselling a ticket moves ownership in our records and immediately invalidates all previously issued codes for it.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Payments are collected through licensed providers, including Safaricom M-PESA. A payment is only treated as complete when the provider confirms it to Bookit directly. A confirmation shown in your browser is never sufficient on its own.",
          "Bookit charges a service fee, disclosed at checkout before you pay.",
        ],
      },
      {
        heading: "Refunds and cancellations",
        body: [
          "Refund eligibility follows the organizer's published policy for that event, subject to the platform rules described in our help centre. If an organizer cancels an event, unused tickets are refunded in full.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use automation to acquire tickets, do not create multiple accounts to bypass per-account limits, and do not sell Bookit tickets outside Bookit. Accounts doing so may be suspended and their tickets voided without refund.",
        ],
      },
      {
        heading: "Organizers",
        body: [
          "Organizers must be verified before receiving payouts and are responsible for delivering the event as described. Bookit may hold a portion of ticket revenue in reserve until after the event and its dispute window, based on the organizer's history.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy notice",
    updated: "Draft — pending legal review",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account details you give us: name, email address, phone number and city.",
          "Transaction data: orders, bookings, tickets, payments and check-ins.",
          "Technical data: IP address, device and session information, used for security and fraud prevention.",
          "For organizers: verification documents including identification and tax details, required by law before we can settle funds to you.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To sell you tickets, take your bookings, admit you to events and pay organizers.",
          "To detect and prevent fraud. Signals such as purchase velocity, device reputation and payment failures feed a risk engine that may challenge, hold or block a transaction. Every such decision is recorded with the reasons for it.",
          "To send you transactional messages — confirmations, reminders, transfer and refund notices. Marketing messages are opt-in and separate.",
        ],
      },
      {
        heading: "Who sees it",
        body: [
          "Organizers see the attendee information needed to run their event: your name, contact details, guest count and check-in status for their events only. They do not see your payment details or your activity on other organizers' events.",
          "Payment providers receive what they need to process the payment. Bookit never stores raw card numbers.",
          "Verification documents are encrypted at rest, access-restricted, and every access is logged.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under the Kenyan Data Protection Act you may request access to your data, correction of inaccuracies, or deletion. Some records — financial transactions in particular — must be retained for statutory periods even after account closure.",
          "Write to privacy@bookit.co.ke to make a request.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookies",
    updated: "Draft — pending legal review",
    sections: [
      {
        heading: "What we set",
        body: [
          "A session cookie that keeps you signed in. It is HTTP-only, secure and same-site, so scripts cannot read it and other sites cannot send it.",
          "A device identifier used for fraud prevention and to recognise the devices you normally use.",
          "A preference cookie remembering your chosen city.",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "We do not use third-party advertising cookies, and we do not sell your browsing behaviour.",
          "Our pages load no third-party scripts. Our content security policy blocks any script that is not served by Bookit and carrying a per-request nonce.",
        ],
      },
      {
        heading: "Managing them",
        body: [
          "You can clear cookies in your browser at any time. Clearing the session cookie signs you out; clearing the device cookie may mean we challenge your next purchase more often.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const document = DOCS[doc];
  if (!document) notFound();

  return (
    <div className="page-shell py-8 lg:py-12">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">{document.title}</h1>
        <p className="mt-2 text-sm text-muted">{document.updated}</p>

        <div
          role="note"
          className="mt-6 flex items-start gap-3 rounded-card border border-warning/25 bg-warning-tint p-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-ink-secondary">
            This page describes how the platform actually works and is written to be useful. It has
            not been reviewed by a lawyer and is not the final published agreement — have Kenyan
            counsel review and approve it before launch.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8">
          {document.sections.map((section) => (
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
