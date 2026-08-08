import type { Metadata } from "next";
import { TicketStatus } from "@/domain/enums";
import { DEMO_USER_ID, getContainer } from "@/server/container";
import { TicketCard } from "@/components/account/ticket-card";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "My Tickets" };

export default async function TicketsPage() {
  const { catalog } = getContainer();
  const rows = await catalog.ticketsForUser(DEMO_USER_ID);
  const now = new Date().toISOString();

  const active = rows.filter(
    ({ ticket, event }) => ticket.status === TicketStatus.ACTIVE && event.endsAt >= now,
  );
  const past = rows.filter(
    ({ ticket, event }) =>
      event.endsAt < now ||
      ticket.status === TicketStatus.CONSUMED ||
      ticket.status === TicketStatus.CHECKED_IN,
  );
  const transferred = rows.filter(({ ticket }) => ticket.status === TicketStatus.TRANSFERRED);
  const listed = rows.filter(
    ({ ticket }) => ticket.status === TicketStatus.LISTED || ticket.status === TicketStatus.SOLD,
  );

  const groups = [
    { id: "active", label: "Active", rows: active, empty: "You have no active tickets." },
    { id: "past", label: "Past", rows: past, empty: "Tickets you have used will appear here." },
    {
      id: "transferred",
      label: "Transferred",
      rows: transferred,
      empty: "Tickets you send to someone else will appear here.",
    },
    {
      id: "listed",
      label: "Listed / resold",
      rows: listed,
      empty: "Tickets you list on the resale marketplace will appear here.",
    },
  ];

  return (
    <div>
      <h2 className="sr-only">My tickets</h2>
      <Tabs defaultValue="active">
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
                icon={<BookitIcon name="ticket" className="size-5" />}
                title={`No ${group.label.toLowerCase()} tickets`}
                description={group.empty}
                action={{ label: "Find events", href: "/events" }}
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {group.rows.map((row) => (
                  <li key={row.ticket.id}>
                    <TicketCard
                      ticket={row.ticket}
                      event={row.event}
                      venue={row.venue}
                      ticketType={row.ticketType}
                    />
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
