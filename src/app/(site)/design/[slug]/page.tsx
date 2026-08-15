import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_CONTEXT, LONG_NAME_CONTEXT } from "@/domain/design-studio/bindings";
import { TEMPLATES, templateBySlug } from "@/domain/design-studio/templates";
import { DesignBoard } from "@/components/design-studio/canvas/design-board";
import { PalettePreview } from "@/components/design-studio/gallery/palette-preview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = templateBySlug(slug);
  if (!template) return { title: "Design" };
  return { title: template.name, description: template.description };
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ slug: template.slug }));
}

/**
 * The template preview.
 *
 * Clicking a design opens this rather than dropping the host straight into an
 * editor: the decision they are making here is whether this is the identity of
 * their wedding, and that decision is made by looking at the thing large, in
 * its colourways, beside the pieces it will become.
 */
export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const template = templateBySlug(slug);
  if (!template) notFound();

  const paletteId =
    typeof search.palette === "string" ? search.palette : template.palettes[0]!.id;

  return (
    <div className="page-shell pb-24 pt-8 lg:pt-12">
      <Link
        href="/design"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All designs
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        {/* The design, shown large. */}
        <div>
          <div className="flex justify-center rounded-3xl bg-surface-secondary px-6 py-10 lg:px-12 lg:py-16">
            <div className="w-full max-w-[420px] shadow-[0_40px_90px_-50px_rgb(0_0_0/0.55)]">
              <DesignBoard template={template} data={DEFAULT_CONTEXT} paletteId={paletteId} />
            </div>
          </div>

          {/* The stress case is part of the product, not a hidden test. */}
          <section className="mt-14">
            <h2 className="font-display text-lg font-bold text-ink">Holds a longer name</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Every design in the library is composed against a long two-part name as well as a
              short one, so it will hold yours.
            </p>
            <div className="mt-5 flex justify-center rounded-2xl border border-line bg-surface-secondary px-6 py-10">
              <div className="w-full max-w-[320px] shadow-[0_28px_70px_-44px_rgb(0_0_0/0.5)]">
                <DesignBoard template={template} data={LONG_NAME_CONTEXT} paletteId={paletteId} />
              </div>
            </div>
          </section>
        </div>

        {/* Information and actions. */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {template.collection}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink">
            {template.name}
          </h1>
          <p className="mt-2 text-sm text-muted">{template.tagline}</p>

          <p className="mt-6 text-sm leading-relaxed text-ink-secondary">{template.description}</p>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              href={`/design/${template.slug}/studio?palette=${paletteId}`}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-medium text-surface transition-[background-color] hover:bg-ink/90"
            >
              Customise this design
            </Link>
            <Link
              href={`/design/${template.slug}/suite?palette=${paletteId}`}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line text-sm font-medium text-ink transition-[background-color,border-color] hover:border-ink/25 hover:bg-surface-secondary"
            >
              Preview the complete suite
            </Link>
          </div>

          <dl className="mt-10 flex flex-col divide-y divide-line border-y border-line text-sm">
            <Fact label="Colourways">
              <PalettePreview template={template} activeId={paletteId} />
            </Fact>
            <Fact label="Typography">
              <span className="block text-ink" style={{ fontFamily: template.fontSystem.display }}>
                {template.fontSystem.display.match(/--font-([a-z-]+)/)?.[1] ?? "Display"}
              </span>
              <span
                className="mt-0.5 block text-xs text-muted"
                style={{ fontFamily: template.fontSystem.body }}
              >
                with {template.fontSystem.body.match(/--font-([a-z-]+)/)?.[1] ?? "body"}
              </span>
            </Fact>
            <Fact label="Occasions">
              <span className="text-ink-secondary">
                {template.events.map(labelise).join(" · ")}
              </span>
            </Fact>
            <Fact label="Paper">
              <span className="text-ink-secondary">{labelise(template.paper)}</span>
            </Fact>
            {template.culturalTags?.length ? (
              <Fact label="Reference">
                <span className="text-ink-secondary">{template.culturalTags.join(" · ")}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted">
                  Designed as an interpretation, not a reproduction. Bookit does not claim
                  ceremonial authenticity for any design.
                </span>
              </Fact>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function labelise(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
