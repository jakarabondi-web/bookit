import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { EventVisibility } from "@/domain/enums";
import { currentOrganizerActor, getContainer } from "@/server/container";
import { DEMO_INVITE_TOKENS } from "@/server/seed/private-seed";
import { PrivateStudio } from "@/components/organizer/private-studio";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getContainer().uow.repos.events.findById(id);
  return { title: event ? `Invitation · ${event.title}` : "Private invitation" };
}

/** Demo invitation links, so the host can preview the real guest view. */
const PREVIEW_TOKENS: Record<string, string> = {
  evt_ruracio: DEMO_INVITE_TOKENS.ruracio,
  evt_wedding: DEMO_INVITE_TOKENS.wedding,
};

export default async function PrivateEventStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = getContainer();

  const event = await container.uow.repos.events.findById(id);
  if (!event) notFound();

  const venue = await container.uow.repos.venues.findById(event.venueId);
  if (!venue) notFound();

  // A public event has no invitation microsite; say so rather than 404.
  if (event.visibility === EventVisibility.PUBLIC) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/organizer/events/${event.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {event.title}
        </Link>
        <EmptyState
          icon={<Lock className="size-5" />}
          title="This is a public event"
          description="Private invitation tools are for events that are not listed publicly. Change this event's visibility to Private or Invitation-only to design an invitation page for it."
          action={{ label: "Event settings", href: `/organizer/events/${event.id}` }}
        />
      </div>
    );
  }

  // The demo runs as the organizer who owns this event; real auth replaces this.
  const actor = currentOrganizerActor(event.organizerId);

  const [page, invites, gifts, broadcasts, messages] = await Promise.all([
    container.privateEvents.getPageForHost(actor, event.id),
    container.privateEvents.listInvites(event.id),
    container.privateEvents.listGifts(event.id),
    container.privateEvents.listBroadcasts(event.id),
    container.privateEvents.listMessages(event.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href={`/organizer/events/${event.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {event.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Private invitation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Design the page your guests will see, send their invitations, and keep track of who is
          coming.
        </p>
      </header>

      <Card className="border-info/20 bg-info-tint/50">
        <CardContent className="flex items-start gap-3 p-5">
          <Lock className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-ink">This event is not listed anywhere</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              It does not appear on the Bookit homepage, in search, in any listing, or on a public
              event page. The only way to reach it is a personal invitation link, and each link
              works for exactly one guest.
            </p>
          </div>
        </CardContent>
      </Card>

      <PrivateStudio
        eventId={event.id}
        eventTitle={event.title}
        startsAt={event.startsAt}
        venueName={venue.name}
        venueCity={venue.city}
        initialPage={page}
        invites={invites}
        gifts={gifts}
        broadcasts={broadcasts}
        messages={messages}
        previewToken={PREVIEW_TOKENS[event.id] ?? null}
      />
    </div>
  );
}
