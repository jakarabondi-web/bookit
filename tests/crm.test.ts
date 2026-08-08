import { describe, expect, it } from "vitest";
import {
  scoreFrequency,
  scoreMonetary,
  scoreRecency,
  segmentFor,
} from "@/server/services/crm-service";

describe("CRM RFM scoring", () => {
  it("scores recency by days since last purchase", () => {
    expect(scoreRecency(0)).toBe(5);
    expect(scoreRecency(5)).toBe(5);
    expect(scoreRecency(6)).toBe(4);
    expect(scoreRecency(21)).toBe(3);
    expect(scoreRecency(35)).toBe(2);
    expect(scoreRecency(90)).toBe(1);
  });

  it("scores frequency by paid order count", () => {
    expect(scoreFrequency(1)).toBe(1);
    expect(scoreFrequency(2)).toBe(2);
    expect(scoreFrequency(3)).toBe(3);
    expect(scoreFrequency(6)).toBe(4);
    expect(scoreFrequency(12)).toBe(5);
  });

  it("scores monetary in minor units against ticketing basket sizes", () => {
    expect(scoreMonetary(50_000)).toBe(1); // KES 500
    expect(scoreMonetary(1_500_000)).toBe(2); // KES 15,000
    expect(scoreMonetary(4_000_000)).toBe(3); // KES 40,000
    expect(scoreMonetary(10_000_000)).toBe(4); // KES 100,000
    expect(scoreMonetary(25_000_000)).toBe(5); // KES 250,000
  });

  it("maps score combinations to actionable segments", () => {
    // Recent and frequent — the front row.
    expect(segmentFor({ recency: 5, frequency: 5, monetary: 4 })).toBe("CHAMPION");
    // Steady regular.
    expect(segmentFor({ recency: 3, frequency: 3, monetary: 2 })).toBe("LOYAL");
    // Rare but huge baskets.
    expect(segmentFor({ recency: 2, frequency: 2, monetary: 5 })).toBe("BIG_SPENDER");
    // First order this week.
    expect(segmentFor({ recency: 5, frequency: 1, monetary: 1 })).toBe("NEW");
    // Second order, still warm.
    expect(segmentFor({ recency: 3, frequency: 2, monetary: 2 })).toBe("PROMISING");
    // Used to buy often, gone quiet.
    expect(segmentFor({ recency: 2, frequency: 4, monetary: 3 })).toBe("AT_RISK");
    // One order, long ago.
    expect(segmentFor({ recency: 1, frequency: 1, monetary: 1 })).toBe("LAPSED");
  });

  it("never lets a stale big spender outrank churn signals entirely", () => {
    // Recency 1 (months quiet) — even M5 lands in LAPSED territory, not BIG_SPENDER.
    expect(segmentFor({ recency: 1, frequency: 1, monetary: 5 })).toBe("LAPSED");
  });
});
