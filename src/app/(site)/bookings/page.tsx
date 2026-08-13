import type { Metadata } from "next";
import Link from "next/link";
import { EventType } from "@/domain/enums";
import { EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { getContainer } from "@/server/container";
import { BookingKindFilter } from "@/components/bookings/booking-kind-filter";
import {
  DEFAULT_REGISTER_TYPES,
  parseKind,
} from "@/components/bookings/booking-kinds";
import { BookingRegister } from "@/components/bookings/booking-register";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { Button } from "@/components/ui/button";
import { pluralise } from "@/lib/format";

export const metadata: Metadata = {
  title: "Bookings",
  description:
    "Ceremonies, banquets, chama meetings and reservations run on replies, not tickets. See what is open to everyone, or host your own on Bookit.",
};

const BASE_PATH = "/bookings";

/**
 * The booking hub.
 *
 * Two facts shape this page. The first is that a booking is a reply to a host,
 * not a purchase — so the visitor needs to know what they will be asked for,
 * not what it costs. The second is that most bookings are invisible: the
 * repository only lists PUBLIC events, and a ruracio, a chama meeting or a
 * wedding reception is never public. The register here will always be short,
 * and the page says so rather than dressing two results up as a marketplace.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // `?type=` rather than `?kind=`: the site footer already deep-links here with
  // it, and `/events` uses the same parameter name for the same idea.
  const kind = parseKind(params.type);

  const { catalog } = getContainer();
  const { items } = await catalog.search({
    types: kind ? [kind] : DEFAULT_REGISTER_TYPES,
    limit: 24,
  });

  return (
    <div className="page-shell py-8 lg:py-12">
      {/* The thesis. */}
      <section className="rounded-hero border border-line bg-surface-secondary px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Bookings
        </p>

        <h1 className="mt-5 max-w-4xl font-poster text-[2.6rem] font-normal uppercase leading-[0.94] tracking-[0.005em] text-ink sm:text-[3.6rem] lg:text-[4.75rem]">
          Some events need a <span className="text-primary">reply</span>, not a ticket.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary lg:text-lg">
          A ruracio, a wedding reception, a chama meeting, a boardroom for the afternoon.
          Nobody is buying a seat — the host needs to know who is coming and how many.
          Bookit collects the replies, keeps the guest list, and seats the room.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/organizer/events/new">Host a gathering</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="#open">See what&rsquo;s open</Link>
          </Button>
          <Link
            href="/account/bookings"
            className="ml-1 text-sm font-medium text-primary hover:text-primary-hover hover:underline"
          >
            My bookings
          </Link>
        </div>
      </section>

      {/* The five kinds, as the filter for the register below. */}
      <div className="pt-10 lg:pt-14">
        <BookingKindFilter selected={kind} basePath={BASE_PATH} />
      </div>

      {/* The register. */}
      <section id="open" className="scroll-mt-24 pt-10 lg:pt-14">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold text-ink lg:text-2xl">Open to everyone</h2>
          <p className="text-sm text-muted">
            {items.length > 0
              ? `${pluralise(items.length, "gathering")} taking replies right now`
              : "Nothing open under this filter"}
          </p>
        </div>

        {items.length > 0 ? (
          <BookingRegister items={items} />
        ) : (
          <EmptyRegister kind={kind} />
        )}
      </section>

      {/* Why the register is short. */}
      <section className="pt-10 lg:pt-14">
        <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
            <BookitIcon name="gift" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-ink">
              Most bookings never appear on this page
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              A ruracio or a family lunch is invisible on Bookit — it is absent from search,
              from listings and from the homepage. The invitation link is the only way in, and
              each one works for exactly one guest. If you are expecting an invitation, check
              your messages for it.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/private-events">How private events work</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/**
 * The empty register.
 *
 * Filtering to banquets or private invitations will almost always land here,
 * and that is the product working correctly rather than a dead end — so the
 * copy explains which it is instead of showing one generic message for both.
 */
function EmptyRegister({ kind }: { kind: EventType | null }) {
  const usuallyPrivate =
    kind === EventType.BANQUET || kind === EventType.PRIVATE_INVITATION;

  return (
    <div className="rounded-card border border-dashed border-line bg-surface-secondary/60 px-6 py-12 text-center">
      <h3 className="font-display text-base font-bold text-ink">
        {kind
          ? `No ${EVENT_TYPE_LABEL[kind].toLowerCase()} is open to everyone`
          : "Nothing is open to everyone right now"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
        {usuallyPrivate
          ? "These are nearly always private — hosts invite their guests directly rather than listing the event. You would reach one through an invitation link, not this page."
          : "Public gatherings come and go. Change the filter to see other kinds, or set up your own and send the invitations yourself."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button asChild size="sm">
          <Link href="/organizer/events/new">Host a gathering</Link>
        </Button>
        {kind ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={BASE_PATH}>Show all kinds</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
