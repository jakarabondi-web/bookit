import { cookies, headers } from "next/headers";
import type { ActorContext, User } from "@/domain/types";
import { DEMO_USER_ID } from "../container";
import { actorForToken, parseCookieHeader, SESSION_COOKIE } from "./session";

/** For server components and server actions — reads the request's own cookie jar. */
export async function getSessionUser(): Promise<{ actor: ActorContext; user: User } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return actorForToken(token, ip);
}

/** For route handlers — reads the cookie off the `Request` they were given. */
export async function getSessionUserFromRequest(
  request: Request,
): Promise<{ actor: ActorContext; user: User } | null> {
  const token = parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return actorForToken(token, ip);
}

/**
 * For account-area server components: the signed-in user's id, or the demo
 * consumer's when nobody is signed in — so `/account/*` keeps showing the
 * demo dataset to a visitor exactly as it always has, and a signed-in user's
 * own data once they log in.
 */
export async function currentUserId(): Promise<string> {
  const session = await getSessionUser();
  return session?.user.id ?? DEMO_USER_ID;
}

