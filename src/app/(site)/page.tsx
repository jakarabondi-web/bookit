import { EventCategory } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { Section } from "@/components/common/section";
import { EventRail } from "@/components/events/event-rail";
import { BenefitStrip } from "@/components/home/benefit-strip";
import { BookingCta } from "@/components/home/booking-cta";
import { CategoryStrip } from "@/components/home/category-strip";
import { CityExplorer } from "@/components/home/city-explorer";
import { Hero } from "@/components/home/hero";
import { OrganizerCta } from "@/components/home/organizer-cta";
import { PrivateEventsShowcase } from "@/components/home/private-events-showcase";
import { TonightRail } from "@/components/home/tonight-rail";
import { CITIES } from "@/lib/cities";

export default async function HomePage() {
  const { catalog } = getContainer();

  // One parallel fetch for the whole page — each rail is an independent query.
  const [soon, popular, weekend, free, social, sports, trending, cityCounts] = await Promise.all([
    catalog.startingSoon(4),
    catalog.featured(5),
    catalog.thisWeekend(5),
    catalog.freeEvents(5),
    catalog.socialAndBookable(5),
    catalog.byCategory(EventCategory.SPORTS, 5),
    catalog.trendingIn("Nairobi", 5),
    catalog.cityCounts([...CITIES]),
  ]);

  const liveCount = cityCounts.reduce((total, entry) => total + entry.count, 0);

  return (
    <>
      <Hero liveCount={liveCount} />
      <TonightRail events={soon} />
      <CategoryStrip />

      <div className="page-shell">
        <Section title="Popular Events" viewAllHref="/events">
          <EventRail events={popular} priorityFirst />
        </Section>
      </div>

      <BookingCta />
      <BenefitStrip />

      <div className="page-shell">
        <Section
          title="This Weekend"
          description="Happening between Friday and Sunday."
          viewAllHref="/events?view=weekend"
        >
          <EventRail events={weekend} />
        </Section>

        <Section
          title="Free Events"
          description="No ticket needed — just RSVP."
          viewAllHref="/events?type=FREE_RSVP"
        >
          <EventRail events={free} />
        </Section>

        <Section
          title="Open for Booking"
          description="Reservations, banquets and recurring meetings currently taking guests."
          viewAllHref="/bookings"
        >
          <EventRail events={social} emptyMessage="Nothing open for booking right now." />
        </Section>

        <Section title="Sports" viewAllHref={`/events?category=${EventCategory.SPORTS}`}>
          <EventRail events={sports} />
        </Section>

        <Section title="Trending in Nairobi" viewAllHref="/events?city=Nairobi">
          <EventRail events={trending} />
        </Section>

        <Section title="Explore by City" viewAllHref="/events">
          <CityExplorer counts={cityCounts} />
        </Section>
      </div>

      <PrivateEventsShowcase />
      <OrganizerCta />
    </>
  );
}
