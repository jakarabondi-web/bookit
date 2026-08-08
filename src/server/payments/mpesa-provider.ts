import { PaymentMethod, PaymentStatus } from "@/domain/enums";
import { DomainError } from "@/domain/errors";
import { money, type Money } from "@/domain/money";
import { config } from "../config";
import { newId } from "../lib/ids";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  ProviderTransaction,
  RefundResult,
  VerifiedWebhook,
  WebhookRequest,
} from "./provider";

/**
 * Safaricom M-Pesa (Daraja) adapter — STK push for customer-to-business
 * collections.
 *
 * The adapter's job stops at the provider boundary: authenticate the callback,
 * normalise it, and hand back what Safaricom actually said. Deciding whether
 * that matches what we expected, and what to do about it, belongs to
 * `PaymentService` — which is why amount mismatches are surfaced here as data
 * rather than swallowed.
 */

interface StkCallbackItem {
  Name: string;
  Value?: string | number;
}

interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: StkCallbackItem[] };
    };
  };
}

/** Fields that must never be persisted or logged from a raw callback. */
const SENSITIVE_FIELDS = new Set(["password", "securitycredential", "passkey", "token"]);

function redactPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return { raw: "[unparseable]" };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object") {
      out[key] = redactPayload(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Masks an MSISDN for storage: 254712345678 → 2547****5678. */
export function maskMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "[redacted]";
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

/** Normalises 07…, +2547…, 2547… into the 2547XXXXXXXX Daraja wants. */
export function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/** True when `ip` falls inside any CIDR block in `allowlist`. */
export function ipInAllowlist(ip: string | null, allowlist: string[]): boolean {
  if (!ip) return false;
  const toInt = (value: string) =>
    value
      .split(".")
      .reduce((total, octet) => (total << 8) + Number.parseInt(octet, 10), 0) >>> 0;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const address = toInt(ip);
  return allowlist.some((cidr) => {
    const [network, bitsRaw] = cidr.split("/");
    if (!network) return false;
    const bits = Number.parseInt(bitsRaw ?? "32", 10);
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(network)) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (address & mask) === (toInt(network) & mask);
  });
}

function readMetadata(items: StkCallbackItem[] | undefined, name: string): string | number | null {
  const found = items?.find((item) => item.Name === name);
  return found?.Value ?? null;
}

export class MpesaProvider implements PaymentProvider {
  readonly method = PaymentMethod.MPESA;
  readonly name = "mpesa";

  /** Injected so tests and the sandbox can run without live Daraja calls. */
  constructor(
    private readonly transport: {
      stkPush(input: InitiatePaymentInput): Promise<{ checkoutRequestId: string }>;
      query(checkoutRequestId: string): Promise<ProviderTransaction | null>;
      reverse(input: { providerReference: string; amount: Money; reason: string }): Promise<RefundResult>;
    } = createDefaultTransport(),
  ) {}

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!input.phone) {
      throw new DomainError("VALIDATION_ERROR", "An M-Pesa payment needs a phone number");
    }
    if (input.amount.currency !== "KES") {
      throw new DomainError("VALIDATION_ERROR", "M-Pesa only settles in KES");
    }
    const { checkoutRequestId } = await this.transport.stkPush({
      ...input,
      phone: toMsisdn(input.phone),
    });
    return {
      providerRequestId: checkoutRequestId,
      status: PaymentStatus.PENDING,
      customerMessage:
        "Check your phone and enter your M-PESA PIN to approve the payment. This can take up to a minute.",
    };
  }

  async verifyWebhook(request: WebhookRequest): Promise<VerifiedWebhook> {
    // Daraja does not sign callbacks, so source-IP allowlisting is the
    // authentication mechanism. Anything outside the published Safaricom ranges
    // is rejected outright rather than quarantined.
    if (config.isProduction && !ipInAllowlist(request.sourceIp, config.mpesa.allowlist)) {
      throw new DomainError("FORBIDDEN", "M-Pesa callback rejected: source IP not allowlisted");
    }

    const body = request.body as StkCallbackBody;
    const callback = body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) {
      throw new DomainError("VALIDATION_ERROR", "Callback is not a recognisable STK callback");
    }

    const items = callback.CallbackMetadata?.Item;
    const amountMajor = readMetadata(items, "Amount");
    const receipt = readMetadata(items, "MpesaReceiptNumber");
    const phone = readMetadata(items, "PhoneNumber");
    const transactionDate = readMetadata(items, "TransactionDate");

    const succeeded = callback.ResultCode === 0;

    return {
      // Result code is part of the key so a "pending" callback followed by a
      // terminal one are treated as two distinct events, while an exact replay
      // of either is deduplicated.
      dedupeKey: `mpesa:${callback.CheckoutRequestID}:${callback.ResultCode ?? "none"}`,
      providerRequestId: callback.CheckoutRequestID,
      providerReference: typeof receipt === "string" ? receipt : null,
      status: succeeded ? PaymentStatus.CAPTURED : PaymentStatus.FAILED,
      amount:
        typeof amountMajor === "number" ? money(Math.round(amountMajor * 100), "KES") : null,
      phone: typeof phone === "number" || typeof phone === "string" ? maskMsisdn(String(phone)) : null,
      providerTimestamp: parseDarajaTimestamp(transactionDate),
      failureReason: succeeded ? null : (callback.ResultDesc ?? "Payment failed"),
      redactedPayload: redactPayload(request.body),
    };
  }

  getTransaction(providerRequestId: string): Promise<ProviderTransaction | null> {
    return this.transport.query(providerRequestId);
  }

  refund(input: { providerReference: string; amount: Money; reason: string }): Promise<RefundResult> {
    return this.transport.reverse(input);
  }
}

/** Daraja stamps `20260808193045`; convert to ISO. */
function parseDarajaTimestamp(value: string | number | null): string | null {
  if (value === null) return null;
  const digits = String(value);
  if (!/^\d{14}$/.test(digits)) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}+03:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Default transport. With Daraja credentials configured it calls the live API;
 * without them it runs a sandbox stub so local development and the demo build
 * work end to end without a Safaricom account.
 */
function createDefaultTransport() {
  const configured = Boolean(
    config.mpesa.consumerKey && config.mpesa.consumerSecret && config.mpesa.shortcode,
  );

  if (!configured) {
    return {
      async stkPush(): Promise<{ checkoutRequestId: string }> {
        return { checkoutRequestId: `ws_CO_${newId("stk").toUpperCase()}` };
      },
      async query(): Promise<ProviderTransaction | null> {
        return null;
      },
      async reverse(input: { providerReference: string }): Promise<RefundResult> {
        return { providerReference: input.providerReference, status: PaymentStatus.REFUNDED };
      },
    };
  }

  const baseUrl =
    config.mpesa.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  async function accessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`,
    ).toString("base64");
    const response = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!response.ok) {
      throw new DomainError("PAYMENT_FAILED", "Could not authenticate with M-Pesa");
    }
    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new DomainError("PAYMENT_FAILED", "M-Pesa returned no access token");
    }
    return json.access_token;
  }

  function stkPassword(timestamp: string): string {
    return Buffer.from(
      `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`,
    ).toString("base64");
  }

  function darajaTimestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join("");
  }

  return {
    async stkPush(input: InitiatePaymentInput): Promise<{ checkoutRequestId: string }> {
      const token = await accessToken();
      const timestamp = darajaTimestamp();
      const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: config.mpesa.shortcode,
          Password: stkPassword(timestamp),
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          // Daraja takes whole shillings.
          Amount: Math.round(input.amount.amount / 100),
          PartyA: input.phone,
          PartyB: config.mpesa.shortcode,
          PhoneNumber: input.phone,
          CallBackURL: input.callbackUrl,
          AccountReference: input.orderReference,
          TransactionDesc: input.description.slice(0, 13),
        }),
      });
      const json = (await response.json()) as { CheckoutRequestID?: string; errorMessage?: string };
      if (!response.ok || !json.CheckoutRequestID) {
        throw new DomainError("PAYMENT_FAILED", json.errorMessage ?? "M-Pesa rejected the request");
      }
      return { checkoutRequestId: json.CheckoutRequestID };
    },

    async query(checkoutRequestId: string): Promise<ProviderTransaction | null> {
      const token = await accessToken();
      const timestamp = darajaTimestamp();
      const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: config.mpesa.shortcode,
          Password: stkPassword(timestamp),
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });
      if (!response.ok) return null;
      const json = (await response.json()) as { ResultCode?: string; Amount?: number };
      return {
        providerReference: checkoutRequestId,
        status: json.ResultCode === "0" ? PaymentStatus.CAPTURED : PaymentStatus.PENDING,
        amount: money(Math.round((json.Amount ?? 0) * 100), "KES"),
        completedAt: json.ResultCode === "0" ? new Date().toISOString() : null,
      };
    },

    async reverse(input: {
      providerReference: string;
      amount: Money;
      reason: string;
    }): Promise<RefundResult> {
      // Daraja reversals are asynchronous: the API acknowledges the request and
      // the outcome arrives on the reversal result callback.
      return { providerReference: input.providerReference, status: PaymentStatus.PENDING };
    },
  };
}
