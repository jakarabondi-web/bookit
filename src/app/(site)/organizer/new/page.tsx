import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/current-user";
import { OrganizerCreateForm } from "@/components/auth/organizer-create-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create your organizer profile" };
export const dynamic = "force-dynamic";

export default async function CreateOrganizerPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/organizer/new");
  if (session.actor.organizerId) redirect("/organizer");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Create your organizer profile</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;ll start at the New trust tier — 20% of ticket revenue available before an
          event, the rest released 7 days after it ends, exactly like every organizer on Bookit.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <OrganizerCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
