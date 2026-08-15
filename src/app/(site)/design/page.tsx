import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEFAULT_CONTEXT } from "@/domain/design-studio/bindings";
import { TEMPLATES, collections, filterTemplates } from "@/domain/design-studio/templates";
import type { DesignDirection, EventKind } from "@/domain/design-studio/types";
import { TemplateCard } from "@/components/design-studio/gallery/template-card";
import { GalleryFilters } from "@/components/design-studio/gallery/gallery-filters";

export const metadata: Metadata = {
  title: "Design Studio",
  description:
    "Curated invitation collections created for modern weddings, traditional celebrations and unforgettable private events.",
};

/**
 * The Design Studio front door.
 *
 * Deliberately an editorial gallery rather than a dashboard: no metric cards,
 * no widgets, no rows of pills. One headline, one line of supporting copy, and
 * then the work — shown large enough to actually judge, because a host choosing
 * the identity of their wedding is choosing from the designs, not from a grid
 * of thumbnails.
 */
export default async function DesignStudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const direction = single(params.direction) as DesignDirection | null;
  const event = single(params.event) as EventKind | null;
  const query = single(params.q) ?? "";

  const results = filterTemplates({ direction, event, query });
  const groups = collections();

  return (
    <div className="page-shell pb-20 pt-10 lg:pt-16">
      {/* Masthead */}
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          Bookit Design Studio
        </p>
        <h1 className="mt-5 font-display text-[2.5rem] font-bold leading-[1.06] tracking-[-0.02em] text-ink lg:text-[3.4rem]">
          Find a design worthy of the occasion.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-secondary lg:text-lg">
          Explore curated invitation collections created for modern weddings, traditional
          celebrations and unforgettable private events. Choose the design once — Bookit carries
          it through the invitation, the RSVP, the programme and the event website.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="#gallery"
            className="inline-flex h-12 items-center rounded-xl bg-ink px-6 text-sm font-medium text-surface transition-[background-color] hover:bg-ink/90"
          >
            Start from a template
          </Link>
          <Link
            href="/design/for-me"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-line px-6 text-sm font-medium text-ink transition-[background-color,border-color] hover:border-ink/30 hover:bg-surface-secondary"
          >
            Design for me
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Collections */}
      <section className="mt-16 lg:mt-20">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-ink lg:text-2xl">
            Featured collections
          </h2>
          <p className="text-sm text-muted">{groups.length} collections</p>
        </div>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.slice(0, 3).map((template) => (
            <li key={template.id}>
              <Link
                href={`/design/${template.slug}`}
                className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] duration-200 hover:border-ink/20 hover:shadow-[0_18px_50px_-30px_rgb(0_0_0/0.4)]"
              >
                <span className="block overflow-hidden bg-surface-secondary">
                  <TemplateCard.Preview template={template} data={DEFAULT_CONTEXT} />
                </span>
                <span className="block p-5">
                  <span className="block font-display text-lg font-bold text-ink">
                    {template.collection}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{template.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Gallery */}
      <section id="gallery" className="mt-16 scroll-mt-24 lg:mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-ink lg:text-2xl">Invitations</h2>
          <p className="text-sm text-muted">
            {results.length} {results.length === 1 ? "design" : "designs"}
          </p>
        </div>

        <GalleryFilters direction={direction} event={event} query={query} />

        {results.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line px-8 py-16 text-center text-sm text-muted">
            Nothing matches those filters yet. The library is growing — try a different direction.
          </p>
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} data={DEFAULT_CONTEXT} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
