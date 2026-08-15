import * as React from "react";
import Link from "next/link";
import type { BindingContext } from "@/domain/design-studio/bindings";
import type { BookitTemplate } from "@/domain/design-studio/types";
import { DesignBoard } from "@/components/design-studio/canvas/design-board";

/**
 * A gallery card.
 *
 * The preview takes almost the whole card and is rendered at a size a host can
 * actually judge — a wedding invitation shown at 120px tells you nothing except
 * roughly what colour it is. Everything below it is quiet: name, one line of
 * classification, the palette as dots, and the two actions.
 */

export interface TemplateCardProps {
  template: BookitTemplate;
  data: BindingContext;
}

function Preview({
  template,
  data,
  paletteId,
}: {
  template: BookitTemplate;
  data: BindingContext;
  /** Accepted for call-site symmetry; the board is fluid. */
  width?: number;
  paletteId?: string;
}) {
  // No measuring and no scale transform: the board is fluid and sizes itself
  // from its own container, so a card, the preview page and the editor all
  // render the identical design.
  return <DesignBoard template={template} data={data} paletteId={paletteId} />;
}

export function TemplateCard({ template, data }: TemplateCardProps) {
  return (
    <article className="group">
      <Link
        href={`/design/${template.slug}`}
        className="block overflow-hidden rounded-xl border border-line bg-surface-secondary transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_22px_60px_-34px_rgb(0_0_0/0.45)]"
      >
        <Preview template={template} data={data} width={520} />
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-ink">
            <Link href={`/design/${template.slug}`} className="hover:underline">
              {template.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted">{template.tagline}</p>
        </div>

        <ul className="mt-1 flex shrink-0 gap-1.5" aria-label="Colourways">
          {template.palettes.slice(0, 4).map((palette) => (
            <li key={palette.id}>
              <span
                title={palette.name}
                className="block size-3.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: palette.accent }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/design/${template.slug}`}
          className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-xs font-medium text-ink transition-[background-color,border-color] hover:border-ink/25 hover:bg-surface-secondary"
        >
          Preview suite
        </Link>
        <Link
          href={`/design/${template.slug}/studio`}
          className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-xs font-medium text-surface transition-[background-color] hover:bg-ink/90"
        >
          Customise
        </Link>
      </div>
    </article>
  );
}

TemplateCard.Preview = Preview;
