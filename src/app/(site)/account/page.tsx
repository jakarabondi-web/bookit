import type { Metadata } from "next";
import Link from "next/link";
import { BookingStatus, TicketStatus } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { currentUserId } from "@/server/auth/current-user";
import { BookingCard } from "@/components/account/booking-card";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Account" };

export default async function AccountOverviewPage() {
  const { catalog, uow } = getContainer();
  const userId = await currentUserId();
  const user = await uow.repos.users.findById(userId);

  const [tickets, bookings, listings] = await Promise.all([
    catalog.ticketsForUser(userId),
    catalog.bookingsForUser(userId, user?.email),
    catalog.listingsForUser(userId),
  ]);

  const now = new Date().toISOString();

  const activeTickets = tickets.filter(
    ({ ticket, event }) =>
      event.endsAt >= now &&
      (ticket.status === TicketStatus.ACTIVE || ticket.status === TicketStatus.LISTED),
  );
  const upcomingBookings = bookings.filter(
    ({ booking, event }) =>
      event.endsAt >= now &&
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.DECLINED,
  );
  const activeListings = listings.filter(({ listing }) => listing.status === "ACTIVE");

  const stats: Array<{ label: string; value: number; href: string; icon: BookitIconName }> = [
    { label: "Upcoming tickets", value: activeTickets.length, href: "/account/tickets", icon: "ticket" },
    { label: "Upcoming bookings", value: upcomingBookings.length, href: "/account/bookings", icon: "booking" },
    { label: "Active listings", value: activeListings.length, href: "/account/listings", icon: "gift" },
  ];

  const nextUp = upcomingBookings[0];

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link href={stat.href} className="block">
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <BookitIcon name={stat.icon} className="size-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold leading-none text-ink">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="text-lg font-semibold text-ink">Next up</h2>
        <div className="mt-4">
          {nextUp ? (
            <BookingCard
              booking={nextUp.booking}
              event={nextUp.event}
              venue={nextUp.venue}
            />
          ) : (
            <EmptyState
              icon={<BookitIcon name="booking" className="size-5" />}
              title="Nothing coming up"
              description="When you buy a ticket, RSVP or make a reservation, it will show up here."
              action={{ label: "Browse events", href: "/events" }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
