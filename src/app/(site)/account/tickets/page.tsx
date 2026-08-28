import type { Metadata } from "next";
import { TicketStatus } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { currentUserId } from "@/server/auth/current-user";
import { TicketCard } from "@/components/account/ticket-card";
import { BookitIcon } from "@/components/ui/bookit-icon";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "My Tickets" };

export default async function TicketsPage() {
  const { catalog } = getContainer();
  const rows = await catalog.ticketsForUser(await currentUserId());
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
  // A pending transfer suspends the ticket, so SUSPENDED belongs here too —
  // otherwise a ticket mid-transfer matches no tab, disappears from the
  // account area entirely, and the sender loses the only route to cancelling.
  const transferred = rows.filter(
    ({ ticket }) =>
      ticket.status === TicketStatus.TRANSFERRED || ticket.status === TicketStatus.SUSPENDED,
  );
  const listed = rows.filter(
    ({ ticket }) => ticket.status === TicketStatus.LISTED || ticket.status === TicketStatus.SOLD,
  );

  const groups = [
    { id: "active", label: "Active", rows: active, empty: "You have no active tickets." },
    { id: "past", label: "Past", rows: past, empty: "Tickets you have used will appear here." },
    {
      id: "transferred",
      label: "Transfers",
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
                      pendingTransfer={row.pendingTransfer}
                      activeListing={row.activeListing}
                      maxResalePrice={row.maxResalePrice}
                      resaleOpen={row.resaleOpen}
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
