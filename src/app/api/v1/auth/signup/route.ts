import { z } from "zod";
import { Role } from "@/domain/enums";
import { DomainError } from "@/domain/errors";
import { config } from "@/server/config";
import { getContainer } from "@/server/container";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import { getPrismaClient } from "@/server/repositories/prisma/client";
import { newId } from "@/server/lib/ids";
import { handler, created, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const SignupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .regex(/^(\+?254|0)\d{9}$/, "Enter a Kenyan phone number, e.g. 0712 345 678")
    .optional(),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** POST /api/v1/auth/signup — create an account and sign in. */
export const POST = handler(async (request: Request) => {
  if (!config.databaseUrl) {
    throw new DomainError(
      "INVALID_STATE",
      "Sign-up needs a database configured — set DATABASE_URL",
    );
  }

  const body = await parseBody(request, SignupSchema);
  const email = body.email.trim().toLowerCase();
  const { uow } = getContainer();

  const existing = await uow.repos.users.findByEmail(email);
  if (existing) {
    throw new DomainError("CONFLICT", "An account with that email already exists");
  }

  const now = new Date().toISOString();
  const user = await uow.repos.users.create({
    id: newId("usr"),
    email,
    emailVerifiedAt: null,
    phone: body.phone ?? null,
    phoneVerifiedAt: null,
    fullName: body.fullName.trim(),
    avatarUrl: null,
    city: null,
    roles: [Role.CONSUMER],
    mfaEnabled: false,
    createdAt: now,
  });

  const passwordHash = await hashPassword(body.password);
  await getPrismaClient().user.update({ where: { id: user.id }, data: { passwordHash } });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const session = await createSession(user.id, { ip, userAgent: request.headers.get("user-agent") });

  const response = created({ id: user.id, fullName: user.fullName, email: user.email });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
});
