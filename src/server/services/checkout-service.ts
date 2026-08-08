import { OrderStatus, PaymentMethod, PaymentStatus, RiskOutcome, TicketStatus } from "@/domain/enums";
import { DomainError, notFound, validationError } from "@/domain/errors";
import { add, money, percentageOf, sum, zero, type Money } from "@/domain/money";
import { assertTransition, ORDER_TRANSITIONS } from "@/domain/state-machines";
import type {
  ActorContext,
  Hold,
  InventoryUnit,
  Order,
  OrderItem,
  Ticket,
  TicketId,
} from "@/domain/types";
import { config } from "../config";
import { addSeconds, systemClock, type Clock } from "../lib/clock";
import { humanCode, newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import { LedgerService, ACCOUNT } from "./ledger-service";
import type { NotificationService } from "./notification-service";
import type { RiskService } from "./risk-service";

/**
 * Checkout: order creation, inventory holds and fulfilment.
 *
 * The critical ordering is the one the platform lives or dies by:
 *   1. create the order
 *   2. atomically reserve inventory (row locks, inside one transaction)
 *   3. create a hold with an expiry
 *   4. initiate payment
 *   5. convert the hold to sold ONLY after verified payment confirmation
 *   6. release on timeout or failure
 *
 * Steps 1–4 happen here; step 5 is driven by `PaymentService` from a verified
 * webhook, and step 6 by `releaseExpiredHolds` on a schedule.
 */

export interface CheckoutLine {
  ticketTypeId: string;
  quantity: number;
}

export interface StartCheckoutInput {
  eventId: string;
  lines: CheckoutLine[];
  buyerEmail: string;
  buyerPhone?: string;
  /** Payment method the buyer selected; FREE for zero-value orders. */
  method?: PaymentMethod;
  idempotencyKey?: string;
}

export interface StartCheckoutResult {
  order: Order;
  hold: Hold;
  paymentId: string | null;
  customerMessage: string;
  /** Set when the risk engine wants a challenge or review before payment. */
  riskOutcome: RiskOutcome;
}

export class CheckoutService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: {
      ledger: LedgerService;
      risk: RiskService;
      audit: AuditService;
      notifications: NotificationService;
      /** Initiates payment once inventory is safely held. */
      initiatePayment: (input: {
        order: Order;
        method: PaymentMethod;
        phone?: string;
        email: string;
      }) => Promise<{ paymentId: string; customerMessage: string }>;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  async startCheckout(
    actor: ActorContext,
    input: StartCheckoutInput,
  ): Promise<StartCheckoutResult> {
    if (input.lines.length === 0) {
      throw validationError("Select at least one ticket");
    }

    // A retried checkout must never double-charge or double-hold inventory.
    if (input.idempotencyKey) {
      const existing = await this.uow.repos.orders.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const hold = existing.holdId
          ? await this.uow.repos.inventory.findHold(existing.holdId)
          : null;
        if (hold) {
          return {
            order: existing,
            hold,
            paymentId: null,
            customerMessage: "This checkout is already in progress.",
            riskOutcome: RiskOutcome.ALLOW,
          };
        }
      }
    }

    const requestedQuantity = input.lines.reduce((total, line) => total + line.quantity, 0);

    const { order, hold, subtotal } = await this.uow.runInTransaction(async (repos) => {
      const event = await repos.events.findById(input.eventId);
      if (!event) throw notFound("Event", input.eventId);
      if (event.status === "CANCELLED") {
        throw new DomainError("INVALID_STATE", "This event has been cancelled");
      }

      // Per-account ticket limit, enforced server-side. The UI mirrors it, but
      // the UI is not a security boundary.
      if (actor.userId) {
        const alreadyHeld = await repos.tickets.countOwnedForEvent(actor.userId, event.id);
        if (alreadyHeld + requestedQuantity > event.policies.maxTicketsPerAccount) {
          throw validationError(
            `This event allows a maximum of ${event.policies.maxTicketsPerAccount} tickets per account`,
            { limit: event.policies.maxTicketsPerAccount, alreadyHeld },
          );
        }
      }

      const items: OrderItem[] = [];
      const heldUnits: InventoryUnit[] = [];
      const orderId = newId("ord");
      const holdId = newId("hld");

      for (const line of input.lines) {
        if (line.quantity <= 0) throw validationError("Ticket quantity must be at least 1");

        const ticketType = await repos.ticketTypes.findById(line.ticketTypeId);
        if (!ticketType || ticketType.eventId !== event.id) {
          throw notFound("TicketType", line.ticketTypeId);
        }
        if (line.quantity > ticketType.maxPerOrder) {
          throw validationError(
            `You can buy at most ${ticketType.maxPerOrder} × ${ticketType.name} per order`,
          );
        }
        const nowIso = this.clock.nowIso();
        if (nowIso < ticketType.salesStartAt) {
          throw new DomainError("INVALID_STATE", `${ticketType.name} is not on sale yet`);
        }
        if (nowIso > ticketType.salesEndAt) {
          throw new DomainError("INVALID_STATE", `Sales for ${ticketType.name} have closed`);
        }

        // The single most important call in the system: it both selects and
        // marks the units in one locked step, so two buyers racing for the last
        // seat cannot both win.
        const units = await repos.inventory.lockAvailableUnits(
          ticketType.id,
          line.quantity,
          holdId,
        );
        if (units.length < line.quantity) {
          throw new DomainError("SOLD_OUT", `Only ${units.length} × ${ticketType.name} left`, {
            ticketTypeId: ticketType.id,
            available: units.length,
          });
        }
        heldUnits.push(...units);

        items.push({
          id: newId("oi"),
          ticketTypeId: ticketType.id,
          quantity: line.quantity,
          unitPrice: ticketType.price,
          lineTotal: money(
            ticketType.price.amount * line.quantity,
            ticketType.price.currency,
          ),
        });
      }

      const subtotalValue = sum(
        items.map((item) => item.lineTotal),
        items[0]?.lineTotal.currency ?? "KES",
      );
      const fees = percentageOf(subtotalValue, config.checkout.serviceFeeBps);
      const total = add(subtotalValue, fees);

      const createdHold = await repos.inventory.createHold({
        id: holdId,
        orderId,
        eventId: event.id,
        unitIds: heldUnits.map((unit) => unit.id),
        expiresAt: addSeconds(this.clock.nowIso(), config.checkout.holdTtlSeconds),
        releasedAt: null,
      });

      const createdOrder = await repos.orders.create({
        id: orderId,
        reference: humanCode("BK-ORD"),
        userId: actor.userId,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone ?? null,
        eventId: event.id,
        items,
        subtotal: subtotalValue,
        fees,
        total,
        status: OrderStatus.CREATED,
        holdId,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: this.clock.nowIso(),
        paidAt: null,
      });

      return { order: createdOrder, hold: createdHold, subtotal: subtotalValue };
    });

    const decision = await this.deps.risk.assess(
      "CHECKOUT",
      { type: "ORDER", id: order.id },
      {
        requestedQuantity,
        value: order.total,
        knownDevice: Boolean(actor.deviceId),
        accountAgeDays: actor.userId ? undefined : 0,
      },
      actor,
    );

    if (decision.outcome === RiskOutcome.BLOCK) {
      await this.cancelOrder(actor, order.id, "Blocked by risk engine");
      throw new DomainError("RISK_BLOCKED", "This purchase could not be completed", {
        reasonCodes: decision.reasonCodes,
      });
    }

    await this.deps.audit.record(actor, {
      action: "checkout.started",
      resourceType: "Order",
      resourceId: order.id,
      after: { total: order.total.amount, items: order.items.length, risk: decision.outcome },
    });

    // Zero-value orders (free RSVP-style ticketing) skip the provider entirely
    // but still go through fulfilment so tickets and the ledger stay consistent.
    if (subtotal.amount === 0 && order.total.amount === 0) {
      await this.fulfilOrder(actor, order.id, { method: PaymentMethod.FREE });
      const fulfilled = await this.uow.repos.orders.findById(order.id);
      return {
        order: fulfilled ?? order,
        hold,
        paymentId: null,
        customerMessage: "Your tickets are confirmed.",
        riskOutcome: decision.outcome,
      };
    }

    const payment = await this.deps.initiatePayment({
      order,
      method: input.method ?? PaymentMethod.MPESA,
      phone: input.buyerPhone,
      email: input.buyerEmail,
    });

    await this.uow.repos.orders.update(order.id, { status: OrderStatus.AWAITING_PAYMENT });

    return {
      order: { ...order, status: OrderStatus.AWAITING_PAYMENT },
      hold,
      paymentId: payment.paymentId,
      customerMessage: payment.customerMessage,
      riskOutcome: decision.outcome,
    };
  }

  /**
   * Converts a held order into issued tickets and posts the sale to the ledger.
   * Only ever called after a payment is verified (or for a zero-value order).
   */
  async fulfilOrder(
    actor: ActorContext,
    orderId: string,
    options: { method: PaymentMethod; paymentId?: string },
  ): Promise<Ticket[]> {
    return this.uow.runInTransaction(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order) throw notFound("Order", orderId);

      // Fulfilment is idempotent: a webhook delivered twice must not issue two
      // sets of tickets.
      if (order.status === OrderStatus.FULFILLED) {
        return repos.tickets.listByOrder(orderId);
      }
      assertTransition(ORDER_TRANSITIONS, order.status, OrderStatus.PAID, "Order");

      const hold = order.holdId ? await repos.inventory.findHold(order.holdId) : null;
      if (!hold || hold.releasedAt) {
        throw new DomainError("HOLD_EXPIRED", "The reservation for this order has expired");
      }

      const event = await repos.events.findById(order.eventId);
      if (!event) throw notFound("Event", order.eventId);

      const buyer = order.userId ? await repos.users.findById(order.userId) : null;
      const ownerName = buyer?.fullName ?? order.buyerEmail;

      const unitsByType = new Map<string, InventoryUnit[]>();
      for (const unitId of hold.unitIds) {
        const unit = await repos.inventory.findUnit(unitId);
        if (!unit) continue;
        const bucket = unitsByType.get(unit.ticketTypeId) ?? [];
        bucket.push(unit);
        unitsByType.set(unit.ticketTypeId, bucket);
      }

      const issued: Ticket[] = [];
      const ticketIdByUnit: Record<string, TicketId> = {};

      for (const item of order.items) {
        const units = unitsByType.get(item.ticketTypeId) ?? [];
        for (let index = 0; index < item.quantity; index += 1) {
          const unit = units[index];
          const ticket = await repos.tickets.create({
            id: newId("tkt"),
            code: humanCode("BK-TCKT", 6),
            eventId: order.eventId,
            ticketTypeId: item.ticketTypeId,
            orderId: order.id,
            ownerUserId: order.userId ?? `guest:${order.buyerEmail}`,
            ownerName,
            seatLabel: unit?.seatLabel ?? null,
            status: TicketStatus.ACTIVE,
            facePrice: item.unitPrice,
            credentialVersion: 1,
            issuedAt: this.clock.nowIso(),
            checkedInAt: null,
            ownershipHistory: [
              {
                at: this.clock.nowIso(),
                fromUserId: null,
                toUserId: order.userId ?? `guest:${order.buyerEmail}`,
                reason: "ISSUE",
                reference: order.reference,
              },
            ],
          });
          issued.push(ticket);
          if (unit) ticketIdByUnit[unit.id] = ticket.id;
        }
      }

      await repos.inventory.markSold(hold.unitIds, ticketIdByUnit);

      const paidOrder = await repos.orders.update(order.id, {
        status: OrderStatus.FULFILLED,
        paidAt: this.clock.nowIso(),
      });

      // Double-entry: cash in, organizer's share owed to them, our fee booked
      // as revenue. Never "organizer balance += total".
      if (order.total.amount > 0) {
        await this.deps.ledger.post({
          reference: `sale:${order.id}`,
          kind: "TICKET_SALE",
          metadata: { orderId: order.id, eventId: order.eventId, method: options.method },
          entries: [
            {
              accountCode: ACCOUNT.CUSTOMER_FUNDS,
              side: "DEBIT",
              amount: order.total,
              memo: `Order ${order.reference}`,
            },
            {
              accountCode: ACCOUNT.organizerPayable(event.organizerId),
              side: "CREDIT",
              amount: order.subtotal,
              memo: `Ticket revenue for ${event.title}`,
              organizerId: event.organizerId,
            },
            {
              accountCode: ACCOUNT.PLATFORM_FEE_REVENUE,
              side: "CREDIT",
              amount: order.fees,
              memo: "Bookit service fee",
            },
          ],
        });
      }

      await this.deps.notifications.send({
        userId: order.userId,
        to: order.buyerEmail,
        channel: "EMAIL",
        template: "order.confirmed",
        payload: {
          orderReference: order.reference,
          eventTitle: event.title,
          ticketCount: String(issued.length),
        },
      });

      await this.deps.audit.record(actor, {
        action: "order.fulfilled",
        resourceType: "Order",
        resourceId: order.id,
        before: { status: order.status },
        after: { status: paidOrder.status, tickets: issued.length },
      });

      return issued;
    });
  }

  async cancelOrder(actor: ActorContext, orderId: string, reason: string): Promise<Order> {
    return this.uow.runInTransaction(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order) throw notFound("Order", orderId);
      assertTransition(ORDER_TRANSITIONS, order.status, OrderStatus.CANCELLED, "Order");
      if (order.holdId) await repos.inventory.releaseHold(order.holdId);
      const cancelled = await repos.orders.update(orderId, {
        status: OrderStatus.CANCELLED,
        holdId: null,
      });
      await this.deps.audit.record(actor, {
        action: "order.cancelled",
        resourceType: "Order",
        resourceId: orderId,
        before: { status: order.status },
        after: { status: cancelled.status },
        reason,
      });
      return cancelled;
    });
  }

  /**
   * Background job: releases inventory whose hold expired without payment.
   * Idempotent and safe to run concurrently with checkout.
   */
  async releaseExpiredHolds(): Promise<number> {
    return this.uow.runInTransaction(async (repos) => {
      const expired = await repos.inventory.listExpiredHolds(this.clock.nowIso());
      let released = 0;
      for (const hold of expired) {
        const order = await repos.orders.findById(hold.orderId);
        // A paid order's hold is converted, not released — guard against a race
        // between the expiry job and a late webhook.
        if (
          order &&
          (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED)
        ) {
          continue;
        }
        await repos.inventory.releaseHold(hold.id);
        if (order && order.status !== OrderStatus.CANCELLED) {
          await repos.orders.update(order.id, { status: OrderStatus.EXPIRED, holdId: null });
        }
        released += 1;
      }
      return released;
    });
  }

}

export function computeFees(subtotal: Money): { fees: Money; total: Money } {
  const fees = percentageOf(subtotal, config.checkout.serviceFeeBps);
  return { fees, total: add(subtotal, fees) };
}

export const ZERO_KES = zero("KES");
export { PaymentStatus };
