import { describe, expect, it } from "vitest";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@/domain/enums";
import { ipInAllowlist, maskMsisdn, toMsisdn } from "@/server/payments/mpesa-provider";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

/**
 * Money arrives over a webhook we do not control. These tests pin the rules
 * that keep that safe: process once, verify the amount, and never silently
 * accept a transaction we cannot attribute.
 */

/** Builds a Daraja STK callback body. */
function stkCallback(options: {
  checkoutRequestId: string;
  resultCode?: number;
  amountMajor?: number;
  receipt?: string;
}) {
  const succeeded = (options.resultCode ?? 0) === 0;
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: options.checkoutRequestId,
        ResultCode: options.resultCode ?? 0,
        ResultDesc: succeeded ? "The service request is processed successfully." : "Cancelled",
        ...(succeeded
          ? {
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: options.amountMajor ?? 1060 },
                  { Name: "MpesaReceiptNumber", Value: options.receipt ?? "SDK1A2B3C" },
                  { Name: "TransactionDate", Value: "20260808193045" },
                  { Name: "PhoneNumber", Value: 254700000001 },
                ],
              },
            }
          : {}),
      },
    },
  };
}

async function checkoutFixture() {
  const container = freshContainer();
  const { event, ticketType } = await seedTicketedEvent(container, {
    quantity: 5,
    priceMajor: 1000,
  });

  const result = await container.checkout.startCheckout(actor(), {
    eventId: event.id,
    lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    buyerEmail: "buyer@example.co.ke",
    buyerPhone: "+254700000001",
    method: PaymentMethod.MPESA,
  });

  const payment = await container.uow.repos.payments.findById(result.paymentId!);
  return { container, result, payment: payment!, ticketType };
}

describe("M-Pesa webhook handling", () => {
  it("captures the payment and issues tickets exactly once", async () => {
    const { container, result, payment } = await checkoutFixture();

    const outcome = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({
        checkoutRequestId: payment.providerRequestId!,
        // KES 1,000 + 6% service fee.
        amountMajor: 1060,
      }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(outcome.reason).toBe("PROCESSED");

    const order = await container.uow.repos.orders.findById(result.order.id);
    expect(order?.status).toBe(OrderStatus.FULFILLED);
    expect(await container.uow.repos.tickets.listByOrder(result.order.id)).toHaveLength(1);
  });

  it("ignores a replayed callback instead of issuing a second ticket", async () => {
    const { container, result, payment } = await checkoutFixture();
    const body = stkCallback({ checkoutRequestId: payment.providerRequestId!, amountMajor: 1060 });

    await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body,
      headers: {},
      sourceIp: "196.201.214.10",
    });
    const replay = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body,
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(replay.reason).toBe("DUPLICATE");
    expect(await container.uow.repos.tickets.listByOrder(result.order.id)).toHaveLength(1);
  });

  it("refuses to fulfil when the amount does not match the order", async () => {
    const { container, result, payment } = await checkoutFixture();

    const outcome = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({
        checkoutRequestId: payment.providerRequestId!,
        // Underpaid.
        amountMajor: 500,
      }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(outcome.reason).toBe("AMOUNT_MISMATCH");

    const order = await container.uow.repos.orders.findById(result.order.id);
    expect(order?.status).not.toBe(OrderStatus.FULFILLED);
    expect(await container.uow.repos.tickets.listByOrder(result.order.id)).toHaveLength(0);
  });

  it("quarantines a callback it cannot attribute to a payment", async () => {
    const { container } = await checkoutFixture();

    const outcome = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({ checkoutRequestId: "ws_CO_unknown_transaction" }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(outcome.reason).toBe("UNKNOWN_TRANSACTION");
    const quarantined = await container.uow.repos.webhooks.listQuarantined();
    expect(quarantined.length).toBeGreaterThan(0);
  });

  it("releases the held seats when the customer cancels the STK prompt", async () => {
    const { container, result, payment, ticketType } = await checkoutFixture();

    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(4);

    const outcome = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({ checkoutRequestId: payment.providerRequestId!, resultCode: 1032 }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(outcome.reason).toBe("FAILED_PAYMENT");
    expect(await container.uow.repos.inventory.countAvailable(ticketType.id)).toBe(5);

    const order = await container.uow.repos.orders.findById(result.order.id);
    expect(order?.status).toBe(OrderStatus.CANCELLED);
  });

  it("will not re-capture a payment that is already terminal", async () => {
    const { container, payment } = await checkoutFixture();

    await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({ checkoutRequestId: payment.providerRequestId!, amountMajor: 1060 }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    // A different result code produces a different dedupe key, so this is a new
    // event — but the payment is already captured and must not move again.
    const outcome = await container.payments.handleWebhook(PaymentMethod.MPESA, {
      body: stkCallback({
        checkoutRequestId: payment.providerRequestId!,
        resultCode: 0,
        receipt: "SDKDIFFERENT",
        amountMajor: 9999,
      }),
      headers: {},
      sourceIp: "196.201.214.10",
    });

    expect(outcome.reason).toBe("DUPLICATE");

    const after = await container.uow.repos.payments.findById(payment.id);
    expect(after?.status).toBe(PaymentStatus.CAPTURED);
  });
});

describe("M-Pesa helpers", () => {
  it("normalises Kenyan phone numbers to MSISDN", () => {
    expect(toMsisdn("0712345678")).toBe("254712345678");
    expect(toMsisdn("+254712345678")).toBe("254712345678");
    expect(toMsisdn("254712345678")).toBe("254712345678");
    expect(toMsisdn("712345678")).toBe("254712345678");
  });

  it("masks phone numbers before they are persisted", () => {
    expect(maskMsisdn("254712345678")).toBe("2547****5678");
    expect(maskMsisdn("123")).toBe("[redacted]");
  });

  it("matches Safaricom source IPs against the allowlist", () => {
    expect(ipInAllowlist("196.201.214.10", ["196.201.214.0/24"])).toBe(true);
    expect(ipInAllowlist("196.201.215.10", ["196.201.214.0/24"])).toBe(false);
    expect(ipInAllowlist(null, ["196.201.214.0/24"])).toBe(false);
    expect(ipInAllowlist("not-an-ip", ["196.201.214.0/24"])).toBe(false);
  });
});
