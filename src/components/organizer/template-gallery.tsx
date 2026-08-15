"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  INVITATION_TEMPLATES,
  TEMPLATE_MOODS,
  templateById,
  type InvitationTemplate,
} from "@/domain/invitation-templates";
import { resolveTheme, type PrivateDesign } from "@/domain/private-design";
import {
  InvitationCanvas,
  type InvitationContent,
} from "@/components/private/invitation-canvas";
import { cn } from "@/lib/utils";

/**
 * The template gallery.
 *
 * Every tile is the real renderer at a small scale, drawn with the host's own
 * names and date — not a stock thumbnail. So what a host is choosing between is
 * nine finished invitations for *their* ceremony, and picking one is the first
 * move rather than the last.
 *
 * Choosing a template also seeds the four axes with the colours and type it was
 * designed around. Those stay editable afterwards; the seed is a starting point,
 * not a lock.
 */

export interface TemplateGalleryProps {
  design: PrivateDesign;
  content: InvitationContent;
  onSelect: (patch: Partial<PrivateDesign>) => void;
}

export function TemplateGallery({ design, content, onSelect }: TemplateGalleryProps) {
  const [mood, setMood] = React.useState<string | null>(null);
  const current = templateById(design.templateId);

  const shown = mood
    ? INVITATION_TEMPLATES.filter((template) => template.mood === mood)
    : INVITATION_TEMPLATES;

  function choose(template: InvitationTemplate) {
    // Applying a template brings its art direction *and* the palette and type
    // it was designed around. A host who has already customised can move any
    // axis straight back afterwards.
    onSelect({
      templateId: template.id,
      paletteId: template.defaults.paletteId,
      fontId: template.defaults.fontId,
      backgroundId: template.defaults.backgroundId,
      heroLayout: template.defaults.heroLayout,
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Start from a design</h3>
          <p className="mt-0.5 text-sm text-muted">
            Nine finished invitations, each shown with your own names. Everything below stays
            editable.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MoodChip label="All" active={mood === null} onClick={() => setMood(null)} />
          {TEMPLATE_MOODS.map((option) => (
            <MoodChip
              key={option}
              label={option}
              active={mood === option}
              onClick={() => setMood(option)}
            />
          ))}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((template) => {
          const active = current.id === template.id;
          // Each tile previews in the template's own colours until it is the
          // selected one, which follows whatever the host has customised to.
          const theme = resolveTheme(
            active
              ? design
              : {
                  ...design,
                  paletteId: template.defaults.paletteId,
                  fontId: template.defaults.fontId,
                  backgroundId: template.defaults.backgroundId,
                  customPalette: null,
                },
          );

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
                    scale={0.42}
                    compact
                    style={{ width: "100%", height: "100%" }}
                  />
                </span>

                <span className="block border-t border-line bg-surface px-3 py-2">
                  <span className="block text-sm font-semibold text-ink">{template.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {template.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MoodChip({
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
