import type { Metadata } from "next";
import { Link2, Mail, Percent, Share2 } from "lucide-react";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Marketing" };

const TOOLS = [
  {
    icon: Percent,
    title: "Promo codes",
    body: "Percentage or fixed-amount discounts, capped by redemption count and date window.",
  },
  {
    icon: Link2,
    title: "Affiliate links",
    body: "Trackable links for partners and promoters, with click and conversion attribution.",
  },
  {
    icon: Mail,
    title: "Announcements",
    body: "Email and SMS to ticket holders, RSVPs or a single event's waitlist.",
  },
  {
    icon: Share2,
    title: "Share cards",
    body: "Open Graph previews generated per event so shared links look right everywhere.",
  },
];

export default async function MarketingPage() {
  const { catalog } = getContainer();
  const events = await catalog.organizerEvents(DEMO_ORGANIZER_ID);
  const now = new Date().toISOString();
  const promotable = events.filter((summary) => summary.event.startsAt >= now);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Marketing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Fill your events — discounts, partner links and direct messages to people who already
          bought from you.
        </p>
      </header>

      <section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <li key={tool.title}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <tool.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 text-sm font-semibold text-ink">{tool.title}</h2>
                  <p className="mt-1.5 text-sm text-ink-secondary">{tool.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Campaigns by event</h2>
          <Button size="sm">Create promo code</Button>
        </div>

        {promotable.length === 0 ? (
          <EmptyState
            title="Nothing to promote yet"
            description="Create an upcoming event and you can attach promo codes and affiliate links to it."
            action={{ label: "Create event", href: "/organizer/events/new" }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {promotable.map((summary) => (
              <li key={summary.event.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{summary.event.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {summary.venue.name} · {summary.venue.city}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>0 promo codes</Badge>
                      <Badge>0 affiliate links</Badge>
                      <Button size="sm" variant="secondary">
                        Add code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
