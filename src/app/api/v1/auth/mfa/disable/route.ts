import { z } from "zod";
import { DomainError, unauthenticated } from "@/domain/errors";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { verifyTotpCode } from "@/server/auth/totp";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const DisableSchema = z.object({ code: z.string().min(6).max(6) });

/**
 * POST /api/v1/auth/mfa/disable — turns two-factor off.
 *
 * Requires a current code, the same as turning it on — the one moment this
 * matters least is not the moment to skip proving you still hold the device.
 */
export const POST = handler(async (request: Request) => {
  const session = await getSessionUserFromRequest(request);
  if (!session) throw unauthenticated("Sign in to change two-factor authentication");
  if (!session.user.mfaEnabled) {
    throw new DomainError("INVALID_STATE", "Two-factor authentication is already off");
  }

  const { code } = await parseBody(request, DisableSchema);
  const prisma = getPrismaClient();
  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true },
  });

  if (!record?.mfaSecret || !verifyTotpCode(record.mfaSecret, code)) {
    throw new DomainError("CREDENTIAL_INVALID", "That code didn't match");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  return ok({ enabled: false });
});
