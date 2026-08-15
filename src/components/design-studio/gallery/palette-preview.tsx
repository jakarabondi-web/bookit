import Link from "next/link";
import type { BookitTemplate } from "@/domain/design-studio/types";
import { cn } from "@/lib/utils";

/**
 * The colourways.
 *
 * Each swatch shows the palette as it is actually used — ground behind, accent
 * over it — rather than as a row of equal chips, because that ratio is what a
 * host is really choosing between. Links, so a chosen colourway survives being
 * shared or reloaded.
 */
export function PalettePreview({
  template,
  activeId,
}: {
  template: BookitTemplate;
  activeId: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {template.palettes.map((palette) => {
        const active = palette.id === activeId;
        return (
          <li key={palette.id}>
            <Link
              href={`/design/${template.slug}?palette=${palette.id}`}
              aria-current={active ? "true" : undefined}
              title={palette.name}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-full ring-1 transition-[box-shadow,transform]",
                active
                  ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                  : "ring-black/10 hover:scale-105",
              )}
              style={{ background: palette.ground }}
            >
              <span
                aria-hidden="true"
                className="block size-3.5 rounded-full"
                style={{ background: palette.accent }}
              />
              <span className="sr-only">{palette.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
