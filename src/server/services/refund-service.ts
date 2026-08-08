import { OrderStatus, PaymentMethod, PaymentStatus, TicketStatus } from "@/domain/enums";
import { DomainError, forbidden, notFound } from "@/domain/errors";
import { money, sum, type Money } from "@/domain/money";
import { assertTransition, ORDER_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, Order, Ticket } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import type { PaymentProvider } from "../payments/provider";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import { ACCOUNT, LedgerService } from "./ledger-service";
import type { NotificationService } from "./notification-service";
import type { TicketService } from "./ticket-service";

/**
 * Refunds.
 *
 * The failure mode this guards against is refunding a ticket that has already
 * moved on: refunding after a transfer or a resale would hand money back to
 * someone who no longer holds the ticket while the new owner keeps a valid
 * credential. Eligibility is therefore checked against live ticket state, and
 * the whole refund — validation, ticket invalidation, provider call, ledger,
 * notification, audit — happens atomically.
 */

export interface RefundEligibility {
  eligible: boolean;
  reason: string;
  refundableTickets: Ticket[];
  amount: Money;
}

export class RefundService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: {
      ledger: LedgerService;
      audit: AuditService;
      notifications: NotificationService;
      tickets: TicketService;
      providers: Map<PaymentMethod, PaymentProvider>;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  async assessEligibility(orderId: string): Promise<RefundEligibility> {
    const order = await this.uow.repos.orders.findById(orderId);
    if (!order) throw notFound("Order", orderId);

    const empty = { refundableTickets: [] as Ticket[], amount: money(0, order.total.currency) };

    if (order.status === OrderStatus.REFUNDED) {
      return { eligible: false, reason: "This order has already been refunded", ...empty };
    }
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLED) {
      return { eligible: false, reason: "This order has not been paid", ...empty };
    }

    const event = await this.uow.repos.events.findById(order.eventId);
    if (!event) throw notFound("Event", order.eventId);

    if (event.status !== "CANCELLED" && event.endsAt < this.clock.nowIso()) {
      return { eligible: false, reason: "This event has already taken place", ...empty };
    }

    const tickets = await this.uow.repos.tickets.listByOrder(order.id);

    // Only tickets still held by the original buyer and never used can be
    // refunded against this order.
    const refundable = tickets.filter(
      (ticket) =>
        ticket.status === TicketStatus.ACTIVE &&
        ticket.ownerUserId === order.userId &&
        ticket.checkedInAt === null,
    );

    const movedOn = tickets.filter(
      (ticket) =>
        ticket.status === TicketStatus.SOLD ||
        ticket.status === TicketStatus.TRANSFERRED ||
        ticket.ownerUserId !== order.userId,
    );

    if (refundable.length === 0) {
      return {
        eligible: false,
        reason:
          movedOn.length > 0
            ? "These tickets have been transferred or resold and can no longer be refunded to this order"
            : "No refundable tickets remain on this order",
        ...empty,
      };
    }

    const amount = sum(
      refundable.map((ticket) => ticket.facePrice),
      order.total.currency,
    );

    return {
      eligible: true,
      reason:
        refundable.length === tickets.length
          ? "Full refund available"
          : `${refundable.length} of ${tickets.length} tickets can be refunded`,
      refundableTickets: refundable,
      amount,
    };
  }

  async refundOrder(
    actor: ActorContext,
    input: { orderId: string; reason: string; ticketIds?: string[] },
  ): Promise<{ order: Order; amount: Money; voided: number }> {
    // Bulk refunds are a step-up action: they move real money at scale.
    if (!actor.mfaSatisfied && actor.organizerId) {
      throw new DomainError(
        "STEP_UP_REQUIRED",
        "Confirm your identity to process refunds",
      );
    }

    return this.uow.runInTransaction(async (repos) => {
      const eligibility = await this.assessEligibility(input.orderId);
      if (!eligibility.eligible) {
        throw new DomainError("INVALID_STATE", eligibility.reason);
      }

      const order = await repos.orders.findById(input.orderId);
      if (!order) throw notFound("Order", input.orderId);

      const targets = input.ticketIds
        ? eligibility.refundableTickets.filter((ticket) => input.ticketIds!.includes(ticket.id))
        : eligibility.refundableTickets;

      if (targets.length === 0) {
        throw new DomainError("INVALID_STATE", "None of the selected tickets can be refunded");
      }

      const amount = sum(
        targets.map((ticket) => ticket.facePrice),
        order.total.currency,
      );

      const event = await repos.events.findById(order.eventId);
      if (!event) throw notFound("Event", order.eventId);

      // Void first: an invalidated credential must not survive a provider
      // failure that rolls the rest back.
      for (const ticket of targets) {
        await repos.tickets.update(ticket.id, {
          status: TicketStatus.REFUNDED,
          credentialVersion: ticket.credentialVersion + 1,
        });
      }

      const payments = await repos.payments.listByOrder(order.id);
      const capturedPayment = payments.find(
        (payment) =>
          payment.status === PaymentStatus.CAPTURED || payment.status === PaymentStatus.SETTLED,
      );

      if (capturedPayment?.providerReference) {
        const provider = this.deps.providers.get(capturedPayment.method);
        if (provider) {
          await provider.refund({
            providerReference: capturedPayment.providerReference,
            amount,
            reason: input.reason,
          });
        }
        await repos.payments.update(capturedPayment.id, {
          status: PaymentStatus.REFUNDED,
          updatedAt: this.clock.nowIso(),
        });
      }

      const fullRefund = targets.length === eligibility.refundableTickets.length;
      const nextStatus = fullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED;
      assertTransition(ORDER_TRANSITIONS, order.status, nextStatus, "Order");
      const updatedOrder = await repos.orders.update(order.id, { status: nextStatus });

      // Reverse the sale: take it back off the organizer's payable, not off the
      // platform's fee revenue, and record the cash going out.
      await this.deps.ledger.post({
        reference: `refund:${order.id}:${targets.length}:${this.clock.nowIso()}`,
        kind: "REFUND",
        metadata: { orderId: order.id, reason: input.reason },
        entries: [
          {
            accountCode: ACCOUNT.organizerPayable(event.organizerId),
            side: "DEBIT",
            amount,
            memo: `Refund for order ${order.reference}`,
            organizerId: event.organizerId,
          },
          {
            accountCode: ACCOUNT.CUSTOMER_FUNDS,
            side: "CREDIT",
            amount,
            memo: "Refund paid to customer",
          },
        ],
      });

      await this.deps.notifications.send({
        userId: order.userId,
        to: order.buyerEmail,
        channel: "EMAIL",
        template: "refund.processed",
        payload: {
          orderReference: order.reference,
          amount: String(amount.amount),
          tickets: String(targets.length),
        },
      });

      await this.deps.audit.record(actor, {
        action: "order.refunded",
        resourceType: "Order",
        resourceId: order.id,
        before: { status: order.status },
        after: { status: nextStatus, amount: amount.amount, tickets: targets.length },
        reason: input.reason,
      });

      return { order: updatedOrder, amount, voided: targets.length };
    });
  }

  /** Cancels an event and refunds every outstanding order against it. */
  async refundCancelledEvent(
    actor: ActorContext,
    eventId: string,
    reason: string,
  ): Promise<{ orders: number; amount: Money }> {
    if (!actor.mfaSatisfied) {
      throw new DomainError("STEP_UP_REQUIRED", "Confirm your identity to cancel an event");
    }
    const event = await this.uow.repos.events.findById(eventId);
    if (!event) throw notFound("Event", eventId);
    if (actor.organizerId && actor.organizerId !== event.organizerId) {
      throw forbidden("This event belongs to another organizer");
    }

    await this.uow.repos.events.update(eventId, { status: "CANCELLED" });

    const orders = await this.uow.repos.orders.listByEvent(eventId);
    let refundedCount = 0;
    const amounts: Money[] = [];

    for (const order of orders) {
      const eligibility = await this.assessEligibility(order.id);
      if (!eligibility.eligible) continue;
      const result = await this.refundOrder(actor, { orderId: order.id, reason });
      refundedCount += 1;
      amounts.push(result.amount);
    }

    return { orders: refundedCount, amount: sum(amounts, event ? "KES" : "KES") };
  }
}
