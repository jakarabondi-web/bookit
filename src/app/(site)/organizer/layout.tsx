import Link from "next/link";
import { getContainer, DEMO_ORGANIZER_ID } from "@/server/container";
import { getSessionUser } from "@/server/auth/current-user";
import { OrganizerSidebar } from "@/components/organizer/organizer-sidebar";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { catalog } = getContainer();
  const session = await getSessionUser();
  const organizerId = session?.actor.organizerId ?? DEMO_ORGANIZER_ID;
  const organizer = await catalog.organizer(organizerId);

  // Signed in, but not yet an organizer themselves — they're looking at the
  // demo dataset. Say so, rather than let real-looking numbers pass as theirs.
  const previewingDemo = Boolean(session) && !session?.actor.organizerId;

  return (
    <div className="flex flex-col lg:flex-row">
      <OrganizerSidebar organizerName={organizer.name} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {previewingDemo ? (
            <div className="mb-6 flex flex-col gap-2 rounded-card border border-primary/30 bg-primary-tint p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink">
                You&apos;re previewing <span className="font-semibold">{organizer.name}</span>
                &apos;s demo dashboard — not your own.
              </p>
              <Link
                href="/organizer/new"
                className="shrink-0 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Create your organizer profile →
              </Link>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
