import { z } from "zod";
import { PaymentMethod } from "@/domain/enums";
import { getContainer } from "@/server/container";
import { actorFor, created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  eventId: z.string().min(1),
  lines: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Select at least one ticket"),
  buyerEmail: z.email("Enter a valid email address"),
  buyerPhone: z
    .string()
    .regex(/^(\+?254|0)\d{9}$/, "Enter a Kenyan phone number, e.g. 0712 345 678")
    .optional(),
  method: z.enum(PaymentMethod).optional(),
});

/**
 * POST /api/v1/orders — starts checkout.
 *
 * Callers should send an `Idempotency-Key` header: a retried request with the
 * same key returns the original order instead of holding a second batch of
 * seats or charging twice.
 */
export const POST = handler(async (request: Request) => {
  const body = await parseBody(request, CheckoutSchema);
  const { checkout } = getContainer();

  const result = await checkout.startCheckout(actorFor(request), {
    ...body,
    idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
  });

  return created({
    order: {
      id: result.order.id,
      reference: result.order.reference,
      status: result.order.status,
      subtotal: result.order.subtotal,
      fees: result.order.fees,
      total: result.order.total,
    },
    hold: { id: result.hold.id, expiresAt: result.hold.expiresAt },
    paymentId: result.paymentId,
    customerMessage: result.customerMessage,
  });
});
