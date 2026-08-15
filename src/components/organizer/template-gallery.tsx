"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import {
  COLLECTIONS,
  INVITATION_TEMPLATES,
  designForTemplate,
  resolveTheme,
  templateById,
  type Collection,
  type InvitationTemplate,
  type PrivateDesign,
} from "@/domain/private-design";
import {
  InvitationCanvas,
  type InvitationContent,
} from "@/components/private/invitation-canvas";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The template gallery.
 *
 * Every tile is the real renderer at a small scale, drawn with the host's own
 * names and date — not a stock thumbnail. What they choose between is a hundred
 * finished invitations for *their* ceremony.
 *
 * At this size the catalogue needs narrowing rather than browsing, so it offers
 * collections and a search across names and descriptions, and shows a page at a
 * time. Rendering a hundred live canvases at once is a second of layout work
 * nobody asked for.
 */

const PAGE_SIZE = 12;

export interface TemplateGalleryProps {
  design: PrivateDesign;
  content: InvitationContent;
  onSelect: (patch: Partial<PrivateDesign>) => void;
}

export function TemplateGallery({ design, content, onSelect }: TemplateGalleryProps) {
  const [collection, setCollection] = React.useState<Collection | null>(null);
  const [query, setQuery] = React.useState("");
  const [shown, setShown] = React.useState(PAGE_SIZE);

  const current = templateById(design.templateId);

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return INVITATION_TEMPLATES.filter((template) => {
      if (collection && template.collection !== collection) return false;
      if (!needle) return true;
      return (
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.collection.toLowerCase().includes(needle)
      );
    });
  }, [collection, query]);

  // A new filter starts at the top of its results rather than halfway down the
  // previous one's page count. Reset where the change happens, not in an
  // effect — an effect would render the long list once before trimming it.
  function narrow(next: { collection?: Collection | null; query?: string }) {
    if (next.collection !== undefined) setCollection(next.collection);
    if (next.query !== undefined) setQuery(next.query);
    setShown(PAGE_SIZE);
  }

  const visible = matches.slice(0, shown);

  function choose(template: InvitationTemplate) {
    onSelect(designForTemplate(template, design));
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Start from a design</h3>
          <p className="mt-0.5 text-sm text-muted">
            {INVITATION_TEMPLATES.length} finished invitations, each shown with your own names.
            Everything below stays editable.
          </p>
        </div>
        <label className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => narrow({ query: event.target.value })}
            placeholder="Search designs"
            aria-label="Search designs"
            className="h-9 w-56 pl-9 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by collection">
        <CollectionChip
          label={`All ${INVITATION_TEMPLATES.length}`}
          active={collection === null}
          onClick={() => narrow({ collection: null })}
        />
        {COLLECTIONS.map((option) => (
          <CollectionChip
            key={option}
            label={option}
            active={collection === option}
            onClick={() => narrow({ collection: option })}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          Nothing matches &ldquo;{query}&rdquo;. Try a collection instead.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((template) => {
            const active = current.id === template.id;
            // A tile previews in the template's own colours until it is the
            // selected one, which follows whatever the host has customised to.
            const theme = resolveTheme(active ? design : designForTemplate(template, design));

            return (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => choose(template)}
                  aria-pressed={active}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-card-sm border text-left transition-[border-color,box-shadow]",
                    active
                      ? "border-primary shadow-[0_0_0_2px_var(--color-primary-tint)]"
                      : "border-line hover:border-primary/50",
                  )}
                >
                  {active ? (
                    <span className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  ) : null}

                  <span className="block aspect-[3/4] overflow-hidden">
                    <InvitationCanvas
                      template={template}
                      theme={theme}
                      content={content}
                      scale={0.4}
                      compact
                      style={{ width: "100%", height: "100%" }}
                    />
                  </span>

                  <span className="block border-t border-line bg-surface px-3 py-2">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {template.name}
                      </span>
                      <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-muted sm:inline">
                        {template.collection}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">
                      {template.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {shown < matches.length ? (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE_SIZE)}
          className="mt-4 w-full rounded-card border border-line py-2.5 text-sm font-medium text-ink-secondary transition-[background-color,border-color] hover:border-primary/40 hover:bg-surface-secondary"
        >
          Show {Math.min(PAGE_SIZE, matches.length - shown)} more
          <span className="ml-1.5 text-muted">
            ({shown} of {matches.length})
          </span>
        </button>
      ) : null}
    </section>
  );
}

function CollectionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-3 py-1 text-xs font-medium transition-[background-color,border-color]",
        active
          ? "border-primary bg-primary-tint text-primary-hover"
          : "border-line text-ink-secondary hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}
