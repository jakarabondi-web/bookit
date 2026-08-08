import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@/domain/enums";
import { isDomainError } from "@/domain/errors";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

/**
 * The guarantee this file exists to protect: Bookit must never sell the same
 * seat twice, no matter how the requests interleave.
 */
describe("inventory concurrency", () => {
  it("never oversells the final unit under concurrent checkout", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 1 });

    // Ten buyers race for one seat, started in the same tick.
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        container.checkout.startCheckout(actor({ userId: `usr_race_${index}` }), {
          eventId: event.id,
          lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
          buyerEmail: `race${index}@example.co.ke`,
          buyerPhone: "+254700000001",
          method: PaymentMethod.MPESA,
        }),
      ),
    );

    const succeeded = attempts.filter((result) => result.status === "fulfilled");
    const failed = attempts.filter((result) => result.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);

    for (const result of failed) {
      const reason = (result as PromiseRejectedResult).reason;
      expect(isDomainError(reason) && reason.code).toBe("SOLD_OUT");
    }

    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(0);
  });

  it("releases held inventory when a hold expires unpaid", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 3 });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 2 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });

    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(1);

    // Push the hold into the past, then run the expiry job.
    await container.uow.repos.inventory.createHold({
      ...result.hold,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const released = await container.checkout.releaseExpiredHolds();

    expect(released).toBe(1);
    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(3);
  });

  it("does not release a hold whose order has already been fulfilled", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 2 });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });

    await container.checkout.fulfilOrder(actor(), result.order.id, {
      method: PaymentMethod.MPESA,
    });

    await container.uow.repos.inventory.createHold({
      ...result.hold,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    expect(await container.checkout.releaseExpiredHolds()).toBe(0);
    // Still sold, not returned to the pool.
    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(1);
  });

  it("enforces the per-account ticket limit server-side", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, {
      quantity: 20,
      maxPerAccount: 4,
    });

    const first = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 4 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });
    await container.checkout.fulfilOrder(actor(), first.order.id, {
      method: PaymentMethod.MPESA,
    });

    await expect(
      container.checkout.startCheckout(actor(), {
        eventId: event.id,
        lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        buyerEmail: "buyer@example.co.ke",
        buyerPhone: "+254700000001",
      }),
    ).rejects.toThrow(/maximum of 4 tickets/i);
  });

  it("rolls the whole transaction back when one line is short", async () => {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 2 });

    await expect(
      container.checkout.startCheckout(actor(), {
        eventId: event.id,
        // More than exists — the whole checkout must fail.
        lines: [{ ticketTypeId: ticketType.id, quantity: 5 }],
        buyerEmail: "buyer@example.co.ke",
        buyerPhone: "+254700000001",
      }),
    ).rejects.toThrow();

    // Nothing left held: the rollback returned every unit.
    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(2);
  });
});
