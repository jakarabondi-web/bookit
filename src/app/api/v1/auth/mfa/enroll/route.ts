import { DomainError, unauthenticated } from "@/domain/errors";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { formatSecretForDisplay, generateTotpSecret, totpAuthUrl } from "@/server/auth/totp";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { created, handler } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/mfa/enroll — starts two-factor setup.
 *
 * Generates a new secret and stores it, but `mfaEnabled` stays false until
 * `/verify` proves the account actually holds a working authenticator —
 * otherwise a dropped enrollment call would leave a secret nobody can use.
 */
export const POST = handler(async (request: Request) => {
  const session = await getSessionUserFromRequest(request);
  if (!session) throw unauthenticated("Sign in to turn on two-factor authentication");
  if (session.user.mfaEnabled) {
    throw new DomainError("CONFLICT", "Two-factor authentication is already on");
  }

  const secret = generateTotpSecret();
  await getPrismaClient().user.update({
    where: { id: session.user.id },
    data: { mfaSecret: secret },
  });

  return created({
    secret,
    manualEntry: formatSecretForDisplay(secret),
    otpauthUrl: totpAuthUrl(secret, session.user.email),
  });
});
