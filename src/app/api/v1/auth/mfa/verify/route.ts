import { z } from "zod";
import { DomainError, unauthenticated } from "@/domain/errors";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { satisfySessionMfa } from "@/server/auth/session";
import { verifyTotpCode } from "@/server/auth/totp";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const VerifySchema = z.object({ code: z.string().min(6).max(6) });

/**
 * POST /api/v1/auth/mfa/verify — completes two-factor setup.
 *
 * Proving one correct code turns `/enroll`'s pending secret into an active
 * one, and immediately satisfies step-up for the session that just set it up
 * — there is no reason to make someone re-enter the code they just typed.
 */
export const POST = handler(async (request: Request) => {
  const session = await getSessionUserFromRequest(request);
  if (!session) throw unauthenticated("Sign in to turn on two-factor authentication");

  const { code } = await parseBody(request, VerifySchema);
  const prisma = getPrismaClient();
  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true },
  });

  if (!record?.mfaSecret) {
    throw new DomainError("INVALID_STATE", "Start two-factor setup before verifying a code");
  }
  if (!verifyTotpCode(record.mfaSecret, code)) {
    throw new DomainError(
      "CREDENTIAL_INVALID",
      "That code didn't match — check the time on your device and try again",
    );
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { mfaEnabled: true } });
  if (session.actor.sessionId) await satisfySessionMfa(session.actor.sessionId);

  return ok({ enabled: true });
});
