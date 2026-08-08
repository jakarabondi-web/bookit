import { describe, expect, it } from "vitest";
import { EventType } from "@/domain/enums";
import { behaviourFor, EVENT_TYPE_BEHAVIOUR } from "@/domain/event-type-policy";
import { add, allocate, formatMoney, kes, money, percentageOf, subtract } from "@/domain/money";
import { assertTransition, ORDER_TRANSITIONS, TICKET_TRANSITIONS } from "@/domain/state-machines";
import { redact } from "@/server/services/audit-service";
import { evaluateRisk } from "@/server/services/risk-service";

describe("money", () => {
  it("refuses non-integer minor units", () => {
    expect(() => money(10.5)).toThrow(/integer/i);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(100, "KES"), money(100, "USD"))).toThrow(/mismatch/i);
  });

  it("adds and subtracts without floating point drift", () => {
    // 0.1 + 0.2 in floats is famously not 0.3; in minor units it just works.
    const total = add(kes(0.1), kes(0.2));
    expect(total.amount).toBe(30);
    expect(subtract(kes(10), kes(3.33)).amount).toBe(667);
  });

  it("allocates a total without creating or destroying money", () => {
    const parts = allocate(kes(10), 3);
    expect(parts).toHaveLength(3);
    expect(parts.reduce((total, part) => total + part.amount, 0)).toBe(1000);
    expect(parts.map((part) => part.amount)).toEqual([334, 333, 333]);
  });

  it("computes percentages in basis points", () => {
    expect(percentageOf(kes(1000), 600).amount).toBe(kes(60).amount);
    expect(percentageOf(kes(1000), 0).amount).toBe(0);
  });

  it("formats Kenyan shillings for display", () => {
    expect(formatMoney(kes(2500))).toMatch(/2,500/);
    expect(formatMoney(kes(2500))).toMatch(/KES/);
  });
});

describe("state machines", () => {
  it("allows a legal ticket transition", () => {
    expect(() => assertTransition(TICKET_TRANSITIONS, "ACTIVE", "LISTED", "Ticket")).not.toThrow();
  });

  it("blocks an illegal ticket transition", () => {
    expect(() => assertTransition(TICKET_TRANSITIONS, "REFUNDED", "ACTIVE", "Ticket")).toThrow(
      /cannot move/i,
    );
  });

  it("treats terminal states as terminal", () => {
    expect(TICKET_TRANSITIONS.CONSUMED).toHaveLength(0);
    expect(ORDER_TRANSITIONS.REFUNDED).toHaveLength(0);
  });

  it("is a no-op when the state is unchanged", () => {
    expect(() => assertTransition(ORDER_TRANSITIONS, "PAID", "PAID", "Order")).not.toThrow();
  });
});

describe("event type policy", () => {
  it("covers every event type", () => {
    for (const type of Object.values(EventType)) {
      expect(EVENT_TYPE_BEHAVIOUR[type]).toBeDefined();
    }
  });

  it("keeps bookings and tickets as separate concepts", () => {
    // A banquet must never be forced through the ticket abstraction.
    const banquet = behaviourFor(EventType.BANQUET);
    expect(banquet.issuesTickets).toBe(false);
    expect(banquet.createsBooking).toBe(true);
    expect(banquet.supportsTables).toBe(true);

    const paid = behaviourFor(EventType.PAID_TICKET);
    expect(paid.issuesTickets).toBe(true);
    expect(paid.createsBooking).toBe(false);

    // Hybrid is the only type that does both.
    const hybrid = behaviourFor(EventType.HYBRID);
    expect(hybrid.issuesTickets).toBe(true);
    expect(hybrid.createsBooking).toBe(true);
  });

  it("marks only invitation events as requiring an invite", () => {
    expect(behaviourFor(EventType.PRIVATE_INVITATION).requiresInvite).toBe(true);
    expect(behaviourFor(EventType.FREE_RSVP).requiresInvite).toBe(false);
  });
});

describe("risk engine", () => {
  it("allows an ordinary purchase", () => {
    const decision = evaluateRisk("CHECKOUT", {
      accountAgeDays: 400,
      recentOrderCount: 1,
      requestedQuantity: 2,
      knownDevice: true,
    });
    expect(decision.outcome).toBe("ALLOW");
    expect(decision.reasonCodes).toHaveLength(0);
  });

  it("blocks a purchase showing several strong signals at once", () => {
    const decision = evaluateRisk("CHECKOUT", {
      accountAgeDays: 0,
      recentOrderCount: 9,
      chargebackCount: 2,
      botLikeBehaviour: true,
      accountsOnDevice: 6,
      requestedQuantity: 10,
    });
    expect(decision.outcome).toBe("BLOCK");
    expect(decision.reasonCodes).toContain("CHARGEBACK_HISTORY");
    expect(decision.reasonCodes).toContain("BOT_BEHAVIOUR");
  });

  it("flags a ticket listed for resale minutes after purchase", () => {
    const decision = evaluateRisk("LIST_FOR_RESALE", { minutesSincePurchase: 2 });
    expect(decision.reasonCodes).toContain("IMMEDIATE_RESALE");
    expect(decision.outcome).not.toBe("ALLOW");
  });

  it("treats a payout after a destination change as high risk", () => {
    const decision = evaluateRisk("PAYOUT_REQUEST", {
      recentPayoutDestinationChange: true,
      value: money(50_000_00, "KES"),
    });
    expect(decision.reasonCodes).toContain("RECENT_PAYOUT_DESTINATION_CHANGE");
    expect(["HOLD", "MANUAL_REVIEW", "BLOCK"]).toContain(decision.outcome);
  });

  it("always produces explainable reason codes", () => {
    const decision = evaluateRisk("CHECKOUT", { accountAgeDays: 0, recentOrderCount: 6 });
    expect(decision.reasonCodes.length).toBeGreaterThan(0);
    expect(decision.score).toBeGreaterThan(0);
  });
});

describe("audit redaction", () => {
  it("strips secrets from before/after snapshots", () => {
    const redacted = redact({
      email: "person@example.co.ke",
      password: "hunter2",
      tokenHash: "abc123",
      nested: { kraPin: "A001", city: "Nairobi" },
    });

    expect(redacted).toMatchObject({
      email: "person@example.co.ke",
      password: "[redacted]",
      tokenHash: "[redacted]",
      nested: { kraPin: "[redacted]", city: "Nairobi" },
    });
  });

  it("returns null for an absent snapshot", () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeNull();
  });
});
