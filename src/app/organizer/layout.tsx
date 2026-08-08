import { DEMO_ORGANIZER_ID, getContainer } from "@/server/container";
import { OrganizerSidebar } from "@/components/organizer/organizer-sidebar";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { catalog } = getContainer();
  const organizer = await catalog.organizer(DEMO_ORGANIZER_ID);

  return (
    <div className="flex flex-col lg:flex-row">
      <OrganizerSidebar organizerName={organizer.name} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
