import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEMPLATES, templateBySlug } from "@/domain/design-studio/templates";
import { SuiteView } from "@/components/design-studio/suite/suite-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = templateBySlug(slug);
  if (!template) return { title: "Suite" };
  return {
    title: `${template.name} · The complete suite`,
    description: `Every piece an event carries, set from ${template.name}: save the date, details, reply card, programme, menu, place cards, signage and thank you.`,
  };
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ slug: template.slug }));
}

export default async function SuitePage({
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

  return (
    <SuiteView
      template={template}
      initialPaletteId={typeof search.palette === "string" ? search.palette : null}
    />
  );
}
