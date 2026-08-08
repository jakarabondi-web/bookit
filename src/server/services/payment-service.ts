import { OrderStatus, PaymentMethod, PaymentStatus } from "@/domain/enums";
import { DomainError, notFound } from "@/domain/errors";
import type { Money } from "@/domain/money";
import { assertTransition, PAYMENT_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, Order, Payment } from "@/domain/types";
import { config } from "../config";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { PaymentProvider, WebhookRequest } from "../payments/provider";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";

/**
 * Payment orchestration.
 *
 * The frontend can start a payment; only a verified provider callback (or a
 * server-side reconciliation query) can complete one. Every webhook goes
 * through the same gauntlet before it is allowed to touch an order:
 *
 *   authenticate → deduplicate → match to a known payment → verify the amount
 *   → transition once → fulfil once
 *
 * Anything that fails "match to a known payment" is quarantined rather than
 * dropped, so unexpected money is investigated instead of lost.
 */

export interface WebhookOutcome {
  handled: boolean;
  reason:
    | "PROCESSED"
    | "DUPLICATE"
    | "UNKNOWN_TRANSACTION"
    | "AMOUNT_MISMATCH"
    | "ALREADY_TERMINAL"
    | "FAILED_PAYMENT";
  paymentId?: string;
  orderId?: string;
}

export class PaymentService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly providers: Map<PaymentMethod, PaymentProvider>,
    private readonly deps: {
      audit: AuditService;
      /** Called exactly once when a payment is verified as captured. */
      onPaymentCaptured: (actor: ActorContext, order: Order, payment: Payment) => Promise<void>;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  private provider(method: PaymentMethod): PaymentProvider {
    const provider = this.providers.get(method);
    if (!provider) {
      throw new DomainError("VALIDATION_ERROR", `Payment method ${method} is not available`);
    }
    return provider;
  }

  async initiateForOrder(input: {
    order: Order;
    method: PaymentMethod;
    phone?: string;
    email: string;
  }): Promise<{ paymentId: string; customerMessage: string }> {
    const provider = this.provider(input.method);
    const paymentId = newId("pay");

    const payment = await this.uow.repos.payments.create({
      id: paymentId,
      orderId: input.order.id,
      bookingId: null,
      method: input.method,
      status: PaymentStatus.CREATED,
      expectedAmount: input.order.total,
      receivedAmount: null,
      providerRequestId: null,
      providerReference: null,
      providerTimestamp: null,
      phone: input.phone ?? null,
      failureReason: null,
      createdAt: this.clock.nowIso(),
      updatedAt: this.clock.nowIso(),
    });

    try {
      const result = await provider.initiatePayment({
        paymentId: payment.id,
        orderReference: input.order.reference,
        amount: input.order.total,
        phone: input.phone,
        email: input.email,
        description: `Bookit ${input.order.reference}`,
        callbackUrl:
          config.mpesa.callbackUrl ?? `${config.appUrl}/api/v1/payments/webhooks/mpesa`,
      });

      await this.uow.repos.payments.update(payment.id, {
        status: result.status,
        providerRequestId: result.providerRequestId,
        updatedAt: this.clock.nowIso(),
      });

      return { paymentId: payment.id, customerMessage: result.customerMessage };
    } catch (error) {
      await this.uow.repos.payments.update(payment.id, {
        status: PaymentStatus.FAILED,
        failureReason: error instanceof Error ? error.message : "Payment could not be started",
        updatedAt: this.clock.nowIso(),
      });
      throw error;
    }
  }

  /**
   * Handles an inbound provider callback. Returns an outcome rather than
   * throwing for expected-but-unactionable cases, because a provider that gets
   * a non-2xx will keep retrying a callback we have deliberately ignored.
   */
  async handleWebhook(method: PaymentMethod, request: WebhookRequest): Promise<WebhookOutcome> {
    const provider = this.provider(method);

    // Authentication happens first and throws on failure — an unauthenticated
    // callback is not recorded at all.
    const verified = await provider.verifyWebhook(request);

    const isNew = await this.uow.repos.webhooks.recordIfNew({
      id: newId("whk"),
      provider: provider.name,
      dedupeKey: verified.dedupeKey,
      payload: verified.redactedPayload,
      signatureOk: true,
      quarantined: false,
      receivedAt: this.clock.nowIso(),
    });
    if (!isNew) {
      return { handled: true, reason: "DUPLICATE" };
    }

    const systemActor: ActorContext = {
      userId: null,
      roles: [],
      organizerId: null,
      ip: request.sourceIp,
      sessionId: null,
      mfaSatisfied: false,
      deviceId: null,
    };

    return this.uow.runInTransaction(async (repos) => {
      const payment = verified.providerRequestId
        ? await repos.payments.findByProviderRequestId(verified.providerRequestId)
        : null;

      if (!payment) {
        // Money we cannot attribute. Quarantine it, alert, and let a human
        // decide — never silently accept and never silently discard.
        await repos.webhooks.recordIfNew({
          id: newId("whk"),
          provider: provider.name,
          dedupeKey: `${verified.dedupeKey}:quarantine`,
          payload: verified.redactedPayload,
          signatureOk: true,
          quarantined: true,
          receivedAt: this.clock.nowIso(),
        });
        await this.deps.audit.record(systemActor, {
          action: "payment.webhook.quarantined",
          resourceType: "PaymentWebhook",
          resourceId: verified.dedupeKey,
          after: { providerRequestId: verified.providerRequestId },
          reason: "No matching payment for provider request id",
        });
        return { handled: true, reason: "UNKNOWN_TRANSACTION" };
      }

      // Terminal payments are immutable. A late duplicate cannot re-capture.
      if (
        payment.status === PaymentStatus.CAPTURED ||
        payment.status === PaymentStatus.SETTLED ||
        payment.status === PaymentStatus.REFUNDED
      ) {
        await repos.webhooks.markProcessed(verified.dedupeKey, this.clock.nowIso());
        return { handled: true, reason: "ALREADY_TERMINAL", paymentId: payment.id };
      }

      if (verified.status === PaymentStatus.FAILED) {
        assertTransition(PAYMENT_TRANSITIONS, payment.status, PaymentStatus.FAILED, "Payment");
        await repos.payments.update(payment.id, {
          status: PaymentStatus.FAILED,
          failureReason: verified.failureReason,
          providerReference: verified.providerReference,
          providerTimestamp: verified.providerTimestamp,
          updatedAt: this.clock.nowIso(),
        });
        // Release the seats immediately rather than waiting for hold expiry.
        if (payment.orderId) {
          const order = await repos.orders.findById(payment.orderId);
          if (order?.holdId) await repos.inventory.releaseHold(order.holdId);
          if (order && order.status !== OrderStatus.CANCELLED) {
            await repos.orders.update(order.id, {
              status: OrderStatus.CANCELLED,
              holdId: null,
            });
          }
        }
        await repos.webhooks.markProcessed(verified.dedupeKey, this.clock.nowIso());
        return { handled: true, reason: "FAILED_PAYMENT", paymentId: payment.id };
      }

      // Amount verification. Paying less than the order total never fulfils it.
      if (!verified.amount || verified.amount.amount !== payment.expectedAmount.amount) {
        await this.deps.audit.record(systemActor, {
          action: "payment.amount_mismatch",
          resourceType: "Payment",
          resourceId: payment.id,
          before: { expected: payment.expectedAmount.amount },
          after: { received: verified.amount?.amount ?? null },
          reason: "Provider reported an amount that does not match the order total",
        });
        await repos.payments.update(payment.id, {
          receivedAmount: verified.amount,
          providerReference: verified.providerReference,
          failureReason: "Amount mismatch — held for review",
          updatedAt: this.clock.nowIso(),
        });
        await repos.webhooks.markProcessed(verified.dedupeKey, this.clock.nowIso());
        return { handled: true, reason: "AMOUNT_MISMATCH", paymentId: payment.id };
      }

      assertTransition(PAYMENT_TRANSITIONS, payment.status, PaymentStatus.CAPTURED, "Payment");
      const captured = await repos.payments.update(payment.id, {
        status: PaymentStatus.CAPTURED,
        receivedAmount: verified.amount,
        providerReference: verified.providerReference,
        providerTimestamp: verified.providerTimestamp,
        updatedAt: this.clock.nowIso(),
      });

      if (!payment.orderId) {
        await repos.webhooks.markProcessed(verified.dedupeKey, this.clock.nowIso());
        return { handled: true, reason: "PROCESSED", paymentId: captured.id };
      }

      const order = await repos.orders.findById(payment.orderId);
      if (!order) throw notFound("Order", payment.orderId);

      await this.deps.onPaymentCaptured(systemActor, order, captured);
      await repos.webhooks.markProcessed(verified.dedupeKey, this.clock.nowIso());

      return {
        handled: true,
        reason: "PROCESSED",
        paymentId: captured.id,
        orderId: order.id,
      };
    });
  }

  /**
   * Scheduled reconciliation: asks the provider about payments that are still
   * pending past a grace period. Catches callbacks that never arrived.
   */
  async reconcilePending(olderThanSeconds = 300): Promise<number> {
    const cutoff = new Date(this.clock.now().getTime() - olderThanSeconds * 1000).toISOString();
    const pending = await this.uow.repos.payments.listPendingOlderThan(cutoff);
    let reconciled = 0;

    for (const payment of pending) {
      const provider = this.providers.get(payment.method);
      if (!provider || !payment.providerRequestId) continue;
      const transaction = await provider.getTransaction(payment.providerRequestId);
      if (!transaction || transaction.status !== PaymentStatus.CAPTURED) continue;
      // Reconciliation applies the same amount check the webhook path does.
      if (transaction.amount.amount !== payment.expectedAmount.amount) continue;
      await this.uow.repos.payments.update(payment.id, {
        status: PaymentStatus.CAPTURED,
        receivedAmount: transaction.amount,
        providerReference: transaction.providerReference,
        providerTimestamp: transaction.completedAt,
        updatedAt: this.clock.nowIso(),
      });
      reconciled += 1;
    }
    return reconciled;
  }

  /** Marks a captured payment as settled once it appears on a PSP report. */
  async markSettled(paymentId: string): Promise<Payment> {
    const payment = await this.uow.repos.payments.findById(paymentId);
    if (!payment) throw notFound("Payment", paymentId);
    assertTransition(PAYMENT_TRANSITIONS, payment.status, PaymentStatus.SETTLED, "Payment");
    return this.uow.repos.payments.update(paymentId, {
      status: PaymentStatus.SETTLED,
      updatedAt: this.clock.nowIso(),
    });
  }
}

export type { Money };
