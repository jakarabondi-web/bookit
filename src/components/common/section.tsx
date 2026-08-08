import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionProps {
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
  children: React.ReactNode;
}

/** Section header with an optional "View All" link, used across the homepage. */
export function Section({
  title,
  description,
  viewAllHref,
  viewAllLabel = "View All",
  className,
  headingLevel: Heading = "h2",
  children,
}: SectionProps) {
  return (
    <section className={cn("py-8 lg:py-10", className)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <Heading className="text-xl font-bold text-ink lg:text-2xl">{title}</Heading>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover hover:underline"
          >
            {viewAllLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
