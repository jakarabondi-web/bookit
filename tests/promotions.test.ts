import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/domain/enums";
import { kes } from "@/domain/money";
import { ACCOUNT } from "@/server/services/ledger-service";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

/**
 * Promo codes are exercised at the checkout layer, not just the service
 * layer — the whole point of redeeming inside the transaction is that the
 * discount, the redemption count and the ledger all move together or not at
 * all.
 */
describe("promo codes", () => {
  it("discounts a percentage code off the subtotal and reduces fees to match", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 10,
      priceMajor: 1000, // KES 1,000 per ticket
    });
    await container.promotions.createPromoCode("org_test", event.id, {
      code: "SAVE20",
      kind: "PERCENT",
      percentBps: 2000, // 20%
    });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 2 }], // KES 2,000 raw
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
      promoCode: "save20", // lowercase — normalization must still match
    });

    expect(result.order.discount.amount).toBe(kes(400).amount); // 20% of 2,000
    expect(result.order.subtotal.amount).toBe(kes(1600).amount); // 2,000 − 400
    expect(result.order.fees.amount).toBe(kes(96).amount); // 6% of the discounted 1,600
    expect(result.order.total.amount).toBe(kes(1696).amount);
    expect(result.order.promoCodeId).not.toBeNull();

    const codes = await container.promotions.listPromoCodes("org_test");
    expect(codes[0]!.redemptionCount).toBe(1);
  });

  it("caps a fixed discount at the subtotal instead of going negative", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 10,
      priceMajor: 500,
    });
    await container.promotions.createPromoCode("org_test", event.id, {
      code: "BIGSAVE",
      kind: "FIXED",
      fixedAmount: kes(5000), // far more than one ticket costs
    });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
      promoCode: "BIGSAVE",
    });

    expect(result.order.subtotal.amount).toBe(0);
    expect(result.order.discount.amount).toBe(kes(500).amount);
    expect(result.order.total.amount).toBe(0); // 0% of a KES 0 subtotal
  });

  it("keeps the ledger balanced when a discounted order is fulfilled", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 10,
      priceMajor: 1000,
    });
    await container.promotions.createPromoCode("org_test", event.id, {
      code: "TENOFF",
      kind: "PERCENT",
      percentBps: 1000, // 10%
    });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 3 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
      promoCode: "TENOFF",
    });
    await container.checkout.fulfilOrder(actor(), result.order.id, {
      method: PaymentMethod.MPESA,
    });

    const organizerPayable = await container.ledger.balance(
      ACCOUNT.organizerPayable(event.organizerId),
    );
    const feeRevenue = await container.ledger.balance(ACCOUNT.PLATFORM_FEE_REVENUE);
    const customerFunds = await container.ledger.balance(ACCOUNT.CUSTOMER_FUNDS);

    expect(organizerPayable.amount).toBe(result.order.subtotal.amount);
    expect(feeRevenue.amount).toBe(result.order.fees.amount);
    expect(customerFunds.amount).toBe(result.order.total.amount);
    await container.ledger.assertAllBalanced();
  });

  it("rejects an unknown code and never touches inventory or redemption count", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 5 });

    await expect(
      container.checkout.startCheckout(actor(), {
        eventId: event.id,
        lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        buyerEmail: "buyer@example.co.ke",
        buyerPhone: "+254700000001",
        promoCode: "NOPE",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    // The failed checkout must not have consumed a seat.
    const available = await container.uow.repos.inventory.countAvailableForEvent(event.id);
    expect(available).toBe(5);
  });

  it("refuses a code once its redemption cap is reached", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 10 });
    await container.promotions.createPromoCode("org_test", event.id, {
      code: "ONECODE",
      kind: "PERCENT",
      percentBps: 500,
      maxRedemptions: 1,
    });

    await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      buyerEmail: "first@example.co.ke",
      buyerPhone: "+254700000001",
      promoCode: "ONECODE",
    });

    await expect(
      container.checkout.startCheckout(actor(), {
        eventId: event.id,
        lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        buyerEmail: "second@example.co.ke",
        buyerPhone: "+254700000002",
        promoCode: "ONECODE",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses to create a duplicate code on the same event", async () => {
    const container = freshContainer();
    const { event } = await seedTicketedEvent(container, { quantity: 5 });
    await container.promotions.createPromoCode("org_test", event.id, {
      code: "DUPE",
      kind: "PERCENT",
      percentBps: 1000,
    });

    await expect(
      container.promotions.createPromoCode("org_test", event.id, {
        code: "dupe", // normalization must catch this as the same code
        kind: "FIXED",
        fixedAmount: kes(100),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses to create a code on an event that belongs to another organizer", async () => {
    const container = freshContainer();
    const { event } = await seedTicketedEvent(container, { quantity: 5 });

    await expect(
      container.promotions.createPromoCode("org_someone_else", event.id, {
        code: "STEAL",
        kind: "PERCENT",
        percentBps: 1000,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("affiliate links", () => {
  it("creates a link with a unique code and tracks clicks", async () => {
    const container = freshContainer();
    const { event } = await seedTicketedEvent(container, { quantity: 5 });

    const link = await container.promotions.createAffiliateLink("org_test", event.id, {
      label: "DJ Mo — Instagram",
    });
    expect(link.code).toMatch(/^[a-z0-9]{4,6}$/);
    expect(link.clickCount).toBe(0);

    await container.promotions.recordClick(link.code);
    await container.promotions.recordClick(link.code);

    const [after] = await container.promotions.listAffiliateLinks("org_test");
    expect(after!.clickCount).toBe(2);
  });

  it("returns null for an unknown code rather than throwing", async () => {
    const container = freshContainer();
    expect(await container.promotions.recordClick("ghost")).toBeNull();
  });
});
