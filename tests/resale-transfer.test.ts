import { describe, expect, it } from "vitest";
import { PaymentMethod, ResaleListingStatus, TicketStatus } from "@/domain/enums";
import { kes } from "@/domain/money";
import { ACCOUNT } from "@/server/services/ledger-service";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

async function ownedTicket(options: {
  resaleEnabled?: boolean;
  resaleMaxMarkupBps?: number;
} = {}) {
  const container = freshContainer();
  const { event, ticketType } = await seedTicketedEvent(container, {
    quantity: 5,
    priceMajor: 1000,
    resaleEnabled: options.resaleEnabled ?? true,
    resaleMaxMarkupBps: options.resaleMaxMarkupBps ?? 1000,
  });

  const result = await container.checkout.startCheckout(actor(), {
    eventId: event.id,
    lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    buyerEmail: "buyer@example.co.ke",
    buyerPhone: "+254700000001",
  });
  const tickets = await container.checkout.fulfilOrder(actor(), result.order.id, {
    method: PaymentMethod.MPESA,
  });

  return { container, event, ticket: tickets[0]! };
}

describe("ticket transfer", () => {
  it("moves ownership and appends to the history", async () => {
    const { container, ticket } = await ownedTicket();

    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "other@example.co.ke",
    });
    const updated = await container.tickets.acceptTransfer(
      actor({ userId: "usr_other" }),
      transfer.id,
    );

    expect(updated.ownerUserId).toBe("usr_other");
    expect(updated.status).toBe(TicketStatus.ACTIVE);
    // Bumped twice: once on initiate, once on accept.
    expect(updated.credentialVersion).toBe(ticket.credentialVersion + 2);
    expect(updated.ownershipHistory).toHaveLength(2);
    expect(updated.ownershipHistory.at(-1)?.reason).toBe("TRANSFER");
  });

  it("refuses a transfer to the wrong recipient", async () => {
    const { container, ticket } = await ownedTicket();
    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "someone-else@example.co.ke",
    });

    await expect(
      container.tickets.acceptTransfer(actor({ userId: "usr_other" }), transfer.id),
    ).rejects.toThrow(/different email/i);
  });

  it("locks the ticket while a transfer is pending, blocking a second one", async () => {
    const { container, ticket } = await ownedTicket();
    await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "other@example.co.ke",
    });

    await expect(
      container.tickets.initiateTransfer(actor(), {
        ticketId: ticket.id,
        toEmail: "third@example.co.ke",
      }),
    ).rejects.toThrow(/active ticket/i);
  });

  it("refuses to transfer a ticket you do not own", async () => {
    const { container, ticket } = await ownedTicket();

    await expect(
      container.tickets.initiateTransfer(actor({ userId: "usr_other" }), {
        ticketId: ticket.id,
        toEmail: "other@example.co.ke",
      }),
    ).rejects.toThrow(/tickets you own/i);
  });
});

describe("verified resale", () => {
  it("refuses to list when the organizer has resale switched off", async () => {
    const { container, ticket } = await ownedTicket({ resaleEnabled: false });

    await expect(
      container.resale.createListing(actor(), { ticketId: ticket.id, askPrice: kes(1000) }),
    ).rejects.toThrow(/not enabled resale/i);
  });

  it("enforces the organizer's markup cap", async () => {
    const { container, ticket } = await ownedTicket({ resaleMaxMarkupBps: 0 });

    await expect(
      container.resale.createListing(actor(), { ticketId: ticket.id, askPrice: kes(1500) }),
    ).rejects.toThrow(/face value/i);

    // At face value it is allowed.
    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });
    expect(listing.status).toBe(ResaleListingStatus.ACTIVE);
  });

  it("locks a listed ticket so it cannot also be transferred", async () => {
    const { container, ticket } = await ownedTicket();
    await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });

    await expect(
      container.tickets.initiateTransfer(actor(), {
        ticketId: ticket.id,
        toEmail: "other@example.co.ke",
      }),
    ).rejects.toThrow(/active ticket/i);
  });

  it("transfers ownership and kills the seller's credential when a sale completes", async () => {
    const { container, ticket } = await ownedTicket();

    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1100),
    });

    const { ticket: sold, listing: soldListing } = await container.resale.completeSale(actor(), {
      listingId: listing.id,
      buyerUserId: "usr_other",
      paymentReference: "pay_test",
    });

    expect(soldListing.status).toBe(ResaleListingStatus.SOLD);
    expect(sold.ownerUserId).toBe("usr_other");
    expect(sold.status).toBe(TicketStatus.ACTIVE);
    expect(sold.credentialVersion).toBeGreaterThan(ticket.credentialVersion);
    expect(sold.ownershipHistory.at(-1)?.reason).toBe("RESALE");
  });

  it("cannot sell the same ticket twice", async () => {
    const { container, ticket } = await ownedTicket();
    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });

    const first = await container.resale.completeSale(actor(), {
      listingId: listing.id,
      buyerUserId: "usr_other",
      paymentReference: "pay_1",
    });

    // A second attempt is idempotent, not a second sale.
    const second = await container.resale.completeSale(actor(), {
      listingId: listing.id,
      buyerUserId: "usr_test",
      paymentReference: "pay_2",
    });

    expect(second.ticket.ownerUserId).toBe(first.ticket.ownerUserId);
    expect(second.ticket.ownerUserId).toBe("usr_other");
  });

  it("splits resale proceeds between the seller and the platform fee", async () => {
    const { container, ticket } = await ownedTicket();
    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });

    await container.resale.completeSale(actor(), {
      listingId: listing.id,
      buyerUserId: "usr_other",
      paymentReference: "pay_test",
    });

    // 8% platform resale fee on KES 1,000.
    const sellerPayable = await container.ledger.balance(ACCOUNT.sellerPayable("usr_test"));
    expect(sellerPayable.amount).toBe(kes(920).amount);

    await container.ledger.assertAllBalanced();
  });
});
