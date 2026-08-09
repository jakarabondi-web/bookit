import { describe, expect, it } from "vitest";
import { PaymentMethod, TicketStatus } from "@/domain/enums";
import { kes } from "@/domain/money";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

/**
 * `ticketsForUser` decides which actions the account UI offers, so it is the
 * thing that has to be right: an over-permissive answer means offering a
 * button that the service will reject, and an under-permissive one means
 * hiding an action the user is entitled to. The transfer and resale rules
 * themselves are covered in `resale-transfer.test.ts`.
 */
async function ownedTicket(
  options: { resaleEnabled?: boolean; resaleMaxMarkupBps?: number } = {},
) {
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

const rowFor = async (container: Awaited<ReturnType<typeof ownedTicket>>["container"]) =>
  (await container.catalog.ticketsForUser("usr_test"))[0]!;

describe("ticket action context", () => {
  it("states the resale ceiling as face value plus the organizer's markup", async () => {
    const { container } = await ownedTicket({ resaleMaxMarkupBps: 1000 }); // +10%
    const row = await rowFor(container);

    expect(row.ticket.facePrice.amount).toBe(kes(1000).amount);
    expect(row.maxResalePrice.amount).toBe(kes(1100).amount);
    expect(row.resaleOpen).toBe(true);
  });

  it("caps resale at face value when the organizer allows no markup", async () => {
    const { container } = await ownedTicket({ resaleMaxMarkupBps: 0 });
    const row = await rowFor(container);

    expect(row.maxResalePrice.amount).toBe(row.ticket.facePrice.amount);
  });

  it("closes resale when the organizer has it disabled", async () => {
    const { container } = await ownedTicket({ resaleEnabled: false });
    const row = await rowFor(container);

    expect(row.resaleOpen).toBe(false);
  });

  it("reports resale closed once the organizer's window has passed", async () => {
    const { container, ticket } = await ownedTicket();
    const event = await container.uow.repos.events.findById(ticket.eventId);
    await container.uow.repos.events.update(event!.id, {
      policies: {
        ...event!.policies,
        resaleClosesAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });

    expect((await rowFor(container)).resaleOpen).toBe(false);
  });

  it("surfaces a pending transfer, so the sender can find and cancel it", async () => {
    const { container, ticket } = await ownedTicket();
    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "friend@example.co.ke",
    });

    const row = await rowFor(container);
    expect(row.pendingTransfer?.id).toBe(transfer.id);
    expect(row.pendingTransfer?.toEmail).toBe("friend@example.co.ke");
    // Suspended while pending — the account page must still show this ticket.
    expect(row.ticket.status).toBe(TicketStatus.SUSPENDED);
  });

  it("stops reporting a transfer once it is cancelled, and frees the ticket", async () => {
    const { container, ticket } = await ownedTicket();
    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "friend@example.co.ke",
    });
    await container.tickets.cancelTransfer(actor(), transfer.id);

    const row = await rowFor(container);
    expect(row.pendingTransfer).toBeNull();
    expect(row.ticket.status).toBe(TicketStatus.ACTIVE);
  });

  it("surfaces an active listing with its asking price", async () => {
    const { container, ticket } = await ownedTicket();
    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1050),
    });

    const row = await rowFor(container);
    expect(row.activeListing?.id).toBe(listing.id);
    expect(row.activeListing?.askPrice.amount).toBe(kes(1050).amount);
    expect(row.ticket.status).toBe(TicketStatus.LISTED);
  });

  it("clears the listing once cancelled, and frees the ticket", async () => {
    const { container, ticket } = await ownedTicket();
    const listing = await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });
    await container.resale.cancelListing(actor(), listing.id);

    const row = await rowFor(container);
    expect(row.activeListing).toBeNull();
    expect(row.ticket.status).toBe(TicketStatus.ACTIVE);
  });

  it("refuses an asking price above the organizer's cap", async () => {
    const { container, ticket } = await ownedTicket({ resaleMaxMarkupBps: 1000 });

    await expect(
      container.resale.createListing(actor(), { ticketId: ticket.id, askPrice: kes(1500) }),
    ).rejects.toMatchObject({ code: "RESALE_NOT_ALLOWED" });
  });

  it("will not transfer a ticket that is listed for resale", async () => {
    const { container, ticket } = await ownedTicket();
    await container.resale.createListing(actor(), {
      ticketId: ticket.id,
      askPrice: kes(1000),
    });

    await expect(
      container.tickets.initiateTransfer(actor(), {
        ticketId: ticket.id,
        toEmail: "friend@example.co.ke",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
