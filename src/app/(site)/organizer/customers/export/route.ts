import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { SEGMENT_LABEL, type Segment } from "@/server/services/crm-service";

/**
 * CSV export of the customer base — the hand-off from CRM to whatever the
 * organizer actually messages with. Respects the same segment filter as the
 * list view, so "export the at-risk segment" is one click.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const segment = url.searchParams.get("segment") as Segment | null;

  const { crm } = getContainer();
  const organizerId = await currentOrganizerId();
  let profiles = await crm.customers(organizerId);
  if (segment) profiles = profiles.filter((profile) => profile.segment === segment);

  const header = [
    "name",
    "email",
    "phone",
    "segment",
    "orders",
    "tickets",
    "events",
    "lifetime_spend_kes",
    "first_order",
    "last_order",
  ];
  const lines = [header.join(",")];
  for (const profile of profiles) {
    lines.push(
      [
        csv(profile.name),
        csv(profile.email),
        csv(profile.phone ?? ""),
        csv(SEGMENT_LABEL[profile.segment]),
        String(profile.orders),
        String(profile.tickets),
        String(profile.eventsBought),
        (profile.spend.amount / 100).toFixed(2),
        profile.firstOrderAt.slice(0, 10),
        profile.lastOrderAt.slice(0, 10),
      ].join(","),
    );
  }

  const filename = segment
    ? `bookit-customers-${segment.toLowerCase()}.csv`
    : "bookit-customers.csv";

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
