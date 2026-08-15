"use client";

import { useState } from "react";
import { Check, Gift, Heart } from "lucide-react";
import { formatMoney, money } from "@/domain/money";
import type { GiftClaim, GiftItem } from "@/domain/private-event";
import type { ResolvedTheme } from "@/domain/private-design";

/**
 * Gift registry.
 *
 * Two kinds of gift: a physical item with a limited quantity, and a cash fund
 * with a target. Claiming an item is what stops two guests buying the same
 * dining set — the count is decremented server-side inside a transaction, so
 * the race is settled there rather than here.
 */

export interface GiftRegistryProps {
  token: string;
  theme: ResolvedTheme;
  gifts: GiftItem[];
  myClaims: GiftClaim[];
  note: string | null;
}

export function GiftRegistry({ token, theme, gifts, myClaims, note }: GiftRegistryProps) {
  const [claimed, setClaimed] = useState<Set<string>>(
    new Set(myClaims.map((claim) => claim.giftId)),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  async function claim(gift: GiftItem) {
    setBusy(gift.id);
    setError(null);
    try {
      const amountMajor = Number(amounts[gift.id] ?? "0");
      const response = await fetch(
        `/api/v1/invites/${encodeURIComponent(token)}/gifts/${gift.id}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            gift.kind === "CASH_FUND"
              ? { amount: Math.round(amountMajor * 100) }
              : { quantity: 1 },
          ),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "We could not record that");
        return;
      }
      setClaimed((current) => new Set(current).add(gift.id));
    } catch {
      setError("We could not reach the page. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {note ? (
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: theme.inkSoft,
            maxWidth: "42em",
            margin: "0 0 28px",
          }}
        >
          {note}
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "#B4232A", marginBottom: 16 }}>
          {error}
        </p>
      ) : null}

      <ul style={{ display: "grid", gap: 16, listStyle: "none", padding: 0, margin: 0 }}>
        {gifts.map((gift) => {
          const isClaimed = claimed.has(gift.id);
          const remaining = gift.quantityWanted - gift.quantityClaimed;
          const soldOut = gift.kind === "ITEM" && remaining <= 0 && !isClaimed;
          const progress =
            gift.kind === "CASH_FUND" && gift.price && gift.price.amount > 0
              ? Math.min(100, ((gift.contributed?.amount ?? 0) / gift.price.amount) * 100)
              : 0;

          return (
            <li
              key={gift.id}
              style={{
                padding: 20,
                borderRadius: 14,
                background: theme.surface,
                border: `1px solid ${theme.accent}2E`,
                opacity: soldOut ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: theme.accentSoft,
                    color: theme.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {gift.kind === "CASH_FUND" ? <Heart size={18} /> : <Gift size={18} />}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: theme.displayFont,
                      fontSize: 19,
                      margin: 0,
                      color: theme.ink,
                    }}
                  >
                    {gift.title}
                  </p>
                  {gift.description ? (
                    <p
                      style={{
                        marginTop: 5,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: theme.inkSoft,
                      }}
                    >
                      {gift.description}
                    </p>
                  ) : null}

                  {gift.kind === "CASH_FUND" ? (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          background: theme.accentSoft,
                          overflow: "hidden",
                        }}
                        role="img"
                        aria-label={`${Math.round(progress)}% of the target reached`}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            background: theme.accent,
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <p style={{ marginTop: 8, fontSize: 13, color: theme.inkSoft }}>
                        {formatMoney(gift.contributed ?? money(0, "KES"))} of{" "}
                        {formatMoney(gift.price ?? money(0, "KES"))} raised
                      </p>
                      {gift.payToNumber ? (
                        <p style={{ marginTop: 4, fontSize: 12, color: theme.inkSoft }}>
                          {gift.payToNumber}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p style={{ marginTop: 10, fontSize: 13, color: theme.inkSoft }}>
                      {gift.price ? `Around ${formatMoney(gift.price)} · ` : ""}
                      {remaining > 0
                        ? `${remaining} still needed`
                        : "Already taken care of"}
                    </p>
                  )}

                  <div style={{ marginTop: 16 }}>
                    {isClaimed ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          color: theme.accent,
                        }}
                      >
                        <Check size={15} />
                        {gift.kind === "CASH_FUND" ? "Thank you for contributing" : "You have this one"}
                      </span>
                    ) : soldOut ? (
                      <span style={{ fontSize: 13, color: theme.inkSoft }}>
                        Another guest has this covered
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {gift.kind === "CASH_FUND" ? (
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={amounts[gift.id] ?? ""}
                            onChange={(event) =>
                              setAmounts((current) => ({
                                ...current,
                                [gift.id]: event.target.value,
                              }))
                            }
                            placeholder="Amount (KES)"
                            aria-label={`Amount to contribute towards ${gift.title}`}
                            style={{
                              width: 150,
                              padding: "9px 12px",
                              borderRadius: 9,
                              border: `1px solid ${theme.accent}44`,
                              background: theme.background,
                              color: theme.ink,
                              fontSize: 14,
                            }}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => claim(gift)}
                          disabled={busy === gift.id}
                          style={{
                            padding: "9px 18px",
                            borderRadius: 9,
                            border: `1px solid ${theme.accent}`,
                            background: "transparent",
                            color: theme.accent,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          {busy === gift.id
                            ? "Saving…"
                            : gift.kind === "CASH_FUND"
                              ? "Contribute"
                              : "I'll get this"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
