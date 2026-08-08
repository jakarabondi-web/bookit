import { describe, expect, it } from "vitest";
import { freshContainer } from "./helpers";

/**
 * MarketingService end to end against the in-memory repositories: creating a
 * campaign should re-derive the current segment membership, only count
 * recipients reachable on the chosen channel, and persist a record that
 * `listCampaigns` returns.
 */
describe("MarketingService", () => {
  it("rejects an empty segment selection", async () => {
    const container = freshContainer();
    await expect(
      container.marketing.createCampaign("org_test", {
        segments: [],
        channel: "EMAIL",
        subject: "Hi",
        body: "Hello",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects an unknown segment key", async () => {
    const container = freshContainer();
    await expect(
      container.marketing.createCampaign("org_test", {
        segments: ["NOT_A_SEGMENT"],
        channel: "EMAIL",
        subject: "Hi",
        body: "Hello",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("sends nothing and records zero recipients when the segment is empty", async () => {
    const container = freshContainer();
    const { campaign, skipped } = await container.marketing.createCampaign("org_empty", {
      segments: ["CHAMPION"],
      channel: "EMAIL",
      subject: "Hello",
      body: "Nobody home",
    });
    expect(campaign.recipientCount).toBe(0);
    expect(skipped).toBe(0);

    const history = await container.marketing.listCampaigns("org_empty");
    expect(history).toHaveLength(1);
    expect(history[0]!.subject).toBe("Hello");
    expect(history[0]!.segments).toEqual(["CHAMPION"]);
  });

  it("scopes campaign history to the organizer that sent it", async () => {
    const container = freshContainer();
    await container.marketing.createCampaign("org_a", {
      segments: ["LAPSED"],
      channel: "EMAIL",
      subject: "A",
      body: "A",
    });
    await container.marketing.createCampaign("org_b", {
      segments: ["LAPSED"],
      channel: "EMAIL",
      subject: "B",
      body: "B",
    });

    expect(await container.marketing.listCampaigns("org_a")).toHaveLength(1);
    expect(await container.marketing.listCampaigns("org_b")).toHaveLength(1);
    expect((await container.marketing.listCampaigns("org_a"))[0]!.subject).toBe("A");
  });
});
