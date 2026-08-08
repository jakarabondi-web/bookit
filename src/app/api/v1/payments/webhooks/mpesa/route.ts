import { NextResponse } from "next/server";
import { PaymentMethod } from "@/domain/enums";
import { isDomainError } from "@/domain/errors";
import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/webhooks/mpesa — Safaricom Daraja STK callback.
 *
 * Daraja expects a 200 with an acknowledgement body and will retry aggressively
 * on anything else. So this endpoint returns 200 for every callback it has
 * genuinely dealt with — including duplicates and quarantined transactions —
 * and reserves a non-200 for callbacks it could not authenticate, which is the
 * one case where a retry is the right outcome.
 */
export async function POST(request: Request) {
  const { payments } = getContainer();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Malformed callback body" },
      { status: 400 },
    );
  }

  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    const outcome = await payments.handleWebhook(PaymentMethod.MPESA, {
      body,
      headers,
      sourceIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: outcome.reason }, { status: 200 });
  } catch (error) {
    if (isDomainError(error) && error.code === "FORBIDDEN") {
      // Not from Safaricom — refuse it outright and do not record it.
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 403 });
    }
    console.error("[bookit] mpesa webhook failed", error);
    // A 500 asks Safaricom to retry, which is what we want when our own
    // processing failed rather than the callback being bad.
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Retry" }, { status: 500 });
  }
}
