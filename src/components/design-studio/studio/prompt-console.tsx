"use client";

import * as React from "react";
import { ArrowUp, Check, Info, Undo2 } from "lucide-react";
import { PROMPT_GUIDE } from "@/domain/design-studio/guidance";
import type { DesignOperation } from "@/domain/design-studio/operations";
import { cn } from "@/lib/utils";

/**
 * The prompt console.
 *
 * This is the studio's primary interface — not a properties panel with a chat
 * box bolted on the side. A host says what they want and the card changes.
 *
 * The design decisions that matter here are all about not leaving someone
 * staring at an empty box. It opens with prompts written for the design in
 * front of them; every change comes back as a plain sentence plus a list of
 * what actually moved; anything the studio declined is shown with the reason,
 * because "gold on the body text reads as costume jewellery" is the most
 * useful thing a design tool can tell someone; and every turn can be undone
 * from where it sits in the transcript rather than only from the top of the
 * stack.
 */

export interface StudioTurn {
  id: string;
  prompt: string;
  reply: string;
  /** What changed. */
  notes: string[];
  /** What the studio would not do, and why. */
  refusals: string[];
  source: "studio" | "assistant" | "guidance";
  /**
   * The operations this turn applied. Kept so the studio can rebuild the design
   * from the template when a turn is undone from the middle of the transcript.
   */
  operations: DesignOperation[];
  /** Guidance turns changed nothing, so there is nothing to undo. */
  canUndo: boolean;
  /** Offered after this turn — the next two or three moves worth making. */
  suggestions: string[];
}

export interface PromptConsoleProps {
  templateName: string;
  turns: StudioTurn[];
  starters: string[];
  pending: boolean;
  onSubmit: (prompt: string) => void;
  onUndoTurn: (id: string) => void;
}

export function PromptConsole({
  templateName,
  turns,
  starters,
  pending,
  onSubmit,
  onUndoTurn,
}: PromptConsoleProps) {
  const [value, setValue] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  const send = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || pending) return;
    setValue("");
    onSubmit(trimmed);
  };

  const latest = turns[turns.length - 1];
  const chips = latest?.suggestions.length ? latest.suggestions : starters;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <Opening templateName={templateName} />
        ) : (
          <ol className="flex flex-col gap-6">
            {turns.map((turn) => (
              <li key={turn.id}>
                <Turn turn={turn} onUndo={() => onUndoTurn(turn.id)} />
              </li>
            ))}
          </ol>
        )}

        {pending ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-ink/40" aria-hidden="true" />
            Working on it…
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface px-5 pb-5 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {chips.slice(0, 4).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => send(chip)}
              disabled={pending}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-secondary transition-[background-color,border-color] hover:border-ink/25 hover:bg-surface-secondary disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(value);
          }}
          className="mt-3 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 transition-[border-color,box-shadow] focus-within:border-ink/25 focus-within:ring-2 focus-within:ring-ink/5"
        >
          <label htmlFor="studio-prompt" className="sr-only">
            Describe the change you want
          </label>
          <textarea
            id="studio-prompt"
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(value);
              }
            }}
            placeholder="Warmer, and set the names in gold…"
            className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={pending || value.trim().length === 0}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-surface transition-[background-color,opacity] hover:bg-ink/90 disabled:opacity-30"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            <span className="sr-only">Make the change</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Opening({ templateName }: { templateName: string }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold leading-snug text-ink">
        Tell the studio what you want.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Describe the change the way you would to a stationer — “warmer”, “set the names in gold”,
        “make it feel black tie”. {templateName} keeps its own margins, type scale and locked
        elements while you do, so it cannot be broken by asking.
      </p>

      <details className="group mt-6 rounded-xl border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink marker:content-none">
          <span className="flex items-center justify-between gap-3">
            What you can ask for
            <span className="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
          </span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line px-4 py-4">
          {PROMPT_GUIDE.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {group.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{group.hint}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {group.examples.map((example) => (
                  <li key={example} className="text-xs text-ink-secondary">
                    “{example}”
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Turn({ turn, onUndo }: { turn: StudioTurn; onUndo: () => void }) {
  return (
    <div>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-surface">
        {turn.prompt}
      </p>

      <div className="mt-3">
        <p
          className={cn(
            "text-sm leading-relaxed",
            turn.source === "guidance" ? "text-ink-secondary" : "text-ink",
          )}
        >
          {turn.reply}
        </p>

        {turn.notes.length > 0 ? (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {turn.notes.map((note, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-ink-secondary">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        ) : null}

        {turn.refusals.length > 0 ? (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {turn.refusals.map((refusal, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-warning-tint px-2.5 py-2 text-xs leading-relaxed text-ink-secondary"
              >
                <Info className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                {refusal}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2.5 flex items-center gap-3">
          {turn.canUndo ? (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
            >
              <Undo2 className="size-3.5" aria-hidden="true" />
              Undo this
            </button>
          ) : null}
          {turn.source === "assistant" ? (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Assistant</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
