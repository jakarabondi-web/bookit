import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";

const BENEFITS: Array<{ icon: BookitIconName; title: string; description: string }> = [
  {
    icon: "search",
    title: "Easy Search",
    description: "Find events and venues near you quickly.",
  },
  {
    icon: "booking",
    title: "Secure Booking",
    description: "Safe payments and instant confirmations.",
  },
  {
    icon: "ticket",
    title: "Flexible Options",
    description: "Buy tickets, RSVP or make reservations.",
  },
  {
    icon: "rsvp",
    title: "Manage Bookings",
    description: "View and manage all your events in one place.",
  },
];

export function BenefitStrip() {
  return (
    <section className="page-shell py-8" aria-label="Why Bookit">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <li key={benefit.title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
              <BookitIcon name={benefit.icon} className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">{benefit.title}</h3>
              <p className="mt-0.5 text-sm text-muted">{benefit.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
