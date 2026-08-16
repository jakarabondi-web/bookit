"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { FONT_PAIRINGS } from "@/domain/design/fonts";
import type { BindingContext } from "@/domain/design-studio/bindings";
import { clarification, followUps, starterPrompts } from "@/domain/design-studio/guidance";
import { asOperations, operationsSchema } from "@/domain/design-studio/operation-schema";
import {
  applyOperations,
  initialDesign,
  resolvedPalette,
  type DesignOperation,
  type StudioDesign,
} from "@/domain/design-studio/operations";
import { interpret } from "@/domain/design-studio/prompting";
import { roleOf } from "@/domain/design-studio/semantics";
import type { BookitTemplate } from "@/domain/design-studio/types";
import { DesignBoard } from "@/components/design-studio/canvas/design-board";
import { cn } from "@/lib/utils";
import { OccasionDetails } from "./occasion-details";
import { PromptConsole, type StudioTurn } from "./prompt-console";

/**
 * The studio.
 *
 * The whole editor is a prompt and a card. There is no layer tree, no
 * properties inspector, no eight-tab left rail — those are the tools of someone
 * who already knows what a leading value is, and a host planning their ruracio
 * does not and should not have to.
 *
 * Everything a prompt can do goes through the same closed set of operations in
 * `operations.ts`, applied under the template's own design rules. That is what
 * makes an open text box safe: the instruction is translated, not executed. The
 * design cannot be broken by asking for something odd, only refused with a
 * reason — and the reason is where a host actually learns what makes an
 * invitation work.
 */

export interface DesignStudioProps {
  template: BookitTemplate;
  initialPaletteId: string | null;
  initialData: BindingContext;
}

interface Snapshot {
  design: StudioDesign;
  turns: StudioTurn[];
}

type Tab = "design" | "details";

const PAIRING_SUMMARY = FONT_PAIRINGS.map((pairing) => ({
  id: pairing.id,
  name: pairing.name,
  description: pairing.description,
}));

export function DesignStudio({ template, initialPaletteId, initialData }: DesignStudioProps) {
  const [design, setDesign] = React.useState(() => initialDesign(template, initialPaletteId));
  const [turns, setTurns] = React.useState<StudioTurn[]>([]);
  const [data, setData] = React.useState(initialData);
  const [undoStack, setUndoStack] = React.useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = React.useState<Snapshot[]>([]);
  const [pending, setPending] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("design");
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [draftDismissed, setDraftDismissed] = React.useState(false);

  const palette = React.useMemo(() => resolvedPalette(design, template), [design, template]);
  const starters = React.useMemo(() => starterPrompts(template), [template]);
  const storageKey = `bookit.design-studio.${template.slug}`;

  /* ------------------------------------------------------------- saving -- */

  /**
   * The saved draft, read as what it is: an external store.
   *
   * It is deliberately not restored on its own. Reopening a design and finding
   * last week's half-finished experiment already applied — with no way to tell
   * whether that is the template or your own edit — is disorienting in a way a
   * one-line offer is not. So the studio opens on the design as its designer
   * left it, and offers the draft.
   */
  const stored = React.useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(storageKey),
    () => null,
  );

  const draft = React.useMemo(() => parseDraft(stored, template.id), [stored, template.id]);

  React.useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ design, data, turns }));
        setSaved(true);
      } catch {
        // Storage full or blocked. The design is still in memory and still on
        // screen; a failed autosave is not worth interrupting someone for.
      }
      setDirty(false);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [dirty, design, data, turns, storageKey]);

  /* ------------------------------------------------------------ history -- */

  const commit = React.useCallback(
    (nextDesign: StudioDesign, nextTurns: StudioTurn[]) => {
      setUndoStack((stack) => [...stack.slice(-40), { design, turns }]);
      setRedoStack([]);
      setDesign(nextDesign);
      setTurns(nextTurns);
      setDirty(true);
    },
    [design, turns],
  );

  const updateData = (next: BindingContext) => {
    setData(next);
    setDirty(true);
  };

  const undo = () => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      setRedoStack((forward) => [...forward, { design, turns }]);
      setDesign(previous.design);
      setTurns(previous.turns);
      return stack.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((stack) => {
      const next = stack[stack.length - 1];
      if (!next) return stack;
      setUndoStack((back) => [...back, { design, turns }]);
      setDesign(next.design);
      setTurns(next.turns);
      return stack.slice(0, -1);
    });
  };

  /* -------------------------------------------------------------- doing -- */

  const runOperations = React.useCallback(
    (prompt: string, operations: DesignOperation[], reply: string, source: StudioTurn["source"]) => {
      const result = applyOperations(design, template, operations);
      const changed = result.notes.length > 0;

      const turn: StudioTurn = {
        id: `${Date.now()}-${turns.length}`,
        prompt,
        reply:
          reply ||
          (changed ? "Done." : "I've left that one as it is — here is why."),
        operations,
        notes: result.notes,
        refusals: result.refusals,
        source,
        canUndo: changed,
        suggestions: followUps(result.design, template),
      };

      commit(result.design, [...turns, turn]);
    },
    [design, template, turns, commit],
  );

  const submit = React.useCallback(
    async (prompt: string) => {
      const intent = interpret(prompt, { design, template });

      if (!intent.unresolved) {
        runOperations(prompt, intent.operations, "", "studio");
        return;
      }

      // Nothing in the local vocabulary matched. Ask the model, which answers in
      // the same closed operation set — and if there is no key configured, or
      // the call fails, fall back to guidance rather than to an error.
      setPending(true);
      try {
        const response = await fetch("/api/v1/design/interpret", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt,
            design: {
              template: template.name,
              collection: template.collection,
              directions: template.directions,
              colourway: palette.name,
              colourways: template.palettes.map((entry) => ({ id: entry.id, name: entry.name })),
              typePairings: PAIRING_SUMMARY,
              roles: [...new Set(design.elements.map((element) => roleOf(element, template)))],
              designerMode: design.designerMode,
            },
            history: turns.slice(-3).map((turn) => ({ prompt: turn.prompt, reply: turn.reply })),
          }),
        });

        const body = (await response.json()) as {
          data?: { operations?: unknown; reply?: string | null };
        };
        const parsed = operationsSchema.safeParse(body.data?.operations ?? []);

        if (parsed.success && parsed.data.length > 0) {
          runOperations(prompt, asOperations(parsed.data), body.data?.reply ?? "", "assistant");
          return;
        }

        guide(prompt, body.data?.reply ?? null);
      } catch {
        guide(prompt, null);
      } finally {
        setPending(false);
      }

      function guide(asked: string, reply: string | null) {
        const turn: StudioTurn = {
          id: `${Date.now()}-${turns.length}`,
          prompt: asked,
          reply: reply ?? clarification(template),
          operations: [],
          notes: [],
          refusals: [],
          source: "guidance",
          canUndo: false,
          suggestions: starters,
        };
        setTurns((current) => [...current, turn]);
      }
    },
    [design, template, palette.name, turns, runOperations, starters],
  );

  const undoTurn = (id: string) => {
    const index = turns.findIndex((turn) => turn.id === id);
    if (index === -1) return;
    // Replaying is what makes a mid-transcript undo honest: the design goes back
    // to the template and every surviving turn is applied again in order, so
    // "undo the third change" does not quietly discard the fourth and fifth.
    const kept = turns.filter((_, position) => position !== index);
    let rebuilt = initialDesign(template, initialPaletteId);
    rebuilt = { ...rebuilt, designerMode: design.designerMode };
    for (const turn of kept) {
      rebuilt = applyOperations(rebuilt, template, turn.operations).design;
    }
    commit(rebuilt, kept);
  };

  const applyChip = (operations: DesignOperation[]) => {
    const result = applyOperations(design, template, operations);
    commit(result.design, turns);
  };

  const photoElement = design.elements.find((element) => element.type === "image");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-secondary">
      {/* Bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Link
            href={`/design/${template.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{template.name}</p>
            <p className="truncate text-xs text-muted">
              {palette.name} · {pairingName(design)} · {saveLabel(dirty, saved)}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label="Undo" onClick={undo} disabled={undoStack.length === 0}>
              <Undo2 className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label="Redo" onClick={redo} disabled={redoStack.length === 0}>
              <Redo2 className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Start again"
              onClick={() => commit(initialDesign(template, initialPaletteId), [])}
              disabled={turns.length === 0 && undoStack.length === 0}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </IconButton>
          </div>

          <Link
            href={`/design/${template.slug}/suite`}
            className="hidden h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink transition-[background-color,border-color] hover:border-ink/25 hover:bg-surface-secondary sm:inline-flex"
          >
            <Layers className="size-4" aria-hidden="true" />
            The suite
          </Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Stage */}
        <main className="flex flex-col items-center px-4 py-8 lg:px-10 lg:py-12">
          {draft && !draftDismissed && undoStack.length === 0 && turns.length === 0 ? (
            <div className="mb-6 flex w-full max-w-[440px] flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="flex-1 text-sm text-ink-secondary">
                You have a saved draft of this design.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDesign(draft.design);
                  setTurns(draft.turns);
                  setData(draft.data);
                  setDraftDismissed(true);
                }}
                className="text-sm font-medium text-ink underline underline-offset-4"
              >
                Pick it up
              </button>
              <button
                type="button"
                onClick={() => setDraftDismissed(true)}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                Start fresh
              </button>
            </div>
          ) : null}

          <div className="w-full max-w-[440px]">
            <div className="shadow-[0_40px_90px_-50px_rgb(0_0_0/0.55)]">
              <DesignBoard
                template={template}
                data={data}
                palette={palette}
                fonts={design.fontSystem}
                paper={design.paper}
                elements={design.elements}
              />
            </div>
          </div>

          {/* Colourways — the one direct control, because a swatch is faster to
              judge than a sentence describing it. */}
          <div className="mt-8 w-full max-w-[440px]">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Colourways
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {template.palettes.map((entry) => {
                const active = design.paletteId === entry.id && design.colourMoves.length === 0;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => applyChip([{ kind: "palette", paletteId: entry.id }])}
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

            <div className="mt-6 flex items-start justify-between gap-6 border-t border-line pt-5">
              <div>
                <p className="text-sm font-medium text-ink">
                  {design.designerMode ? "Designer Mode" : "Creative Mode"}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                  {design.designerMode
                    ? "The margins, the type scale and the elements holding this composition are protected. You can still change anything that is genuinely yours to change."
                    : "Nothing is protected. You can move past the design's own limits — including past what its designer would have allowed."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={design.designerMode}
                onClick={() =>
                  commit({ ...design, designerMode: !design.designerMode }, turns)
                }
                className={cn(
                  "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-[background-color]",
                  design.designerMode ? "bg-ink" : "bg-line-strong",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-surface transition-[left]",
                    design.designerMode ? "left-[22px]" : "left-0.5",
                  )}
                />
                <span className="sr-only">Designer Mode</span>
              </button>
            </div>
          </div>
        </main>

        {/* Console */}
        <aside className="flex min-h-0 flex-col border-t border-line bg-surface lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:border-l lg:border-t-0">
          <div className="flex shrink-0 gap-1 border-b border-line px-4 pt-3">
            {(["design", "details"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setTab(entry)}
                className={cn(
                  "-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
                  tab === entry
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {entry === "design" ? "Design" : "The occasion"}
              </button>
            ))}
          </div>

          {tab === "design" ? (
            <PromptConsole
              templateName={template.name}
              turns={turns}
              starters={starters}
              pending={pending}
              onSubmit={(prompt) => void submit(prompt)}
              onUndoTurn={undoTurn}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OccasionDetails
                data={data}
                onChange={updateData}
                photo={
                  photoElement
                    ? {
                        src: photoElement.type === "image" ? photoElement.src : null,
                        onChange: (url) =>
                          commit(
                            {
                              ...design,
                              elements: design.elements.map((element) =>
                                element.type === "image" ? { ...element, src: url } : element,
                              ),
                            },
                            turns,
                          ),
                      }
                    : null
                }
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg text-ink-secondary transition-[background-color,opacity] hover:bg-surface-secondary disabled:opacity-30"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function pairingName(design: StudioDesign): string {
  if (!design.fontPairingId) return "Original type";
  return FONT_PAIRINGS.find((pairing) => pairing.id === design.fontPairingId)?.name ?? "Custom type";
}

function saveLabel(dirty: boolean, saved: boolean): string {
  if (dirty) return "Saving…";
  return saved ? "Saved" : "Draft";
}

/** Cross-tab edits are the only thing that changes storage under our feet. */
function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

interface Draft {
  design: StudioDesign;
  data: BindingContext;
  turns: StudioTurn[];
}

function parseDraft(raw: string | null, templateId: string): Draft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed.design || parsed.design.templateId !== templateId || !parsed.data) return null;
    return { design: parsed.design, data: parsed.data, turns: parsed.turns ?? [] };
  } catch {
    // A corrupt draft is not worth an error state — the template is the
    // fallback, and it is a good one.
    return null;
  }
}
