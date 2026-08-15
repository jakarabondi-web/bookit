"use client";

import * as React from "react";
import { Check, ImageDown, Loader2, Pipette, RotateCcw } from "lucide-react";
import {
  BORDERS,
  CUSTOM_PALETTE_ID,
  FONT_PAIRINGS,
  HERO_LAYOUTS,
  MOTIFS,
  PALETTES,
  activePalette,
  displayTypeStyle,
  resolveTheme,
  templateById,
  type Palette,
  type PrivateDesign,
} from "@/domain/private-design";
import type { InvitationContent } from "@/components/private/invitation-canvas";
import { TemplateGallery } from "@/components/organizer/template-gallery";
import { BorderOverlay } from "@/components/private/border-overlay";
import { extractPalette } from "@/lib/extract-palette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The design module.
 *
 * Four independent controls — colour, type, background, composition — with the
 * invitation redrawing beside them on every change. The host is never asked for
 * a hex code or a font size: each control offers named, curated choices that
 * have been checked against the others, and the fifth path (build your own
 * palette from a picture) still lands in that same vocabulary.
 */

export interface DesignModuleProps {
  design: PrivateDesign;
  onChange: (design: PrivateDesign) => void;
  /** The host's real content, so every thumbnail shows their own invitation. */
  content: InvitationContent;
  /** Rendered alongside the controls so a change is visible immediately. */
  preview: React.ReactNode;
}

const ROLE_LABELS: Array<{ key: keyof Palette; label: string }> = [
  { key: "background", label: "Page" },
  { key: "surface", label: "Cards" },
  { key: "accent", label: "Accent" },
  { key: "ink", label: "Text" },
];

export function DesignModule({ design, onChange, content, preview }: DesignModuleProps) {
  const set = React.useCallback(
    (patch: Partial<PrivateDesign>) => onChange({ ...design, ...patch }),
    [design, onChange],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-5">
        <TemplateGallery design={design} content={content} onSelect={set} />
        <PaletteControl design={design} set={set} />
        <TypeControl design={design} set={set} />
        <BorderControl design={design} set={set} />
        <BackgroundControl design={design} set={set} />
        <LayoutControl design={design} set={set} />
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Live preview
        </p>
        {preview}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- section -- */

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Shared selected-tile chrome, so every control reads as the same kind of thing. */
function tileClass(active: boolean) {
  return cn(
    "relative w-full rounded-card-sm border p-3 text-left transition-[background-color,border-color]",
    active
      ? "border-primary bg-primary-tint"
      : "border-line hover:border-primary/40 hover:bg-surface-secondary",
  );
}

function Tick() {
  return (
    <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check className="size-3" aria-hidden="true" />
    </span>
  );
}

/* -------------------------------------------------------------- palette -- */

function PaletteControl({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  const current = activePalette(design);
  const custom = design.customPalette ?? null;

  return (
    <Section
      title="Colour"
      description="Ten palettes, or build your own from a picture."
      action={<ImportPalette design={design} set={set} />}
    >
      {custom ? (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => set({ paletteId: CUSTOM_PALETTE_ID })}
            aria-pressed={design.paletteId === CUSTOM_PALETTE_ID}
            className={tileClass(design.paletteId === CUSTOM_PALETTE_ID)}
          >
            {design.paletteId === CUSTOM_PALETTE_ID ? <Tick /> : null}
            <span className="flex items-center gap-2">
              {[custom.background, custom.surface, custom.accent, custom.ink].map(
                (swatch, index) => (
                  <span
                    key={`${swatch}-${index}`}
                    className="size-6 rounded-md border border-line"
                    style={{ background: swatch }}
                    aria-hidden="true"
                  />
                ),
              )}
              <span className="ml-auto pr-5 text-sm font-semibold text-ink">{custom.name}</span>
            </span>
            <span className="mt-2 block text-xs text-muted">{custom.description}</span>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLE_LABELS.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {label}
                </span>
                <span className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
                  <input
                    type="color"
                    value={String(custom[key])}
                    onChange={(event) =>
                      set({
                        paletteId: CUSTOM_PALETTE_ID,
                        customPalette: { ...custom, [key]: event.target.value.toUpperCase() },
                      })
                    }
                    className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label={`${label} colour`}
                  />
                  <span className="font-mono text-[11px] tabular text-ink-secondary">
                    {String(custom[key])}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        {PALETTES.map((palette) => {
          const active = design.paletteId === palette.id;
          return (
            <li key={palette.id}>
              <button
                type="button"
                onClick={() => set({ paletteId: palette.id })}
                aria-pressed={active}
                className={tileClass(active)}
              >
                {active ? <Tick /> : null}
                <span className="flex items-center gap-2">
                  {[palette.background, palette.surface, palette.accent, palette.ink].map(
                    (swatch, index) => (
                      <span
                        key={`${palette.id}-${index}`}
                        className="size-6 rounded-md border border-line"
                        style={{ background: swatch }}
                        aria-hidden="true"
                      />
                    ),
                  )}
                  <span className="ml-auto pr-5 text-sm font-semibold text-ink">
                    {palette.name}
                  </span>
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-muted">
                  {palette.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Currently using <span className="font-medium text-ink">{current.name}</span>.
      </p>
    </Section>
  );
}

/**
 * Bringing in a look from somewhere else.
 *
 * Save the invitation you liked on Etsy, the flat-lay from Instagram, or a
 * photograph of your flowers, and drop it here. The colours are read out of
 * the picture in the browser — nothing is uploaded, and nothing is fetched
 * from those sites.
 */
function ImportPalette({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("From your image");

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const palette = await extractPalette(file, name.trim() || "From your image");
      if (!palette) {
        setError("No colours could be read from that image. Try a different one.");
        return;
      }
      set({ paletteId: CUSTOM_PALETTE_ID, customPalette: palette });
    } catch {
      setError("That image could not be read. Try a JPEG, PNG or WebP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          void handle(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        {design.customPalette ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => set({ paletteId: "gold-ivory", customPalette: null })}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Pipette className="size-4" aria-hidden="true" />
          )}
          {busy ? "Reading…" : "Pick colours from an image"}
        </Button>
      </div>
      <p className="max-w-[15rem] text-right text-[11px] leading-snug text-muted">
        <ImageDown className="mr-1 inline size-3 align-[-2px]" aria-hidden="true" />
        Save a design you like from Etsy, Pinterest or Instagram and drop it in — the colours are
        read here on your device.
      </p>
      {design.customPalette ? (
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (design.customPalette) {
              set({
                customPalette: { ...design.customPalette, name: event.target.value || "Custom" },
              });
            }
          }}
          className="h-8 w-48 text-xs"
          aria-label="Name your palette"
          placeholder="Name your palette"
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- type -- */

function TypeControl({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  const palette = activePalette(design);

  return (
    <Section
      title="Type"
      description="Chosen as a pair, so the headline and the body always sit together."
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {FONT_PAIRINGS.map((pairing) => {
          const active = design.fontId === pairing.id;
          return (
            <li key={pairing.id}>
              <button
                type="button"
                onClick={() => set({ fontId: pairing.id })}
                aria-pressed={active}
                className={tileClass(active)}
              >
                {active ? <Tick /> : null}
                {/* The specimen is the control: the name matters less than
                    seeing the face set at invitation size. */}
                <span
                  className="block truncate pr-5 text-[26px] leading-tight"
                  style={{ ...displayTypeStyle(pairing), color: palette.accent }}
                >
                  Wanjiru &amp; Kevin
                </span>
                <span className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{pairing.name}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {pairing.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ----------------------------------------------------------- background -- */

function BackgroundControl({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  const [family, setFamily] = React.useState<string | null>(null);
  const families = [...new Set(MOTIFS.map((motif) => motif.family))];
  const shown = family ? MOTIFS.filter((motif) => motif.family === family) : MOTIFS;

  return (
    <Section
      title="Background"
      description="Every pattern is drawn from your own accent colour, so none of them can clash."
      action={
        <div className="flex flex-wrap justify-end gap-1.5">
          <Chip label="All" active={family === null} onClick={() => setFamily(null)} />
          {families.map((option) => (
            <Chip
              key={option}
              label={option.charAt(0) + option.slice(1).toLowerCase()}
              active={family === option}
              onClick={() => setFamily(option)}
            />
          ))}
        </div>
      }
    >
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {shown.map((motif) => {
          const active = design.backgroundId === motif.id;
          const swatchTheme = resolveTheme({ ...design, backgroundId: motif.id });
          return (
            <li key={motif.id}>
              <button
                type="button"
                onClick={() => set({ backgroundId: motif.id })}
                aria-pressed={active}
                title={motif.description}
                className={tileClass(active)}
              >
                {active ? <Tick /> : null}
                <span
                  className="mb-1.5 block h-12 rounded-md border border-line"
                  style={{
                    background:
                      motif.family === "PHOTO"
                        ? `linear-gradient(135deg, ${swatchTheme.accent}55, ${swatchTheme.background})`
                        : swatchTheme.pageBackground,
                    // Half scale so a 48px tile shows several repeats rather
                    // than one smudge.
                    backgroundSize: motif.size
                      ? `${Math.round(motif.size / 2)}px`
                      : undefined,
                  }}
                  aria-hidden="true"
                />
                <span className="block truncate text-xs font-semibold text-ink">{motif.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/**
 * Ornament.
 *
 * Each swatch draws the real border at a small scale over the live palette, so
 * a host is choosing between pictures of the thing rather than its name.
 */
function BorderControl({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  const template = templateById(design.templateId);
  const currentId = design.borderId ?? template.borderId;
  const theme = resolveTheme(design);

  return (
    <Section
      title="Ornament"
      description="Rules, corners, engraved bands and shaped edges."
    >
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {BORDERS.map((border) => {
          const active = currentId === border.id;
          return (
            <li key={border.id}>
              <button
                type="button"
                onClick={() => set({ borderId: border.id })}
                aria-pressed={active}
                title={border.description}
                className={tileClass(active)}
              >
                {active ? <Tick /> : null}
                <span
                  className="relative mb-1.5 block h-20 overflow-hidden rounded-md border border-line"
                  style={{ background: theme.background }}
                  aria-hidden="true"
                >
                  {/* Near full scale: a band drawn at 0.4 collapses to a
                      sub-pixel line and reads as an empty swatch. */}
                  <BorderOverlay border={border} accent={theme.accent} scale={0.9} />
                </span>
                <span className="block truncate text-xs font-semibold text-ink">{border.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* --------------------------------------------------------------- layout -- */


function LayoutControl({
  design,
  set,
}: {
  design: PrivateDesign;
  set: (patch: Partial<PrivateDesign>) => void;
}) {
  return (
    <Section
      title="Composition"
      description="How the top of the invitation is arranged."
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HERO_LAYOUTS.map((layout) => {
          const active = design.heroLayout === layout.id;
          return (
            <li key={layout.id}>
              <button
                type="button"
                onClick={() => set({ heroLayout: layout.id })}
                aria-pressed={active}
                className={tileClass(active)}
              >
                {active ? <Tick /> : null}
                <LayoutGlyph id={layout.id} />
                <span className="mt-2 block text-sm font-semibold text-ink">{layout.name}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">
                  {layout.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** A diagram of the arrangement — faster to read than any wording of it. */
function LayoutGlyph({ id }: { id: string }) {
  const photo = "fill-primary/25";
  const line = "fill-ink/25";

  return (
    <svg viewBox="0 0 64 44" className="h-11 w-full" aria-hidden="true">
      <rect x="0" y="0" width="64" height="44" rx="4" className="fill-surface-secondary" />
      {id === "OVERLAY" ? (
        <>
          <rect x="4" y="4" width="56" height="36" rx="3" className={photo} />
          <rect x="14" y="26" width="36" height="4" rx="2" className={line} />
          <rect x="21" y="33" width="22" height="2.5" rx="1.25" className={line} />
        </>
      ) : null}
      {id === "STACKED" ? (
        <>
          <rect x="4" y="4" width="56" height="20" rx="3" className={photo} />
          <rect x="14" y="29" width="36" height="4" rx="2" className={line} />
          <rect x="21" y="36" width="22" height="2.5" rx="1.25" className={line} />
        </>
      ) : null}
      {id === "FRAMED" ? (
        <>
          <rect x="12" y="4" width="40" height="18" rx="2" className={photo} />
          <rect x="14" y="27" width="36" height="4" rx="2" className={line} />
          <rect x="21" y="34" width="22" height="2.5" rx="1.25" className={line} />
        </>
      ) : null}
      {id === "TYPE_ONLY" ? (
        <>
          <rect x="10" y="14" width="44" height="5" rx="2.5" className={line} />
          <rect x="18" y="24" width="28" height="3" rx="1.5" className={line} />
          <rect x="24" y="31" width="16" height="2.5" rx="1.25" className={line} />
        </>
      ) : null}
    </svg>
  );
}

function Chip({
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
        "rounded-pill border px-2.5 py-0.5 text-[11px] font-medium transition-[background-color,border-color]",
        active
          ? "border-primary bg-primary-tint text-primary-hover"
          : "border-line text-ink-secondary hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}
