import type { Metadata } from "next";
import { BookingStatus } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { currentUserId } from "@/server/auth/current-user";
import { BookingCard } from "@/components/account/booking-card";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "My Bookings" };

export default async function AccountBookingsPage() {
  const { catalog, uow } = getContainer();
  const userId = await currentUserId();
  const user = await uow.repos.users.findById(userId);
  const rows = await catalog.bookingsForUser(userId, user?.email);
  const now = new Date().toISOString();

  const cancelled = rows.filter(
    ({ booking }) =>
      booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.DECLINED,
  );
  const upcoming = rows.filter(
    ({ booking, event }) =>
      event.endsAt >= now &&
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.DECLINED,
  );
  const past = rows.filter(
    ({ booking, event }) =>
      event.endsAt < now &&
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.DECLINED,
  );

  const groups = [
    {
      id: "upcoming",
      label: "Upcoming",
      rows: upcoming,
      empty: "Reservations and RSVPs you make will appear here.",
    },
    { id: "past", label: "Past", rows: past, empty: "Events you have attended will appear here." },
    {
      id: "cancelled",
      label: "Cancelled",
      rows: cancelled,
      empty: "Nothing cancelled — good news.",
    },
  ];

  return (
    <div>
      <h2 className="sr-only">My bookings</h2>
      <Tabs defaultValue="upcoming">
        <TabsList>
          {groups.map((group) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.label}
              <span className="ml-1.5 text-xs opacity-70">{group.rows.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => (
          <TabsContent key={group.id} value={group.id}>
            {group.rows.length === 0 ? (
              <EmptyState
                icon={<BookitIcon name="booking" className="size-5" />}
                title={`No ${group.label.toLowerCase()} bookings`}
                description={group.empty}
                action={{ label: "Make a booking", href: "/bookings" }}
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {group.rows.map((row) => (
                  <li key={row.booking.id}>
                    <BookingCard booking={row.booking} event={row.event} venue={row.venue} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
