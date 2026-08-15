"use client";

import { useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import type { RsvpSettings } from "@/domain/private-event";
import type { ResolvedTheme } from "@/domain/private-design";

/**
 * The guest's RSVP.
 *
 * Which fields appear is entirely the host's choice — meal choice, dietary
 * needs, a song request, a note. The form is themed to the invitation rather
 * than the Bookit UI, because to the guest this is the couple's page, not ours.
 */

export interface RsvpFormProps {
  token: string;
  theme: ResolvedTheme;
  settings: RsvpSettings;
  maxGuests: number;
  inviteeName: string;
  /** Their current answer, when they have already replied. */
  current: { attending: boolean; guestCount: number; mealChoice: string | null } | null;
  confirmationMessage: string | null;
}

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; attending: boolean; message: string }
  | { kind: "error"; message: string };

export function RsvpForm({
  token,
  theme,
  settings,
  maxGuests,
  inviteeName,
  current,
  confirmationMessage,
}: RsvpFormProps) {
  const [attending, setAttending] = useState<boolean | null>(current?.attending ?? null);
  const [guestCount, setGuestCount] = useState(current?.guestCount ?? 1);
  const [mealChoice, setMealChoice] = useState(current?.mealChoice ?? "");
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [songRequest, setSongRequest] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (attending === null) return;
    setState({ kind: "busy" });

    try {
      const response = await fetch(`/api/v1/invites/${encodeURIComponent(token)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attending,
          guestCount: attending ? guestCount : 0,
          mealChoice: mealChoice || undefined,
          dietary: dietary || undefined,
          message: message || undefined,
          songRequest: songRequest || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setState({ kind: "error", message: payload?.error?.message ?? "We could not save that" });
        return;
      }
      setState({
        kind: "done",
        attending,
        message: attending
          ? (confirmationMessage ?? "Thank you — we have you down.")
          : "Thank you for letting us know. You will be missed.",
      });
    } catch {
      setState({ kind: "error", message: "We could not reach the page. Check your connection." });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.accent}44`,
    background: theme.background,
    color: theme.ink,
    fontFamily: theme.bodyFont,
    fontSize: 15,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 7,
    color: theme.ink,
  };

  if (state.kind === "done") {
    return (
      <div
        role="status"
        style={{
          textAlign: "center",
          padding: "36px 28px",
          borderRadius: 16,
          background: theme.accentSoft,
          border: `1px solid ${theme.accent}40`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            borderRadius: "50%",
            background: theme.accent,
            color: theme.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state.attending ? <Check size={22} /> : <X size={22} />}
        </div>
        <p
          style={{
            fontFamily: theme.displayFont,
            fontSize: 24,
            margin: 0,
            color: theme.ink,
          }}
        >
          {state.attending ? "You're coming!" : "Response received"}
        </p>
        <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: theme.inkSoft }}>
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          style={{
            marginTop: 20,
            background: "none",
            border: "none",
            color: theme.accent,
            fontSize: 13,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Change my answer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 14, color: theme.inkSoft, margin: 0 }}>
        This invitation is for <strong style={{ color: theme.ink }}>{inviteeName}</strong>
        {maxGuests > 1 ? ` and up to ${maxGuests - 1} guest${maxGuests > 2 ? "s" : ""}` : ""}.
      </p>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend style={labelStyle}>Will you be joining us?</legend>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { value: true, label: "Joyfully accepts" },
            { value: false, label: "Regretfully declines" },
          ].map((option) => {
            const selected = attending === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={selected}
                onClick={() => setAttending(option.value)}
                style={{
                  flex: 1,
                  padding: "13px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: theme.bodyFont,
                  border: `1px solid ${selected ? theme.accent : `${theme.accent}44`}`,
                  background: selected ? theme.accent : theme.background,
                  color: selected ? theme.surface : theme.ink,
                  transition: "all 150ms",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {attending ? (
        <>
          {settings.allowPlusOnes && maxGuests > 1 ? (
            <div>
              <label htmlFor="rsvp-guests" style={labelStyle}>
                How many of you are coming?
              </label>
              <select
                id="rsvp-guests"
                value={guestCount}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                style={inputStyle}
              >
                {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {settings.collectMealChoice ? (
            <div>
              <label htmlFor="rsvp-meal" style={labelStyle}>
                Meal choice
              </label>
              <select
                id="rsvp-meal"
                value={mealChoice}
                onChange={(event) => setMealChoice(event.target.value)}
                style={inputStyle}
              >
                <option value="">Please choose…</option>
                {settings.mealOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {settings.collectDietary ? (
            <div>
              <label htmlFor="rsvp-dietary" style={labelStyle}>
                Any allergies or dietary needs?
              </label>
              <input
                id="rsvp-dietary"
                value={dietary}
                onChange={(event) => setDietary(event.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          ) : null}

          {settings.collectSongRequest ? (
            <div>
              <label htmlFor="rsvp-song" style={labelStyle}>
                A song that will get you dancing
              </label>
              <input
                id="rsvp-song"
                value={songRequest}
                onChange={(event) => setSongRequest(event.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {settings.collectMessage && attending !== null ? (
        <div>
          <label htmlFor="rsvp-message" style={labelStyle}>
            Leave a note for the hosts
          </label>
          <textarea
            id="rsvp-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Optional"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" style={{ fontSize: 13, color: "#B4232A", margin: 0 }}>
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={attending === null || state.kind === "busy"}
        style={{
          padding: "14px 20px",
          borderRadius: 10,
          border: "none",
          background: attending === null ? `${theme.accent}55` : theme.accent,
          color: theme.surface,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: theme.bodyFont,
          cursor: attending === null ? "not-allowed" : "pointer",
        }}
      >
        {state.kind === "busy" ? "Sending…" : "Send my response"}
      </button>
    </form>
  );
}
