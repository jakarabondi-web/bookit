"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Wand2 } from "lucide-react";
import { DEFAULT_CONTEXT, type BindingContext } from "@/domain/design-studio/bindings";
import { initialDesign, resolvedPalette, type StudioDesign } from "@/domain/design-studio/operations";
import { SUITE_NOTES, buildSuite } from "@/domain/design-studio/suite";
import { CANVAS_SIZES, type BookitTemplate, type SuitePiece } from "@/domain/design-studio/types";
import { DesignBoard } from "@/components/design-studio/canvas/design-board";
import { cn } from "@/lib/utils";

/**
 * The suite.
 *
 * The page exists to make one argument, and it makes it by showing rather than
 * saying: this is not eleven designs, it is one design at eleven sizes. The
 * type, the frame, the ornament and the margins on the place card are the ones
 * on the invitation, because they are read off the invitation every time this
 * page renders.
 *
 * Which is why it reads the studio draft. A host who has spent twenty minutes
 * taking a card deeper and setting the names in gold should arrive here and
 * find the menu already gold — that is the whole promise of choosing a design
 * inside the platform the event lives in, and it would be a strange promise to
 * make and then show them the original.
 */

export interface SuiteViewProps {
  template: BookitTemplate;
  initialPaletteId: string | null;
}

export function SuiteView({ template, initialPaletteId }: SuiteViewProps) {
  const [paletteOverride, setPaletteOverride] = React.useState<string | null>(initialPaletteId);
  const [useDraft, setUseDraft] = React.useState(true);

  const stored = React.useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(`bookit.design-studio.${template.slug}`),
    () => null,
  );

  const draft = React.useMemo(() => parseDraft(stored, template.id), [stored, template.id]);
  const base = React.useMemo(
    () => initialDesign(template, initialPaletteId),
    [template, initialPaletteId],
  );

  const design = useDraft && draft ? draft.design : base;
  const data = useDraft && draft ? draft.data : DEFAULT_CONTEXT;

  const palette = React.useMemo(
    () =>
      resolvedPalette(
        paletteOverride ? { ...design, paletteId: paletteOverride, colourMoves: [] } : design,
        template,
      ),
    [design, template, paletteOverride],
  );

  const pieces = React.useMemo(
    () => buildSuite(template, design.elements, data),
    [template, design.elements, data],
  );

  const invitation: SuitePiece = {
    kind: "invitation",
    name: "Invitation",
    size: template.size,
    elements: design.elements,
  };

  return (
    <div className="page-shell pb-24 pt-8 lg:pt-12">
      <Link
        href={`/design/${template.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {template.name}
      </Link>

      <header className="mt-8 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          The complete suite
        </p>
        <h1 className="mt-5 font-display text-[2.2rem] font-bold leading-[1.08] tracking-[-0.02em] text-ink lg:text-[3rem]">
          One decision, eleven pieces.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-secondary lg:text-lg">
          The save the date in March, the details card in the envelope, the programme in the hand,
          the place card at every seat, the sign at the door, the thank you in July. Every one of
          them is set from {template.name}&rsquo;s own margins, type scale and ornament — so
          changing the design changes the set, and nothing can drift out of sync.
        </p>
      </header>

      {/* Controls */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-y border-line py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Colourway
          </span>
          {template.palettes.map((entry) => {
            const active = paletteOverride
              ? paletteOverride === entry.id
              : design.paletteId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setPaletteOverride(entry.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs transition-[border-color,background-color]",
                  active
                    ? "border-ink/30 bg-surface text-ink"
                    : "border-line text-ink-secondary hover:border-ink/20 hover:bg-surface",
                )}
              >
                <span className="flex">
                  {[entry.ground, entry.accent, entry.ink].map((colour, index) => (
                    <span
                      key={index}
                      className="size-4 rounded-full border border-black/10"
                      style={{ background: colour, marginLeft: index ? -6 : 0 }}
                    />
                  ))}
                </span>
                {entry.name}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {draft ? (
            <button
              type="button"
              onClick={() => setUseDraft((current) => !current)}
              className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
            >
              {useDraft ? "Show the original design" : "Show my studio draft"}
            </button>
          ) : null}
          <Link
            href={`/design/${template.slug}/studio`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-surface transition-[background-color] hover:bg-ink/90"
          >
            <Wand2 className="size-4" aria-hidden="true" />
            Open the studio
          </Link>
        </div>
      </div>

      {draft && useDraft ? (
        <p className="mt-4 text-sm text-muted">
          Showing your studio draft — the whole suite follows the changes you made.
        </p>
      ) : null}

      {/* Pieces */}
      <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {[invitation, ...pieces].map((piece) => (
          <li
            key={piece.kind}
            className={cn(wide(piece) && "sm:col-span-2 lg:col-span-2", small(piece) && "self-end")}
          >
            <Piece
              piece={piece}
              template={template}
              design={design}
              data={data}
              palette={palette}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Piece({
  piece,
  template,
  design,
  data,
  palette,
}: {
  piece: SuitePiece;
  template: BookitTemplate;
  design: StudioDesign;
  data: BindingContext;
  palette: ReturnType<typeof resolvedPalette>;
}) {
  const canvas = CANVAS_SIZES[piece.size];
  const note = SUITE_NOTES[piece.kind];

  return (
    <figure>
      <div className="flex justify-center rounded-2xl bg-surface-secondary px-5 py-8 lg:px-8 lg:py-10">
        <div
          className="w-full shadow-[0_26px_60px_-40px_rgb(0_0_0/0.55)]"
          style={{ maxWidth: piece.size === "place" ? 340 : piece.size === "story" ? 260 : 420 }}
        >
          <DesignBoard
            template={template}
            data={data}
            palette={palette}
            fonts={design.fontSystem}
            paper={design.paper}
            elements={piece.elements}
            size={piece.size}
          />
        </div>
      </div>

      <figcaption className="mt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-base font-bold text-ink">{piece.name}</h2>
          <span className="shrink-0 text-xs text-muted">
            {canvas.inches.width}&Prime; × {canvas.inches.height}&Prime;
          </span>
        </div>
        {note ? <p className="mt-1 text-sm leading-relaxed text-muted">{note}</p> : null}
      </figcaption>
    </figure>
  );
}

function wide(piece: SuitePiece): boolean {
  return piece.size === "landscape";
}

function small(piece: SuitePiece): boolean {
  return piece.size === "place";
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function parseDraft(
  raw: string | null,
  templateId: string,
): { design: StudioDesign; data: BindingContext } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { design?: StudioDesign; data?: BindingContext };
    if (!parsed.design || parsed.design.templateId !== templateId || !parsed.data) return null;
    return { design: parsed.design, data: parsed.data };
  } catch {
    return null;
  }
}
