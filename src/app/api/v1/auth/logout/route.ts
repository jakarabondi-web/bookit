import { parseCookieHeader, revokeSession, SESSION_COOKIE } from "@/server/auth/session";
import { handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/logout — revoke the current session. */
export const POST = handler(async (request: Request) => {
  const token = parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE);
  if (token) await revokeSession(token);

  const response = ok({ signedOut: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
  return response;
});
