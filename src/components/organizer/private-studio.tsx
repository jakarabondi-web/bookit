"use client";

import { useState } from "react";
import {
  Copy,
  Eye,
  Link2,
  Mail,
  MessageSquare,
  Palette,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { formatMoney, money } from "@/domain/money";
import {
  hostHeadline,
  monogramFor,
  PRIVATE_THEMES,
  themeById,
  type Broadcast,
  type EcardLayout,
  type GiftItem,
  type GuestMessage,
  type PrivateEventPage,
} from "@/domain/private-event";
import type { PrivateInvite } from "@/domain/types";
import { Ecard } from "@/components/private/ecard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The private-event studio.
 *
 * One screen where a host controls everything a guest will see: the theme, the
 * names, the story, the programme, the e-card, the gift registry, and the
 * messages that go out. Edits are held locally and saved explicitly, because a
 * half-typed name should not appear on an invitation someone is reading.
 */

export interface PrivateStudioProps {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  venueName: string;
  venueCity: string;
  initialPage: PrivateEventPage;
  invites: PrivateInvite[];
  gifts: GiftItem[];
  broadcasts: Broadcast[];
  messages: GuestMessage[];
  /** A working invitation link for previewing the guest view. */
  previewToken: string | null;
}

const INVITE_TONE: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
  ISSUED: "neutral",
  VIEWED: "info",
  ACCEPTED: "success",
  DECLINED: "warning",
  REVOKED: "error",
  EXPIRED: "neutral",
};

export function PrivateStudio(props: PrivateStudioProps) {
  const [page, setPage] = useState(props.initialPage);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const theme = themeById(page.themeId);

  function update<K extends keyof PrivateEventPage>(key: K, value: PrivateEventPage[K]) {
    setPage((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/organizers/events/${props.eventId}/private-page`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (response.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const responded = props.invites.filter(
    (invite) => invite.status === "ACCEPTED" || invite.status === "DECLINED",
  ).length;
  const opened = props.invites.filter((invite) => invite.status !== "ISSUED").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Save bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span
            className="size-9 shrink-0 rounded-lg border border-line"
            style={{ background: theme.accent }}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-ink">{hostHeadline(page)}</p>
            <p className="text-xs text-muted">
              {theme.name} · {props.invites.length} invitations · {opened} opened · {responded}{" "}
              responded
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.previewToken ? (
            <Button variant="secondary" size="sm" asChild>
              <a href={`/i/${props.previewToken}`} target="_blank" rel="noreferrer">
                <Eye className="size-4" />
                Preview guest view
              </a>
            </Button>
          ) : null}
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="design">
        <TabsList className="max-w-full">
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="ecard">E-card</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="gifts">Gift registry</TabsTrigger>
          <TabsTrigger value="messages">Communication</TabsTrigger>
          <TabsTrigger value="rsvp">RSVP</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Design ----------------------------- */}
        <TabsContent value="design">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardContent className="p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Palette className="size-4 text-primary" aria-hidden="true" />
                  Theme
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Sets the colours and typography of the invitation page and the e-card.
                </p>

                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {PRIVATE_THEMES.map((option) => {
                    const active = page.themeId === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => update("themeId", option.id)}
                          aria-pressed={active}
                          className={cn(
                            "w-full rounded-card-sm border p-4 text-left transition-colors",
                            active ? "border-primary bg-primary-tint/40" : "border-line hover:border-primary/40",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {[option.background, option.surface, option.accent].map((swatch) => (
                              <span
                                key={swatch}
                                className="size-5 rounded-full border border-line"
                                style={{ background: swatch }}
                                aria-hidden="true"
                              />
                            ))}
                            <span className="ml-auto text-sm font-semibold text-ink">
                              {option.name}
                            </span>
                          </span>
                          <span className="mt-2 block text-xs leading-relaxed text-muted">
                            {option.description}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6 flex flex-col gap-5">
                  <Field
                    label="Cover image"
                    htmlFor="cover"
                    hint="Shown full width at the top of the invitation."
                  >
                    <Input
                      value={page.coverImageUrl ?? ""}
                      onChange={(event) => update("coverImageUrl", event.target.value || null)}
                      placeholder="/assets/images/event-wedding.jpg"
                    />
                  </Field>
                  <Field label="Hashtag" htmlFor="hashtag">
                    <Input
                      value={page.hashtag ?? ""}
                      onChange={(event) => update("hashtag", event.target.value || null)}
                      placeholder="#WanjikuMeetsOtieno"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <ThemePreview page={page} />
          </div>
        </TabsContent>

        {/* ------------------------------ Details ---------------------------- */}
        <TabsContent value="details">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-base font-semibold text-ink">Who this is for</h2>
                <p className="mt-1 text-sm text-muted">
                  The names shown large at the top of the invitation. A wedding has two; a
                  birthday has one; a ruracio can name both families.
                </p>

                <ul className="mt-5 flex flex-col gap-3">
                  {page.hosts.map((host, index) => (
                    <li
                      key={host.id}
                      className="grid gap-3 rounded-card-sm border border-line p-4 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <Field label="Name" htmlFor={`host-name-${index}`}>
                        <Input
                          value={host.name}
                          onChange={(event) =>
                            update(
                              "hosts",
                              page.hosts.map((entry, position) =>
                                position === index
                                  ? { ...entry, name: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Role" htmlFor={`host-role-${index}`}>
                        <Input
                          value={host.role}
                          onChange={(event) =>
                            update(
                              "hosts",
                              page.hosts.map((entry, position) =>
                                position === index
                                  ? { ...entry, role: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Bride, Groom, Celebrant…"
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error-tint"
                          onClick={() =>
                            update(
                              "hosts",
                              page.hosts.filter((_, position) => position !== index),
                            )
                          }
                          aria-label={`Remove ${host.name || "host"}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    update("hosts", [
                      ...page.hosts,
                      {
                        id: `host_${page.hosts.length + 1}_${Date.now()}`,
                        name: "",
                        role: "",
                        photoUrl: null,
                        bio: null,
                      },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add a host
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-5 p-6">
                <h2 className="text-base font-semibold text-ink">The invitation</h2>
                <Field label="Eyebrow" htmlFor="eyebrow" hint="Small line above the names.">
                  <Input
                    value={page.eyebrow}
                    onChange={(event) => update("eyebrow", event.target.value)}
                  />
                </Field>
                <Field label="Tagline" htmlFor="tagline">
                  <Textarea
                    rows={2}
                    value={page.tagline ?? ""}
                    onChange={(event) => update("tagline", event.target.value || null)}
                  />
                </Field>
                <Field
                  label="Your story"
                  htmlFor="story"
                  hint="Optional. Leave a blank line between paragraphs."
                >
                  <Textarea
                    rows={6}
                    value={page.story ?? ""}
                    onChange={(event) => update("story", event.target.value || null)}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Dress code" htmlFor="dress">
                    <Input
                      value={page.dressCode ?? ""}
                      onChange={(event) => update("dressCode", event.target.value || null)}
                      placeholder="Black tie"
                    />
                  </Field>
                  <Field label="Dress code note" htmlFor="dress-note">
                    <Input
                      value={page.dressCodeNote ?? ""}
                      onChange={(event) => update("dressCodeNote", event.target.value || null)}
                      placeholder="The ceremony is on grass — flat shoes are wise."
                    />
                  </Field>
                  <Field label="Contact name" htmlFor="contact-name">
                    <Input
                      value={page.contactName ?? ""}
                      onChange={(event) => update("contactName", event.target.value || null)}
                    />
                  </Field>
                  <Field label="Contact phone" htmlFor="contact-phone">
                    <Input
                      value={page.contactPhone ?? ""}
                      onChange={(event) => update("contactPhone", event.target.value || null)}
                    />
                  </Field>
                </div>
                <Field
                  label="Confirmation message"
                  htmlFor="confirmation"
                  hint="Shown to a guest right after they accept."
                >
                  <Textarea
                    rows={2}
                    value={page.confirmationMessage ?? ""}
                    onChange={(event) =>
                      update("confirmationMessage", event.target.value || null)
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-base font-semibold text-ink">The programme</h2>
                <p className="mt-1 text-sm text-muted">
                  What happens and when. Guests see this as a timeline.
                </p>
                <ul className="mt-5 flex flex-col gap-3">
                  {page.programme.map((item, index) => (
                    <li
                      key={item.id}
                      className="grid gap-3 rounded-card-sm border border-line p-4 sm:grid-cols-[150px_1fr_auto]"
                    >
                      <Field label="Time" htmlFor={`prg-time-${index}`}>
                        <Input
                          type="datetime-local"
                          value={item.time.slice(0, 16)}
                          onChange={(event) =>
                            update(
                              "programme",
                              page.programme.map((entry, position) =>
                                position === index
                                  ? {
                                      ...entry,
                                      time: new Date(event.target.value).toISOString(),
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="What happens" htmlFor={`prg-title-${index}`}>
                        <Input
                          value={item.title}
                          onChange={(event) =>
                            update(
                              "programme",
                              page.programme.map((entry, position) =>
                                position === index
                                  ? { ...entry, title: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error-tint"
                          onClick={() =>
                            update(
                              "programme",
                              page.programme.filter((_, position) => position !== index),
                            )
                          }
                          aria-label={`Remove ${item.title || "item"}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    update("programme", [
                      ...page.programme,
                      {
                        id: `prg_${Date.now()}`,
                        time: props.startsAt,
                        title: "",
                        description: null,
                        location: null,
                      },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add to the programme
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------- E-card ---------------------------- */}
        <TabsContent value="ecard">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <Card>
              <CardContent className="flex flex-col gap-5 p-6">
                <h2 className="text-base font-semibold text-ink">E-card design</h2>
                <p className="text-sm text-muted">
                  This is what goes out by email and WhatsApp. It is generated from these
                  settings, so it stays sharp on any screen and updates the moment you change a
                  detail.
                </p>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Layout</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["MONOGRAM", "BORDERED", "PHOTO", "MINIMAL"] as EcardLayout[]).map(
                      (layout) => (
                        <button
                          key={layout}
                          type="button"
                          aria-pressed={page.ecard.layout === layout}
                          onClick={() => update("ecard", { ...page.ecard, layout })}
                          className={cn(
                            "rounded-card-sm border px-3 py-2.5 text-sm font-medium transition-colors",
                            page.ecard.layout === layout
                              ? "border-primary bg-primary-tint text-primary-hover"
                              : "border-line text-ink-secondary hover:border-primary/40",
                          )}
                        >
                          {layout.charAt(0) + layout.slice(1).toLowerCase()}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <Field label="Monogram" htmlFor="monogram" hint="Leave blank to use initials.">
                  <Input
                    value={page.ecard.monogram ?? ""}
                    onChange={(event) =>
                      update("ecard", { ...page.ecard, monogram: event.target.value || null })
                    }
                    placeholder="A & M"
                  />
                </Field>
                <Field label="Opening line" htmlFor="ecard-eyebrow">
                  <Input
                    value={page.ecard.eyebrow}
                    onChange={(event) =>
                      update("ecard", { ...page.ecard, eyebrow: event.target.value })
                    }
                  />
                </Field>
                <Field label="Invitation line" htmlFor="ecard-line">
                  <Textarea
                    rows={2}
                    value={page.ecard.invitationLine}
                    onChange={(event) =>
                      update("ecard", { ...page.ecard, invitationLine: event.target.value })
                    }
                  />
                </Field>
                <Field label="Closing note" htmlFor="ecard-footnote">
                  <Input
                    value={page.ecard.footnote ?? ""}
                    onChange={(event) =>
                      update("ecard", { ...page.ecard, footnote: event.target.value || null })
                    }
                    placeholder="Dinner and dancing to follow"
                  />
                </Field>
                {page.ecard.layout === "PHOTO" ? (
                  <Field label="Photo" htmlFor="ecard-photo">
                    <Input
                      value={page.ecard.photoUrl ?? ""}
                      onChange={(event) =>
                        update("ecard", { ...page.ecard, photoUrl: event.target.value || null })
                      }
                      placeholder="/assets/images/event-wedding.jpg"
                    />
                  </Field>
                ) : null}
              </CardContent>
            </Card>

            <div className="lg:sticky lg:top-24 lg:h-fit">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Live preview
              </p>
              <Ecard
                design={page.ecard}
                theme={page.ecard.themeId ? themeById(page.ecard.themeId) : theme}
                monogram={monogramFor(page)}
                hostNames={hostHeadline(page)}
                startsAt={props.startsAt}
                venueName={props.venueName}
                venueCity={props.venueCity}
              />
            </div>
          </div>
        </TabsContent>

        {/* --------------------------- Invitations --------------------------- */}
        <TabsContent value="invitations">
          <InvitationsPanel eventId={props.eventId} invites={props.invites} />
        </TabsContent>

        {/* ----------------------------- Gifts ------------------------------- */}
        <TabsContent value="gifts">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-4 p-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={page.giftRegistryEnabled}
                    onChange={(event) => update("giftRegistryEnabled", event.target.checked)}
                    className="mt-1 size-4 accent-[var(--color-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      Show a gift registry
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      Guests can claim an item so nobody buys the same thing twice, or contribute
                      to a cash fund with an M-PESA number.
                    </span>
                  </span>
                </label>
                <Field label="Note to guests" htmlFor="gift-note">
                  <Textarea
                    rows={3}
                    value={page.giftRegistryNote ?? ""}
                    onChange={(event) => update("giftRegistryNote", event.target.value || null)}
                    placeholder="Your presence is the gift. If you would still like to mark the day…"
                  />
                </Field>
              </CardContent>
            </Card>

            {props.gifts.length === 0 ? (
              <EmptyState
                title="Nothing on the registry yet"
                description="Add the things you would like, or a cash fund for something bigger."
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {props.gifts.map((gift) => {
                  const remaining = gift.quantityWanted - gift.quantityClaimed;
                  return (
                    <li key={gift.id}>
                      <Card className="h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-ink">{gift.title}</p>
                            <Badge tone={gift.kind === "CASH_FUND" ? "brand" : "neutral"}>
                              {gift.kind === "CASH_FUND" ? "Cash fund" : "Item"}
                            </Badge>
                          </div>
                          {gift.description ? (
                            <p className="mt-1.5 text-sm text-ink-secondary">{gift.description}</p>
                          ) : null}
                          <p className="mt-3 text-sm text-muted">
                            {gift.kind === "CASH_FUND"
                              ? `${formatMoney(gift.contributed ?? money(0, "KES"))} of ${formatMoney(gift.price ?? money(0, "KES"))} raised`
                              : remaining > 0
                                ? `${remaining} of ${gift.quantityWanted} still needed`
                                : "Claimed"}
                          </p>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* -------------------------- Communication -------------------------- */}
        <TabsContent value="messages">
          <CommunicationPanel
            eventId={props.eventId}
            broadcasts={props.broadcasts}
            messages={props.messages}
          />
        </TabsContent>

        {/* ------------------------------ RSVP ------------------------------- */}
        <TabsContent value="rsvp">
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              <h2 className="text-base font-semibold text-ink">What to ask your guests</h2>

              <Field
                label="RSVP deadline"
                htmlFor="rsvp-deadline"
                hint="After this the form closes and guests are asked to call you."
              >
                <Input
                  type="datetime-local"
                  value={page.rsvp.deadline ? page.rsvp.deadline.slice(0, 16) : ""}
                  onChange={(event) =>
                    update("rsvp", {
                      ...page.rsvp,
                      deadline: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </Field>

              <ul className="flex flex-col gap-3">
                {(
                  [
                    ["allowPlusOnes", "Allow guests to bring others", "Up to the number on their invitation."],
                    ["collectMealChoice", "Ask for a meal choice", "Needed for a seated dinner."],
                    ["collectDietary", "Ask about allergies and dietary needs", null],
                    ["collectMessage", "Let guests leave you a note", "You approve notes before they appear."],
                    ["collectSongRequest", "Ask for a song request", "Useful for the DJ."],
                    ["showConfirmedCount", "Show how many have confirmed", null],
                    ["showGuestList", "Show other guests' names", "Only do this if everyone knows each other."],
                  ] as Array<[keyof typeof page.rsvp, string, string | null]>
                ).map(([key, label, hint]) => (
                  <li key={String(key)}>
                    <label className="flex items-start gap-3 rounded-card-sm border border-line p-3.5">
                      <input
                        type="checkbox"
                        checked={Boolean(page.rsvp[key])}
                        onChange={(event) =>
                          update("rsvp", { ...page.rsvp, [key]: event.target.checked })
                        }
                        className="mt-0.5 size-4 accent-[var(--color-primary)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink">{label}</span>
                        {hint ? (
                          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <Field
                label="Meal options"
                htmlFor="meal-options"
                hint="Comma separated."
              >
                <Input
                  value={page.rsvp.mealOptions.join(", ")}
                  onChange={(event) =>
                    update("rsvp", {
                      ...page.rsvp,
                      mealOptions: event.target.value
                        .split(",")
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ThemePreview({ page }: { page: PrivateEventPage }) {
  const theme = themeById(page.themeId);
  return (
    <div className="lg:sticky lg:top-24 lg:h-fit">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
      <div
        className="overflow-hidden rounded-card-lg border border-line"
        style={{ background: theme.background }}
      >
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.inkSoft,
            }}
          >
            {page.eyebrow}
          </p>
          <p
            style={{
              fontFamily: theme.displayFont,
              fontSize: 30,
              lineHeight: 1.1,
              margin: "12px 0 0",
              color: theme.ink,
            }}
          >
            {hostHeadline(page)}
          </p>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 1,
              background: theme.accent,
              margin: "18px auto",
            }}
          />
          <p style={{ fontSize: 13, color: theme.inkSoft, margin: 0 }}>
            {page.tagline ?? "Your tagline appears here."}
          </p>
          <span
            style={{
              display: "inline-block",
              marginTop: 22,
              padding: "10px 22px",
              borderRadius: 9,
              background: theme.accent,
              color: theme.surface,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            RSVP
          </span>
        </div>
      </div>
    </div>
  );
}

function InvitationsPanel({
  eventId,
  invites,
}: {
  eventId: string;
  invites: PrivateInvite[];
}) {
  const [names, setNames] = useState("");
  const [issued, setIssued] = useState<Array<{ name: string; link: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function issue() {
    const guests = names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, contact, maxGuests] = line.split(",").map((part) => part.trim());
        return {
          name: name ?? "",
          email: contact?.includes("@") ? contact : undefined,
          phone: contact && !contact.includes("@") ? contact : undefined,
          maxGuests: maxGuests ? Number(maxGuests) : 1,
        };
      });
    if (guests.length === 0) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/v1/organizers/events/${eventId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests, send: false }),
      });
      const payload = await response.json();
      if (response.ok) {
        setIssued(payload.data);
        setNames("");
      }
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<PrivateInvite>[] = [
    {
      key: "name",
      header: "Guest",
      hideOnMobile: true,
      render: (invite) => <span className="font-medium text-ink">{invite.inviteeName}</span>,
    },
    {
      key: "contact",
      header: "Contact",
      render: (invite) => (
        <span className="block max-w-[12rem] truncate">
          {invite.email ?? invite.phone ?? "—"}
        </span>
      ),
    },
    { key: "max", header: "Guests", render: (invite) => invite.maxGuests },
    {
      key: "status",
      header: "Status",
      render: (invite) => (
        <Badge tone={INVITE_TONE[invite.status] ?? "neutral"}>
          {invite.status.toLowerCase()}
        </Badge>
      ),
    },
    { key: "expires", header: "Expires", render: (invite) => formatDate(invite.expiresAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Users className="size-4 text-primary" aria-hidden="true" />
            Invite your guests
          </h2>
          <p className="mt-1 text-sm text-muted">
            One guest per line: <code className="text-xs">Name, email or phone, guests allowed</code>.
            Each person gets their own private link — nobody can use somebody else&apos;s.
          </p>

          <Textarea
            className="mt-4 font-mono text-sm"
            rows={5}
            value={names}
            onChange={(event) => setNames(event.target.value)}
            placeholder={"Peter Kimani, peter@example.co.ke, 4\nAisha Mohamed, 0712345678, 2"}
            aria-label="Guest list to invite"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={issue} disabled={busy || !names.trim()}>
              <Link2 className="size-4" />
              {busy ? "Creating…" : "Create invitation links"}
            </Button>
            <Button variant="secondary" disabled>
              <Mail className="size-4" />
              Import CSV
            </Button>
          </div>

          {issued.length > 0 ? (
            <div className="mt-6 rounded-card-sm border border-success/25 bg-success-tint p-4">
              <p className="text-sm font-medium text-ink">
                {issued.length} invitation {issued.length === 1 ? "link" : "links"} created
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                Copy them now — for security these links are shown only once and cannot be
                retrieved later.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {issued.map((entry) => (
                  <li
                    key={entry.link}
                    className="flex items-center gap-2 rounded-lg bg-surface p-2.5"
                  >
                    <span className="w-32 shrink-0 truncate text-sm font-medium text-ink">
                      {entry.name}
                    </span>
                    <code className="min-w-0 flex-1 truncate text-xs text-muted">
                      {entry.link}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard?.writeText(entry.link);
                        setCopied(entry.link);
                      }}
                    >
                      <Copy className="size-3.5" />
                      {copied === entry.link ? "Copied" : "Copy"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Invitations sent ({invites.length})
        </h2>
        <DataTable
          columns={columns}
          rows={invites}
          rowKey={(invite) => invite.id}
          caption="Invitations"
          mobileTitle={(invite) => invite.inviteeName}
          emptyState={
            <EmptyState
              title="No invitations yet"
              description="Add your guest list above to create personal invitation links."
            />
          }
        />
      </div>
    </div>
  );
}

function CommunicationPanel({
  eventId,
  broadcasts,
  messages,
}: {
  eventId: string;
  broadcasts: Broadcast[];
  messages: GuestMessage[];
}) {
  const [channel, setChannel] = useState("EMAIL");
  const [audience, setAudience] = useState("ALL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/organizers/events/${eventId}/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, audience, subject, body }),
      });
      const payload = await response.json();
      if (response.ok) {
        setSent(`Sent to ${payload.data.recipientCount} guests.`);
        setSubject("");
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Send className="size-4 text-primary" aria-hidden="true" />
            Message your guests
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Send by</span>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger aria-label="Channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Send to</span>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger aria-label="Audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone attending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed guests</SelectItem>
                  <SelectItem value="PENDING">Awaiting confirmation</SelectItem>
                  <SelectItem value="NOT_RESPONDED">Not yet responded</SelectItem>
                  <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Field label="Subject" htmlFor="bcs-subject" required>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </Field>
          <Field label="Message" htmlFor="bcs-body" required>
            <Textarea
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="The bus leaves Sarit Centre at 8:30 AM sharp…"
            />
          </Field>

          {sent ? (
            <p role="status" className="text-sm font-medium text-success">
              {sent}
            </p>
          ) : null}

          <Button onClick={send} disabled={busy || !subject.trim() || !body.trim()}>
            {busy ? "Sending…" : "Send message"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-ink">Sent</h2>
            {broadcasts.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing sent yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {broadcasts.map((broadcast) => (
                  <li key={broadcast.id} className="rounded-card-sm border border-line p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{broadcast.subject}</p>
                      <Badge>{broadcast.channel.toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{broadcast.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      {broadcast.recipientCount} recipients ·{" "}
                      {formatDateTime(broadcast.sentAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <MessageSquare className="size-4 text-primary" aria-hidden="true" />
              Notes from guests
            </h2>
            {messages.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Notes guests leave with their RSVP appear here for you to approve.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {messages.map((message) => (
                  <li key={message.id} className="rounded-card-sm border border-line p-3.5">
                    <p className="text-sm text-ink">&ldquo;{message.body}&rdquo;</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted">{message.authorName}</p>
                      {message.approved ? (
                        <Badge tone="success">On the wall</Badge>
                      ) : (
                        <Badge tone="warning">Awaiting approval</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
