import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_CONTEXT } from "@/domain/design-studio/bindings";
import { TEMPLATES, templateBySlug } from "@/domain/design-studio/templates";
import { DesignStudio } from "@/components/design-studio/studio/design-studio";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = templateBySlug(slug);
  if (!template) return { title: "Studio" };
  return {
    title: `${template.name} · Studio`,
    description: `Customise ${template.name} by describing what you want.`,
  };
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ slug: template.slug }));
}

/**
 * The studio.
 *
 * A thin server shell: it resolves the template and the starting colourway from
 * the URL, then hands both to the client. Everything after that is local — the
 * design lives in the browser and saves there, so a host can sit with a card
 * for an hour without an account and without a round trip per keystroke.
 */
export default async function StudioPage({
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

  const paletteId = typeof search.palette === "string" ? search.palette : null;

  return (
    <DesignStudio
      template={template}
      initialPaletteId={paletteId}
      initialData={DEFAULT_CONTEXT}
    />
  );
}
