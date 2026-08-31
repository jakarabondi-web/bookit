import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { config } from "@/server/config";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const INVALID_CREDENTIALS = "That email or password isn't right";

// A fixed hash that never matches any real password. Verifying against this
// when the account doesn't exist (or has no password set) makes the unknown
// path pay the same scrypt cost as the known-account path, so response time
// can't be used to tell the two apart — see the comment below on `valid`.
const DUMMY_PASSWORD_HASH =
  "scrypt:626f6f6b69742d66697865642d64756d:c403b3c9d1a8959e3b4b285efb7e4279a1e2ce8da834e3ff0690bfb6c4775ef15887c79956baea431db81db4a35bf1570f803e03ee4db5d14a52d25618f2f407";

/** POST /api/v1/auth/login — verify a password and start a session. */
export const POST = handler(async (request: Request) => {
  if (!config.databaseUrl) {
    throw new DomainError("INVALID_STATE", "Sign-in needs a database configured — set DATABASE_URL");
  }

  const body = await parseBody(request, LoginSchema);
  const email = body.email.trim().toLowerCase();

  const record = await getPrismaClient().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, fullName: true, email: true, passwordHash: true, disabledAt: true },
  });

  // Same rejection whether the email is unknown or the password is wrong —
  // telling them apart would let an attacker enumerate registered emails.
  // That has to hold for timing too: always run the real scrypt comparison,
  // against a fixed decoy hash when there's no account to check against, so
  // an unknown email doesn't return measurably faster than a wrong password.
  const valid = await verifyPassword(body.password, record?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!record || !record.passwordHash || record.disabledAt || !valid) {
    throw new DomainError("CREDENTIAL_INVALID", INVALID_CREDENTIALS);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const session = await createSession(record.id, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  const response = ok({ id: record.id, fullName: record.fullName, email: record.email });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
});
