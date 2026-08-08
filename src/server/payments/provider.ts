import type { Money } from "@/domain/money";
import type { PaymentMethod, PaymentStatus } from "@/domain/enums";

/**
 * Payment provider abstraction.
 *
 * Every provider (M-Pesa today, a card PSP alongside it, Airtel Money later)
 * implements this interface. Two rules hold for all of them:
 *
 *  1. The frontend never marks a payment successful. Only `verifyWebhook` — or
 *     a server-initiated `getTransaction` reconciliation — can move a payment
 *     to CAPTURED.
 *  2. Webhook verification returns the *provider's* view of amount and
 *     reference; the caller compares it against the expected amount and
 *     rejects mismatches.
 */

export interface InitiatePaymentInput {
  paymentId: string;
  orderReference: string;
  amount: Money;
  /** MSISDN in +2547XXXXXXXX form for mobile money. */
  phone?: string;
  email?: string;
  description: string;
  callbackUrl: string;
}

export interface InitiatePaymentResult {
  /** Provider-side id for this request, stored on the payment record. */
  providerRequestId: string;
  status: PaymentStatus;
  /** For card flows: where to send the customer. */
  redirectUrl?: string;
  /** Human-readable instruction, e.g. "Enter your M-PESA PIN on your phone". */
  customerMessage: string;
}

export interface VerifiedWebhook {
  /** Stable key for deduplication — the same callback replayed maps to it. */
  dedupeKey: string;
  providerRequestId: string | null;
  providerReference: string | null;
  status: PaymentStatus;
  amount: Money | null;
  phone: string | null;
  providerTimestamp: string | null;
  failureReason: string | null;
  /** Payload with secrets and PII redacted, safe to persist and log. */
  redactedPayload: Record<string, unknown>;
}

export interface ProviderTransaction {
  providerReference: string;
  status: PaymentStatus;
  amount: Money;
  completedAt: string | null;
}

export interface RefundResult {
  providerReference: string;
  status: PaymentStatus;
}

export interface WebhookRequest {
  body: unknown;
  headers: Record<string, string | undefined>;
  sourceIp: string | null;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly name: string;

  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;

  /**
   * Authenticates and parses an inbound callback. Throws when the callback
   * cannot be authenticated — an unauthenticated callback is never trusted,
   * even to mark a payment failed.
   */
  verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook>;

  getTransaction(providerRequestId: string): Promise<ProviderTransaction | null>;

  refund(input: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<RefundResult>;
}
