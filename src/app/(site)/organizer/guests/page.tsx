import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { behaviourFor } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Guest Lists" };

export default async function GuestListsPage() {
  const { catalog } = getContainer();
  const organizerId = await currentOrganizerId();
  const events = await catalog.organizerEvents(organizerId);

  const guestDriven = events.filter((summary) => behaviourFor(summary.event.type).guestListDriven);

  const views = await Promise.all(
    guestDriven.map(async (summary) => ({
      summary,
      view: await catalog.guestList(summary.event.id),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Guest Lists</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Events where the guest list is the main tool — RSVPs, invitations, reservations,
          banquets and recurring meetings.
        </p>
      </header>

      {views.length === 0 ? (
        <EmptyState
          title="No guest-list events"
          description="Free RSVP, private invitation, booking, banquet and recurring meeting events all come with a guest list."
          action={{ label: "Create event", href: "/organizer/events/new" }}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {views.map(({ summary, view }) => (
            <li key={summary.event.id}>
              <Link href={`/organizer/events/${summary.event.id}/guests`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-ink">
                          {summary.event.title}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDateTime(summary.event.startsAt)} · {summary.venue.name}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {[
                        ["Confirmed", view.confirmed],
                        ["Pending", view.pending],
                        ["Waitlist", view.waitlist],
                        ["Declined", view.declined],
                        ["Checked in", view.checkedIn],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <dt className="text-[11px] uppercase tracking-wide text-muted">
                            {label}
                          </dt>
                          <dd className="tabular mt-0.5 text-lg font-semibold text-ink">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {view.capacityRemaining !== null ? (
                      <Badge tone={view.capacityRemaining === 0 ? "warning" : "neutral"} className="mt-4">
                        {view.capacityRemaining === 0
                          ? "At capacity — new guests go to the waitlist"
                          : `${view.capacityRemaining} places left`}
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
