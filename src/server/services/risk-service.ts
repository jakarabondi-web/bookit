import { RiskOutcome } from "@/domain/enums";
import type { Money } from "@/domain/money";
import type { ActorContext, RiskEvent } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { RiskRepository } from "../repositories/types";

/**
 * Central risk engine.
 *
 * Rules live here rather than being scattered through checkout, resale and
 * payout code, so every decision produces a score, a set of explainable reason
 * codes and a persisted `RiskEvent` that a risk analyst can review later.
 */

export type RiskAction =
  | "CHECKOUT"
  | "RSVP"
  | "LIST_FOR_RESALE"
  | "BUY_RESALE"
  | "TRANSFER"
  | "PAYOUT_DESTINATION_CHANGE"
  | "PAYOUT_REQUEST"
  | "REFUND";

export interface RiskSignals {
  /** Age of the acting account in days. */
  accountAgeDays?: number;
  /** Orders placed by this account in the last hour. */
  recentOrderCount?: number;
  /** Failed payment attempts in the last 24h. */
  recentPaymentFailures?: number;
  /** Failed authentication attempts in the last hour. */
  failedAuthAttempts?: number;
  /** Tickets already held for this event by this account. */
  ticketsHeldForEvent?: number;
  /** Quantity requested in the current action. */
  requestedQuantity?: number;
  /** Value of the current action. */
  value?: Money;
  /** Minutes between purchase and an attempt to resell. */
  minutesSincePurchase?: number;
  /** Ask price over face value, in basis points. */
  markupBps?: number;
  /** Chargebacks recorded against this account, ever. */
  chargebackCount?: number;
  /** Distinct accounts seen on the same device. */
  accountsOnDevice?: number;
  /** Whether the device is recognised for this account. */
  knownDevice?: boolean;
  /** Set when geo-velocity between two sessions is physically implausible. */
  impossibleTravel?: boolean;
  /** Interaction timing suggests automation. */
  botLikeBehaviour?: boolean;
  /** True when the actor changed payout details in the last 24h. */
  recentPayoutDestinationChange?: boolean;
}

export interface RiskDecision {
  outcome: RiskOutcome;
  score: number;
  reasonCodes: string[];
  /** Populated when the outcome is HOLD — how long funds should be held. */
  holdHours?: number;
}

interface Rule {
  code: string;
  weight: number;
  applies: (signals: RiskSignals, action: RiskAction) => boolean;
}

const RULES: Rule[] = [
  {
    code: "NEW_ACCOUNT",
    weight: 15,
    applies: (s) => (s.accountAgeDays ?? 999) < 2,
  },
  {
    code: "VELOCITY_HIGH",
    weight: 20,
    applies: (s) => (s.recentOrderCount ?? 0) >= 5,
  },
  {
    code: "PAYMENT_FAILURES",
    weight: 15,
    applies: (s) => (s.recentPaymentFailures ?? 0) >= 3,
  },
  {
    code: "AUTH_FAILURES",
    weight: 20,
    applies: (s) => (s.failedAuthAttempts ?? 0) >= 5,
  },
  {
    code: "LARGE_QUANTITY",
    weight: 15,
    applies: (s) => (s.requestedQuantity ?? 0) > 6,
  },
  {
    code: "HIGH_VALUE",
    weight: 10,
    applies: (s) => (s.value?.amount ?? 0) >= 5_000_00,
  },
  {
    code: "IMMEDIATE_RESALE",
    weight: 25,
    applies: (s, action) =>
      action === "LIST_FOR_RESALE" && (s.minutesSincePurchase ?? Infinity) < 15,
  },
  {
    code: "ABNORMAL_MARKUP",
    weight: 20,
    applies: (s) => (s.markupBps ?? 0) > 5000,
  },
  {
    code: "CHARGEBACK_HISTORY",
    weight: 35,
    applies: (s) => (s.chargebackCount ?? 0) > 0,
  },
  {
    code: "SHARED_DEVICE",
    weight: 20,
    applies: (s) => (s.accountsOnDevice ?? 1) >= 4,
  },
  {
    code: "UNKNOWN_DEVICE",
    weight: 8,
    applies: (s) => s.knownDevice === false,
  },
  {
    code: "IMPOSSIBLE_TRAVEL",
    weight: 30,
    applies: (s) => s.impossibleTravel === true,
  },
  {
    code: "BOT_BEHAVIOUR",
    weight: 30,
    applies: (s) => s.botLikeBehaviour === true,
  },
  {
    code: "RECENT_PAYOUT_DESTINATION_CHANGE",
    weight: 40,
    applies: (s, action) =>
      (action === "PAYOUT_REQUEST" || action === "PAYOUT_DESTINATION_CHANGE") &&
      s.recentPayoutDestinationChange === true,
  },
  {
    code: "TICKET_LIMIT_APPROACHED",
    weight: 10,
    applies: (s) => (s.ticketsHeldForEvent ?? 0) >= 4,
  },
];

/** Score thresholds. Tuning these is a product decision, not a code change. */
const THRESHOLDS: Array<{ min: number; outcome: RiskOutcome }> = [
  { min: 90, outcome: RiskOutcome.BLOCK },
  { min: 70, outcome: RiskOutcome.MANUAL_REVIEW },
  { min: 50, outcome: RiskOutcome.HOLD },
  { min: 30, outcome: RiskOutcome.CHALLENGE },
  { min: 15, outcome: RiskOutcome.MONITOR },
];

export function evaluateRisk(action: RiskAction, signals: RiskSignals): RiskDecision {
  const matched = RULES.filter((rule) => rule.applies(signals, action));
  const score = Math.min(
    100,
    matched.reduce((total, rule) => total + rule.weight, 0),
  );
  const outcome =
    THRESHOLDS.find((threshold) => score >= threshold.min)?.outcome ?? RiskOutcome.ALLOW;

  return {
    outcome,
    score,
    reasonCodes: matched.map((rule) => rule.code),
    holdHours: outcome === RiskOutcome.HOLD ? 72 : undefined,
  };
}

export class RiskService {
  constructor(
    private readonly repo: RiskRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  /** Evaluates and persists a decision in one step. */
  async assess(
    action: RiskAction,
    subject: { type: RiskEvent["subjectType"]; id: string },
    signals: RiskSignals,
    _actor?: ActorContext,
  ): Promise<RiskDecision> {
    const decision = evaluateRisk(action, signals);
    await this.repo.record({
      id: newId("risk"),
      subjectType: subject.type,
      subjectId: subject.id,
      outcome: decision.outcome,
      score: decision.score,
      reasonCodes: decision.reasonCodes,
      at: this.clock.nowIso(),
    });
    return decision;
  }

  listRecent(limit = 50) {
    return this.repo.listRecent(limit);
  }

  listForSubject(type: string, id: string) {
    return this.repo.listForSubject(type, id);
  }
}
