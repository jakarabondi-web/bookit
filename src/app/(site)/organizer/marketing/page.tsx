import type { Metadata } from "next";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { SEGMENT_LABEL, SEGMENT_PLAY, type Segment } from "@/server/services/crm-service";
import { CampaignComposer } from "@/components/organizer/campaign-composer";
import { PromotionsPanel } from "@/components/organizer/promotions-panel";
import { SegmentBadge } from "@/components/organizer/segment-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Marketing" };

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preselect = typeof params.segment === "string" ? [params.segment as Segment] : [];

  const { catalog, crm, marketing, promotions } = getContainer();
  const organizerId = await currentOrganizerId();
  const [events, summary, campaigns, promoCodes, affiliateLinks] = await Promise.all([
    catalog.organizerEvents(organizerId),
    crm.summary(organizerId),
    marketing.listCampaigns(organizerId),
    promotions.listPromoCodes(organizerId),
    promotions.listAffiliateLinks(organizerId),
  ]);
  const now = new Date().toISOString();
  const promotable = events.filter((eventSummary) => eventSummary.event.startsAt >= now);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Marketing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Fill your events — discounts, partner links and direct messages to the customers who
          already know you.
        </p>
      </header>

      {/* Your audience — the CRM's segments, brought here to act on. */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Your audience</h2>
          <Link
            href="/organizer/customers"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all customers
          </Link>
        </div>
        {summary.customers === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Once tickets sell, your customers segment themselves here by how recently, how often and how much they buy."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.segments.map((entry) => (
              <li key={entry.segment}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <SegmentBadge segment={entry.segment} />
                      <p className="tabular text-lg font-bold text-ink">{entry.count}</p>
                    </div>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">
                      {SEGMENT_PLAY[entry.segment]}
                    </p>
                    <Link
                      href={`/organizer/marketing?segment=${entry.segment}#compose`}
                      className="mt-3 text-xs font-semibold text-primary hover:underline"
                    >
                      Message this segment →
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Composer — anchored so segment cards can jump straight to it. */}
      <section id="compose">
        <h2 className="mb-4 text-lg font-semibold text-ink">Message a segment</h2>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <CampaignComposer
              // Remounts on a new preselected segment so the composer's
              // internal selection state resets to match the link that was
              // clicked, rather than keeping whatever was selected before.
              key={preselect.join(",")}
              segmentCounts={summary.segments}
              initialSegments={preselect.filter((segment) =>
                summary.segments.some((entry) => entry.segment === segment),
              )}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Recent campaigns</h2>
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns sent yet"
            description="Messages you send to a segment above will show up here with who they reached."
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-line p-2">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{campaign.subject}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {formatDateTime(campaign.sentAt)} · {campaign.channel} ·{" "}
                      {campaign.segments
                        .map((segment) => SEGMENT_LABEL[segment as Segment] ?? segment)
                        .join(", ")}
                    </p>
                  </div>
                  <Badge tone="brand">
                    <Download className="size-3" /> {campaign.recipientCount} reached
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Promo codes & affiliate links</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Share2 className="size-3.5" /> Share cards are coming soon
          </p>
        </div>

        {promotable.length === 0 ? (
          <EmptyState
            title="Nothing to promote yet"
            description="Create an upcoming event and you can attach promo codes and affiliate links to it."
            action={{ label: "Create event", href: "/organizer/events/new" }}
          />
        ) : (
          <PromotionsPanel
            events={promotable.map((eventSummary) => ({
              id: eventSummary.event.id,
              title: eventSummary.event.title,
            }))}
            promoCodes={promoCodes}
            affiliateLinks={affiliateLinks}
            origin={APP_ORIGIN}
          />
        )}
      </section>
    </div>
  );
}
