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
  if (!record || !record.passwordHash || record.disabledAt) {
    throw new DomainError("CREDENTIAL_INVALID", INVALID_CREDENTIALS);
  }
  const valid = await verifyPassword(body.password, record.passwordHash);
  if (!valid) {
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
