import { describe, expect, it } from "vitest";
import { PaymentMethod, PayoutStatus, Role, TicketStatus } from "@/domain/enums";
import { kes } from "@/domain/money";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

async function paidOrder(options: { quantity?: number } = {}) {
  const container = freshContainer();
  const { event, ticketType } = await seedTicketedEvent(container, {
    quantity: 10,
    priceMajor: 1000,
    resaleEnabled: true,
    resaleMaxMarkupBps: 1000,
  });

  const result = await container.checkout.startCheckout(actor(), {
    eventId: event.id,
    lines: [{ ticketTypeId: ticketType.id, quantity: options.quantity ?? 2 }],
    buyerEmail: "buyer@example.co.ke",
    buyerPhone: "+254700000001",
  });
  const tickets = await container.checkout.fulfilOrder(actor(), result.order.id, {
    method: PaymentMethod.MPESA,
  });

  return { container, event, order: result.order, tickets };
}

describe("refunds", () => {
  it("refunds an unused order and voids its tickets", async () => {
    const { container, order, tickets } = await paidOrder();

    const outcome = await container.refunds.refundOrder(actor({ mfaSatisfied: true }), {
      orderId: order.id,
      reason: "Customer request",
    });

    expect(outcome.voided).toBe(2);
    expect(outcome.amount.amount).toBe(kes(2000).amount);

    for (const ticket of tickets) {
      const after = await container.uow.repos.tickets.findById(ticket.id);
      expect(after?.status).toBe(TicketStatus.REFUNDED);
      // Bumped, so any outstanding QR stops scanning.
      expect(after?.credentialVersion).toBeGreaterThan(ticket.credentialVersion);
    }
  });

  it("will not refund a ticket that has been transferred away", async () => {
    const { container, order, tickets } = await paidOrder({ quantity: 1 });

    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: tickets[0]!.id,
      toEmail: "other@example.co.ke",
    });
    await container.tickets.acceptTransfer(actor({ userId: "usr_other" }), transfer.id);

    const eligibility = await container.refunds.assessEligibility(order.id);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/transferred or resold/i);

    await expect(
      container.refunds.refundOrder(actor({ mfaSatisfied: true }), {
        orderId: order.id,
        reason: "Too late",
      }),
    ).rejects.toThrow();
  });

  it("will not refund a ticket that has already been used at the gate", async () => {
    const { container, event, order, tickets } = await paidOrder({ quantity: 1 });

    const credential = await container.tickets.issueCredential(actor(), tickets[0]!.id);
    await container.checkin.scan(actor(), {
      eventId: event.id,
      credential: credential.token,
    });

    const eligibility = await container.refunds.assessEligibility(order.id);
    expect(eligibility.eligible).toBe(false);
  });

  it("supports a partial refund and leaves the rest of the order intact", async () => {
    const { container, order, tickets } = await paidOrder({ quantity: 3 });

    const outcome = await container.refunds.refundOrder(actor({ mfaSatisfied: true }), {
      orderId: order.id,
      reason: "One guest dropped out",
      ticketIds: [tickets[0]!.id],
    });

    expect(outcome.voided).toBe(1);
    expect((await container.uow.repos.orders.findById(order.id))?.status).toBe(
      "PARTIALLY_REFUNDED",
    );
    expect((await container.uow.repos.tickets.findById(tickets[1]!.id))?.status).toBe(
      TicketStatus.ACTIVE,
    );
  });
});

describe("payouts", () => {
  /** Five paid tickets, so the organizer has a real payable balance. */
  const organizerFixture = () => paidOrder({ quantity: 5 });

  it("requires step-up authentication to request a payout", async () => {
    const { container, event } = await organizerFixture();

    await expect(
      container.payouts.requestPayout(
        actor({ organizerId: event.organizerId, mfaSatisfied: false }),
        {
          organizerId: event.organizerId,
          amount: kes(100),
          destinationMasked: "2547****5678",
        },
      ),
    ).rejects.toThrow(/confirm your identity/i);
  });

  it("refuses a payout larger than the available balance", async () => {
    const { container, event } = await organizerFixture();

    await expect(
      container.payouts.requestPayout(
        actor({ organizerId: event.organizerId, mfaSatisfied: true }),
        {
          organizerId: event.organizerId,
          amount: kes(1_000_000),
          destinationMasked: "2547****5678",
        },
      ),
    ).rejects.toThrow(/available balance/i);
  });

  it("refuses to let one organizer request a payout for another", async () => {
    const { container, event } = await organizerFixture();

    await expect(
      container.payouts.requestPayout(
        actor({ organizerId: "org_someone_else", mfaSatisfied: true }),
        {
          organizerId: event.organizerId,
          amount: kes(100),
          destinationMasked: "2547****5678",
        },
      ),
    ).rejects.toThrow(/another organizer/i);
  });

  it("requires a finance manager, and a different person, to approve", async () => {
    const { container, event } = await organizerFixture();

    const payout = await container.payouts.requestPayout(
      actor({ organizerId: event.organizerId, mfaSatisfied: true }),
      {
        organizerId: event.organizerId,
        amount: kes(100),
        destinationMasked: "2547****5678",
      },
    );
    expect(payout.status).toBe(PayoutStatus.PENDING);

    // An organizer owner cannot approve their own payout.
    await expect(
      container.payouts.approvePayout(
        actor({ roles: [Role.ORGANIZER_OWNER], mfaSatisfied: true }),
        payout.id,
        "Looks fine",
      ),
    ).rejects.toThrow(/finance manager/i);

    const approved = await container.payouts.approvePayout(
      actor({ userId: "usr_finance", roles: [Role.FINANCE_MANAGER], mfaSatisfied: true }),
      payout.id,
      "Verified against the ledger",
    );
    expect(approved.status).toBe(PayoutStatus.APPROVED);
  });

  it("caps the pre-event balance a new organizer can draw", async () => {
    const { container, event } = await organizerFixture();
    const balance = await container.payouts.balanceFor(event.organizerId);

    // With no organizer row the trust tier defaults to NEW: 20% pre-event.
    expect(balance.available.amount).toBeLessThanOrEqual(
      Math.round(balance.payable.amount * 0.2),
    );
    expect(balance.releasePolicy).toMatch(/20% of ticket revenue/i);
  });

  it("records an audit entry with the approval chain", async () => {
    const { container, event } = await organizerFixture();

    const payout = await container.payouts.requestPayout(
      actor({ organizerId: event.organizerId, mfaSatisfied: true }),
      { organizerId: event.organizerId, amount: kes(100), destinationMasked: "2547****5678" },
    );
    await container.payouts.approvePayout(
      actor({ userId: "usr_finance", roles: [Role.FINANCE_MANAGER], mfaSatisfied: true }),
      payout.id,
      "Verified",
    );

    const trail = await container.audit.listForResource("Payout", payout.id);
    const approval = trail.find((entry) => entry.action === "payout.approved");

    expect(approval).toBeDefined();
    expect(approval?.approvalChain).toContain("usr_finance");
    expect(approval?.mfaSatisfied).toBe(true);
  });
});
