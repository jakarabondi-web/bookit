"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { EventCategory, EventType, EventVisibility } from "@/domain/enums";
import { behaviourFor, EVENT_TYPE_LABEL } from "@/domain/event-type-policy";
import { Badge } from "@/components/ui/badge";
import { BookitIcon, type BookitIconName } from "@/components/ui/bookit-icon";
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
import { cn } from "@/lib/utils";

/**
 * Event creation wizard.
 *
 * Step 1 asks what you are hosting, and every later step is built from that
 * answer: a banquet is asked about tables and meal choices, a paid event about
 * ticket tiers and resale rules, a recurring meeting about its recurrence rule.
 * That branching comes straight from `behaviourFor` — the same table the
 * consumer-facing booking panel uses — so the two can never disagree.
 */

const TYPE_ICON: Record<EventType, BookitIconName> = {
  PAID_TICKET: "ticket",
  FREE_RSVP: "rsvp",
  PRIVATE_INVITATION: "gift",
  BOOKING: "booking",
  BANQUET: "seat",
  RECURRING_MEETING: "meeting",
  HYBRID: "concerts",
};

const CATEGORY_LABEL: Record<EventCategory, string> = {
  CONCERTS: "Concerts",
  SPORTS: "Sports",
  COMEDY: "Comedy",
  CONFERENCES: "Conferences",
  PARTIES: "Parties",
  WEDDINGS: "Weddings",
  MEETINGS: "Meetings",
  COMMUNITY: "Community",
};

interface TicketTier {
  name: string;
  price: string;
  quantity: string;
}

interface WizardState {
  type: EventType | null;
  title: string;
  subtitle: string;
  description: string;
  category: EventCategory;
  visibility: EventVisibility;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  tiers: TicketTier[];
  tableCount: string;
  seatsPerTable: string;
  mealOptions: string;
  recurrence: string;
  inviteExpiryDays: string;
  contributionTarget: string;
  resaleEnabled: boolean;
  resaleMaxMarkup: string;
  maxPerAccount: string;
  refundPolicy: string;
}

const INITIAL: WizardState = {
  type: null,
  title: "",
  subtitle: "",
  description: "",
  category: EventCategory.CONCERTS,
  visibility: EventVisibility.PUBLIC,
  venue: "",
  city: "Nairobi",
  startsAt: "",
  endsAt: "",
  capacity: "",
  tiers: [{ name: "General Admission", price: "", quantity: "" }],
  tableCount: "20",
  seatsPerTable: "10",
  mealOptions: "Chicken, Beef, Fish, Vegetarian",
  recurrence: "FREQ=MONTHLY;BYDAY=1SA",
  inviteExpiryDays: "14",
  contributionTarget: "",
  resaleEnabled: false,
  resaleMaxMarkup: "0",
  maxPerAccount: "6",
  refundPolicy: "Full refunds up to 7 days before the event.",
};

export function EventWizard() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const behaviour = state.type ? behaviourFor(state.type) : null;

  // The step list itself is derived from the event type.
  const steps = useMemo(() => {
    const base = [{ id: "type", label: "What are you hosting?" }, { id: "basics", label: "Basics" }];
    if (!behaviour) return base;

    if (behaviour.issuesTickets) base.push({ id: "tickets", label: "Tickets" });
    if (behaviour.supportsTables) base.push({ id: "tables", label: "Tables & seating" });
    if (behaviour.requiresInvite) base.push({ id: "invites", label: "Invitations" });
    if (behaviour.recurring) base.push({ id: "recurrence", label: "Recurrence" });
    if (behaviour.supportsContributions) base.push({ id: "contributions", label: "Contributions" });
    if (!behaviour.issuesTickets) base.push({ id: "capacity", label: "Capacity & RSVP" });
    base.push({ id: "policies", label: "Policies" });
    base.push({ id: "review", label: "Review" });
    return base;
  }, [behaviour]);

  const current = steps[Math.min(step, steps.length - 1)]!;
  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((previous) => ({ ...previous, [key]: value }));

  const canAdvance = current.id === "type" ? state.type !== null : true;

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-tint text-success">
            <Check className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-ink">Draft saved</h2>
          <p className="max-w-md text-sm text-muted">
            &ldquo;{state.title || "Untitled event"}&rdquo; has been created as a draft
            {state.type ? ` (${EVENT_TYPE_LABEL[state.type]})` : ""}. Publish it when you are ready
            to take {behaviour?.issuesTickets ? "sales" : "bookings"}.
          </p>
          <div className="mt-2 flex gap-3">
            <Button variant="secondary" onClick={() => { setState(INITIAL); setStep(0); setSubmitted(false); }}>
              Create another
            </Button>
            <Button asChild>
              <Link href="/organizer/events">Back to events</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <ol className="scroll-rail lg:flex lg:flex-wrap lg:gap-2 lg:overflow-visible" aria-label="Steps">
        {steps.map((entry, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-success/30 bg-success-tint text-success",
                  !active && !done && "border-line bg-surface text-muted",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : null}
                {entry.label}
              </button>
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="p-6">
          {current.id === "type" ? (
            <fieldset>
              <legend className="text-lg font-semibold text-ink">What are you hosting?</legend>
              <p className="mt-1 text-sm text-muted">
                This decides how everything else works — payments, guest lists, seating and
                check-in.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.values(EventType).map((type) => {
                  const selected = state.type === type;
                  const typeBehaviour = behaviourFor(type);
                  return (
                    <label
                      key={type}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-card-sm border p-4 transition-colors",
                        selected
                          ? "border-primary bg-primary-tint/40"
                          : "border-line hover:border-primary/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="event-type"
                        value={type}
                        checked={selected}
                        onChange={() => set("type", type)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          selected ? "bg-primary text-white" : "bg-primary-tint text-primary",
                        )}
                      >
                        <BookitIcon name={TYPE_ICON[type]} className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {EVENT_TYPE_LABEL[type]}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          {typeBehaviour.blurb}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {current.id === "basics" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-ink">Basics</h2>
              <Field label="Event title" htmlFor="w-title" required>
                <Input
                  value={state.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="Burna Boy — Live in Nairobi"
                />
              </Field>
              <Field label="Subtitle" htmlFor="w-subtitle">
                <Input
                  value={state.subtitle}
                  onChange={(event) => set("subtitle", event.target.value)}
                  placeholder="African Giant Tour"
                />
              </Field>
              <Field label="Description" htmlFor="w-description" required>
                <Textarea
                  rows={5}
                  value={state.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="Tell guests what to expect, when doors open and anything they need to bring."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Category</span>
                  <Select
                    value={state.category}
                    onValueChange={(value) => set("category", value as EventCategory)}
                  >
                    <SelectTrigger aria-label="Category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EventCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABEL[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Who can see it?</span>
                  <Select
                    value={state.visibility}
                    onValueChange={(value) => set("visibility", value as EventVisibility)}
                  >
                    <SelectTrigger aria-label="Visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EventVisibility.PUBLIC}>Public — listed on Bookit</SelectItem>
                      <SelectItem value={EventVisibility.UNLISTED}>
                        Unlisted — anyone with the link
                      </SelectItem>
                      <SelectItem value={EventVisibility.PRIVATE}>Private — invited only</SelectItem>
                      <SelectItem value={EventVisibility.INVITE_CODE_REQUIRED}>
                        Invitation code required
                      </SelectItem>
                      <SelectItem value={EventVisibility.INVITE_LINK_REQUIRED}>
                        Invitation link required
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Field label="Venue" htmlFor="w-venue" required>
                  <Input
                    value={state.venue}
                    onChange={(event) => set("venue", event.target.value)}
                    placeholder="Nyayo National Stadium"
                  />
                </Field>
                <Field label="City" htmlFor="w-city" required>
                  <Input
                    value={state.city}
                    onChange={(event) => set("city", event.target.value)}
                  />
                </Field>
                <Field label="Starts" htmlFor="w-starts" required>
                  <Input
                    type="datetime-local"
                    value={state.startsAt}
                    onChange={(event) => set("startsAt", event.target.value)}
                  />
                </Field>
                <Field label="Ends" htmlFor="w-ends" required>
                  <Input
                    type="datetime-local"
                    value={state.endsAt}
                    onChange={(event) => set("endsAt", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {current.id === "tickets" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Ticket types</h2>
                <p className="mt-1 text-sm text-muted">
                  Each tier gets its own inventory. Bookit holds seats for 10 minutes during
                  checkout and releases them automatically if payment does not complete.
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {state.tiers.map((tier, index) => (
                  <li
                    key={index}
                    className="grid gap-3 rounded-card-sm border border-line p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
                  >
                    <Field label="Name" htmlFor={`tier-name-${index}`}>
                      <Input
                        value={tier.name}
                        onChange={(event) =>
                          set(
                            "tiers",
                            state.tiers.map((entry, position) =>
                              position === index ? { ...entry, name: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Price (KES)" htmlFor={`tier-price-${index}`}>
                      <Input
                        type="number"
                        min={0}
                        value={tier.price}
                        onChange={(event) =>
                          set(
                            "tiers",
                            state.tiers.map((entry, position) =>
                              position === index ? { ...entry, price: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Quantity" htmlFor={`tier-qty-${index}`}>
                      <Input
                        type="number"
                        min={1}
                        value={tier.quantity}
                        onChange={(event) =>
                          set(
                            "tiers",
                            state.tiers.map((entry, position) =>
                              position === index
                                ? { ...entry, quantity: event.target.value }
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
                        disabled={state.tiers.length === 1}
                        onClick={() =>
                          set(
                            "tiers",
                            state.tiers.filter((_, position) => position !== index),
                          )
                        }
                        className="text-error hover:bg-error-tint"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() =>
                  set("tiers", [...state.tiers, { name: "", price: "", quantity: "" }])
                }
              >
                Add ticket type
              </Button>
            </div>
          ) : null}

          {current.id === "tables" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Tables & seating</h2>
                <p className="mt-1 text-sm text-muted">
                  Guests reserve seats and you assign tables from the guest list manager.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Number of tables" htmlFor="w-tables">
                  <Input
                    type="number"
                    min={1}
                    value={state.tableCount}
                    onChange={(event) => set("tableCount", event.target.value)}
                  />
                </Field>
                <Field label="Seats per table" htmlFor="w-seats">
                  <Input
                    type="number"
                    min={1}
                    value={state.seatsPerTable}
                    onChange={(event) => set("seatsPerTable", event.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Meal options"
                htmlFor="w-meals"
                hint="Comma separated. Guests pick one when they confirm."
              >
                <Input
                  value={state.mealOptions}
                  onChange={(event) => set("mealOptions", event.target.value)}
                />
              </Field>
              <p className="rounded-card-sm bg-surface-secondary p-3.5 text-sm text-ink-secondary">
                Total seated capacity:{" "}
                <strong className="text-ink">
                  {(Number(state.tableCount) || 0) * (Number(state.seatsPerTable) || 0)}
                </strong>
              </p>
            </div>
          ) : null}

          {current.id === "invites" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Invitations</h2>
                <p className="mt-1 text-sm text-muted">
                  Each guest gets a unique code with its own guest allowance and expiry. Bookit
                  stores only a hash of the code — it is shown once when issued and never appears
                  in logs.
                </p>
              </div>
              <Field
                label="Invitations expire after"
                htmlFor="w-invite-expiry"
                hint="Days from the moment you send them."
              >
                <Input
                  type="number"
                  min={1}
                  value={state.inviteExpiryDays}
                  onChange={(event) => set("inviteExpiryDays", event.target.value)}
                />
              </Field>
              <p className="rounded-card-sm bg-info-tint p-3.5 text-sm text-info">
                You will be able to import your guest list from CSV and send codes by SMS or email
                once the event is saved.
              </p>
            </div>
          ) : null}

          {current.id === "recurrence" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Recurrence</h2>
                <p className="mt-1 text-sm text-muted">
                  Bookit models the series separately from its occurrences, so attendance, notes
                  and contributions are tracked per meeting.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">How often does it meet?</span>
                <Select
                  value={state.recurrence}
                  onValueChange={(value) => set("recurrence", value)}
                >
                  <SelectTrigger aria-label="Recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREQ=WEEKLY;BYDAY=SA">Every Saturday</SelectItem>
                    <SelectItem value="FREQ=MONTHLY;BYDAY=1SA">
                      First Saturday of every month
                    </SelectItem>
                    <SelectItem value="FREQ=MONTHLY;BYDAY=-1SU">
                      Last Sunday of every month
                    </SelectItem>
                    <SelectItem value="FREQ=MONTHLY;BYMONTHDAY=1">
                      The 1st of every month
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {current.id === "contributions" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Contributions</h2>
                <p className="mt-1 text-sm text-muted">
                  Track pledges and payments separately from ticket revenue — useful for ruracio,
                  chama and fundraising events.
                </p>
              </div>
              <Field
                label="Target amount (KES)"
                htmlFor="w-contribution"
                hint="Leave blank if there is no target."
              >
                <Input
                  type="number"
                  min={0}
                  value={state.contributionTarget}
                  onChange={(event) => set("contributionTarget", event.target.value)}
                  placeholder="300000"
                />
              </Field>
            </div>
          ) : null}

          {current.id === "capacity" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Capacity & RSVP</h2>
                <p className="mt-1 text-sm text-muted">
                  When you are full, extra guests go on a waitlist and are promoted automatically
                  if someone cancels.
                </p>
              </div>
              <Field
                label="Maximum guests"
                htmlFor="w-capacity"
                hint="Counts every guest, not every booking."
                required
              >
                <Input
                  type="number"
                  min={1}
                  value={state.capacity}
                  onChange={(event) => set("capacity", event.target.value)}
                  placeholder="250"
                />
              </Field>
            </div>
          ) : null}

          {current.id === "policies" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-ink">Policies</h2>

              <Field label="Refund policy" htmlFor="w-refund">
                <Textarea
                  rows={3}
                  value={state.refundPolicy}
                  onChange={(event) => set("refundPolicy", event.target.value)}
                />
              </Field>

              {behaviour?.issuesTickets ? (
                <>
                  <Field
                    label="Maximum tickets per account"
                    htmlFor="w-max-account"
                    hint="Enforced server-side at checkout."
                  >
                    <Input
                      type="number"
                      min={1}
                      value={state.maxPerAccount}
                      onChange={(event) => set("maxPerAccount", event.target.value)}
                    />
                  </Field>

                  <label className="flex items-start gap-3 rounded-card-sm border border-line p-4">
                    <input
                      type="checkbox"
                      checked={state.resaleEnabled}
                      onChange={(event) => set("resaleEnabled", event.target.checked)}
                      className="mt-1 size-4 accent-[var(--color-primary)]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Allow verified resale
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">
                        Buyers can only resell tickets Bookit issued, and ownership transfers
                        atomically — the seller&apos;s QR dies the moment the sale completes.
                      </span>
                    </span>
                  </label>

                  {state.resaleEnabled ? (
                    <Field
                      label="Maximum markup over face value (%)"
                      htmlFor="w-markup"
                      hint="0 caps resale at face value."
                    >
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={state.resaleMaxMarkup}
                        onChange={(event) => set("resaleMaxMarkup", event.target.value)}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {current.id === "review" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-ink">Review</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Type", state.type ? EVENT_TYPE_LABEL[state.type] : "—"],
                  ["Title", state.title || "—"],
                  ["Category", CATEGORY_LABEL[state.category]],
                  ["Visibility", state.visibility.replace(/_/g, " ").toLowerCase()],
                  ["Venue", state.venue ? `${state.venue}, ${state.city}` : "—"],
                  ["Starts", state.startsAt || "—"],
                  ["Ends", state.endsAt || "—"],
                  ...(behaviour?.issuesTickets
                    ? ([
                        [
                          "Ticket types",
                          state.tiers
                            .filter((tier) => tier.name)
                            .map((tier) => `${tier.name} (${tier.quantity || 0})`)
                            .join(", ") || "—",
                        ],
                        [
                          "Resale",
                          state.resaleEnabled
                            ? `Allowed up to ${state.resaleMaxMarkup}% markup`
                            : "Not allowed",
                        ],
                      ] as Array<[string, string]>)
                    : ([["Capacity", state.capacity || "Unlimited"]] as Array<[string, string]>)),
                  ...(behaviour?.supportsTables
                    ? ([
                        ["Tables", `${state.tableCount} × ${state.seatsPerTable} seats`],
                      ] as Array<[string, string]>)
                    : []),
                  ...(behaviour?.recurring
                    ? ([["Recurrence", state.recurrence]] as Array<[string, string]>)
                    : []),
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {behaviour ? (
                <div className="flex flex-wrap gap-2">
                  {behaviour.issuesTickets ? <Badge tone="brand">Issues tickets</Badge> : null}
                  {behaviour.createsBooking ? <Badge tone="brand">Creates bookings</Badge> : null}
                  {behaviour.requiresPayment ? <Badge tone="brand">Takes payment</Badge> : null}
                  {behaviour.guestListDriven ? <Badge tone="brand">Guest list</Badge> : null}
                  {behaviour.supportsTables ? <Badge tone="brand">Tables</Badge> : null}
                  {behaviour.supportsContributions ? (
                    <Badge tone="brand">Contributions</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        <p className="text-sm text-muted" aria-live="polite">
          Step {step + 1} of {steps.length}
        </p>

        {step === steps.length - 1 ? (
          <Button type="button" onClick={() => setSubmitted(true)}>
            Save draft
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
            disabled={!canAdvance}
          >
            Continue
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
