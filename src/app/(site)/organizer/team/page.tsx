import type { Metadata } from "next";
import { Role } from "@/domain/enums";
import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Team" };

/** What each role can actually do — least privilege, stated plainly. */
const ROLE_SCOPE: Partial<Record<Role, string>> = {
  ORGANIZER_OWNER: "Everything, including payouts, settlement accounts and removing members.",
  ORGANIZER_ADMIN: "Everything except changing the settlement account or removing the owner.",
  EVENT_MANAGER: "Create and edit events, manage guest lists and run check-in. No finance access.",
  FINANCE: "View orders, refunds and settlement. Cannot approve payouts.",
  FINANCE_MANAGER: "Approve payouts and bulk refunds. Cannot request the payouts they approve.",
  CHECK_IN_STAFF: "Scan tickets and check guests in at the gate. No access to customer data.",
  SUPPORT_AGENT: "Look up orders and bookings to help attendees. Cannot move money.",
};

const ROLE_TONE: Partial<Record<Role, "brand" | "success" | "info" | "neutral">> = {
  ORGANIZER_OWNER: "brand",
  ORGANIZER_ADMIN: "brand",
  EVENT_MANAGER: "info",
  FINANCE: "success",
  FINANCE_MANAGER: "success",
};

export default async function TeamPage() {
  const { catalog, uow } = getContainer();
  const organizer = await catalog.organizer(DEMO_ORGANIZER_ID);

  const members = await Promise.all(
    organizer.members.map(async (member) => ({
      member,
      user: await uow.repos.users.findById(member.userId),
    })),
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Team</h1>
          <p className="mt-1 text-sm text-muted">
            Who can do what on {organizer.name}, and with which permissions.
          </p>
        </div>
        <Button disabled title="Not available yet">Invite member</Button>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Members</h2>
        <ul className="flex flex-col gap-3">
          {members.map(({ member, user }) => (
            <li key={member.userId}>
              <Card>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary">
                      {initials(user?.fullName ?? "Member")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{user?.fullName ?? member.userId}</p>
                      <p className="truncate text-sm text-muted">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {user?.mfaEnabled ? (
                      <Badge tone="success">2FA on</Badge>
                    ) : (
                      <Badge tone="warning">2FA off</Badge>
                    )}
                    <Badge tone={ROLE_TONE[member.role] ?? "neutral"}>
                      {member.role.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                    <span className="text-xs text-muted">
                      Added {formatDate(member.addedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Roles</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Bookit follows least privilege: give people the narrowest role that lets them do their
          job. High-risk financial actions additionally require two different people.
        </p>
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-line">
              {(Object.keys(ROLE_SCOPE) as Role[]).map((role) => (
                <li key={role} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                  <div className="sm:w-56 sm:shrink-0">
                    <Badge tone={ROLE_TONE[role] ?? "neutral"}>
                      {role.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-secondary">{ROLE_SCOPE[role]}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
