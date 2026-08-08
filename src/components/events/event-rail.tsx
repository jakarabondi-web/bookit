import type { EventSummary } from "@/domain/types";
import { EmptyState } from "@/components/ui/states";
import { EventCard } from "./event-card";

/**
 * Grid on desktop, horizontal scroller on mobile — one card component, two
 * layouts, no duplicated markup.
 */
export function EventRail({
  events,
  columns = 5,
  emptyMessage = "Nothing scheduled here yet. Check back soon.",
  priorityFirst,
}: {
  events: EventSummary[];
  columns?: 4 | 5;
  emptyMessage?: string;
  priorityFirst?: boolean;
}) {
  if (events.length === 0) {
    return <EmptyState title="No events yet" description={emptyMessage} />;
  }

  const gridClass =
    columns === 4
      ? "hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-4"
      : "hidden gap-5 sm:grid sm:grid-cols-3 lg:grid-cols-5";

  return (
    <>
      <div className={gridClass}>
        {events.map((summary, index) => (
          <EventCard
            key={summary.event.id}
            summary={summary}
            priority={priorityFirst && index < 3}
          />
        ))}
      </div>
      <div className="scroll-rail sm:hidden">
        {events.map((summary) => (
          <EventCard key={summary.event.id} summary={summary} railWidth />
        ))}
      </div>
    </>
  );
}
