import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/domain/enums";
import { kes } from "@/domain/money";
import { ACCOUNT } from "@/server/services/ledger-service";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

describe("double-entry ledger", () => {
  it("refuses to post an unbalanced transaction", async () => {
    const container = freshContainer();

    await expect(
      container.ledger.post({
        reference: "unbalanced:1",
        kind: "ADJUSTMENT",
        entries: [
          { accountCode: ACCOUNT.CUSTOMER_FUNDS, side: "DEBIT", amount: kes(1000) },
          { accountCode: ACCOUNT.PLATFORM_FEE_REVENUE, side: "CREDIT", amount: kes(900) },
        ],
      }),
    ).rejects.toThrow(/balance/i);
  });

  it("rejects negative entry amounts — direction belongs to `side`", async () => {
    const container = freshContainer();

    await expect(
      container.ledger.post({
        reference: "negative:1",
        kind: "ADJUSTMENT",
        entries: [
          { accountCode: ACCOUNT.CUSTOMER_FUNDS, side: "DEBIT", amount: kes(-500) },
          { accountCode: ACCOUNT.PLATFORM_FEE_REVENUE, side: "CREDIT", amount: kes(-500) },
        ],
      }),
    ).rejects.toThrow(/positive/i);
  });

  it("is idempotent on reference, so a replayed webhook posts once", async () => {
    const container = freshContainer();

    const first = await container.ledger.post({
      reference: "sale:once",
      kind: "TICKET_SALE",
      entries: [
        { accountCode: ACCOUNT.CUSTOMER_FUNDS, side: "DEBIT", amount: kes(1000) },
        { accountCode: ACCOUNT.PLATFORM_FEE_REVENUE, side: "CREDIT", amount: kes(1000) },
      ],
    });

    const second = await container.ledger.post({
      reference: "sale:once",
      kind: "TICKET_SALE",
      entries: [
        { accountCode: ACCOUNT.CUSTOMER_FUNDS, side: "DEBIT", amount: kes(1000) },
        { accountCode: ACCOUNT.PLATFORM_FEE_REVENUE, side: "CREDIT", amount: kes(1000) },
      ],
    });

    expect(second.id).toBe(first.id);
    expect(await container.uow.repos.ledger.listTransactions()).toHaveLength(1);
  });

  it("splits a ticket sale into organizer payable and platform fee", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 5,
      priceMajor: 1000,
    });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 2 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });
    await container.checkout.fulfilOrder(actor(), result.order.id, {
      method: PaymentMethod.MPESA,
    });

    const subtotal = result.order.subtotal.amount; // 2 × KES 1,000
    const fees = result.order.fees.amount; // 6% service fee

    expect(subtotal).toBe(kes(2000).amount);
    expect(fees).toBe(kes(120).amount);

    const organizerPayable = await container.ledger.balance(
      ACCOUNT.organizerPayable(event.organizerId),
    );
    const feeRevenue = await container.ledger.balance(ACCOUNT.PLATFORM_FEE_REVENUE);
    const customerFunds = await container.ledger.balance(ACCOUNT.CUSTOMER_FUNDS);

    // Liability and revenue accounts are credit-positive; the asset is debit-positive.
    expect(organizerPayable.amount).toBe(subtotal);
    expect(feeRevenue.amount).toBe(fees);
    expect(customerFunds.amount).toBe(subtotal + fees);

    await container.ledger.assertAllBalanced();
  });

  it("keeps every posted transaction balanced across a full sale and refund", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 5,
      priceMajor: 1000,
    });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 2 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });
    await container.checkout.fulfilOrder(actor(), result.order.id, {
      method: PaymentMethod.MPESA,
    });

    await container.refunds.refundOrder(actor({ mfaSatisfied: true }), {
      orderId: result.order.id,
      reason: "Customer request",
    });

    // The refund comes out of the organizer's payable, not the platform's fee.
    const organizerPayable = await container.ledger.balance(
      ACCOUNT.organizerPayable(event.organizerId),
    );
    const feeRevenue = await container.ledger.balance(ACCOUNT.PLATFORM_FEE_REVENUE);

    expect(organizerPayable.amount).toBe(0);
    expect(feeRevenue.amount).toBe(kes(120).amount);

    await container.ledger.assertAllBalanced();
  });
});
