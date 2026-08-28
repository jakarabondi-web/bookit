import { createHash, randomBytes } from "node:crypto";
import { Role } from "@/domain/enums";
import type { ActorContext, User } from "@/domain/types";
import { config } from "../config";
import { getPrismaClient } from "../repositories/prisma/client";

/**
 * Sessions.
 *
 * Only the SHA-256 hash of the session token is ever persisted — the same
 * pattern the codebase already uses for invite tokens — so a database leak
 * does not hand out working sessions. The raw token lives only in the
 * httpOnly cookie on the caller's device.
 */

export const SESSION_COOKIE = "bookit_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Reads one cookie's value out of a raw `Cookie` request header. */
export function parseCookieHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  info: { ip: string | null; userAgent: string | null },
): Promise<CreatedSession> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await getPrismaClient().session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      ip: info.ip,
      userAgent: info.userAgent,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  await getPrismaClient().session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Resolves a raw session token to the actor it authenticates, or null. */
export async function actorForToken(
  token: string,
  ip: string | null,
): Promise<{ actor: ActorContext; user: User } | null> {
  if (!config.databaseUrl) return null;

  const prisma = getPrismaClient();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true, roles: true, organizerMembers: true } } },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= new Date()) return null;
  if (session.user.disabledAt) return null;

  const roles = session.user.roles.map((entry) => entry.role);
  const user: User = {
    id: session.user.id,
    email: session.user.email,
    emailVerifiedAt: session.user.emailVerifiedAt?.toISOString() ?? null,
    phone: session.user.phone,
    phoneVerifiedAt: session.user.phoneVerifiedAt?.toISOString() ?? null,
    fullName: session.user.fullName,
    avatarUrl: session.user.profile?.avatarUrl ?? null,
    city: session.user.profile?.city ?? null,
    roles: roles.length > 0 ? roles : [Role.CONSUMER],
    mfaEnabled: session.user.mfaEnabled,
    createdAt: session.user.createdAt.toISOString(),
  };

  // A signed-in user acting for an organizer they belong to is a real actor
  // for that organizer; someone with no membership gets no organizer scope —
  // the `/organizer` preview stays on the demo organizer actor for them,
  // rather than silently granting access to one that isn't theirs.
  const membership = session.user.organizerMembers[0] ?? null;

  const actor: ActorContext = {
    userId: user.id,
    roles: user.roles,
    organizerId: membership?.organizerId ?? null,
    ip,
    sessionId: session.id,
    mfaSatisfied: session.mfaSatisfiedAt !== null,
    deviceId: session.deviceId,
  };

  return { actor, user };
}
