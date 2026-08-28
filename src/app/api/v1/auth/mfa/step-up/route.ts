import { z } from "zod";
import { DomainError, unauthenticated } from "@/domain/errors";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { satisfySessionMfa } from "@/server/auth/session";
import { verifyTotpCode } from "@/server/auth/totp";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const StepUpSchema = z.object({ code: z.string().min(6).max(6) });

/**
 * POST /api/v1/auth/mfa/step-up — re-confirms identity mid-session.
 *
 * This is what the payout, cancellation and destination-change flows are
 * actually waiting on: they all check `actor.mfaSatisfied`, which comes
 * straight from `Session.mfaSatisfiedAt`. A correct code here sets it, and
 * the very next request carries `mfaSatisfied: true`.
 */
export const POST = handler(async (request: Request) => {
  const session = await getSessionUserFromRequest(request);
  if (!session) throw unauthenticated("Sign in to confirm your identity");
  if (!session.user.mfaEnabled) {
    throw new DomainError("INVALID_STATE", "Turn on two-factor authentication first");
  }

  const { code } = await parseBody(request, StepUpSchema);
  const record = await getPrismaClient().user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true },
  });

  if (!record?.mfaSecret || !verifyTotpCode(record.mfaSecret, code)) {
    throw new DomainError("CREDENTIAL_INVALID", "That code didn't match");
  }

  if (session.actor.sessionId) await satisfySessionMfa(session.actor.sessionId);
  return ok({ mfaSatisfied: true });
});
