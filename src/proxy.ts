import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy (formerly `middleware`): Content-Security-Policy and rate limiting.
 *
* Runs on every request. The CSP is nonce-based rather than `unsafe-inline`, which is what makes it
 * worth having — an injected `<script>` without the per-request nonce simply
 * does not execute. Next.js reads the nonce off the request header and stamps
 * it onto the scripts it emits.
 */

/** Paths that skip the proxy entirely. */
const SKIP = /^\/(_next\/static|_next\/image|favicon\.ico|assets\/)/;

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                               */
/* -------------------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window counter kept in module memory.
 *
 * This is the per-instance backstop, not the platform's rate limiter: with more
 * than one instance the real limits belong in Redis or at the WAF, which is why
 * the thresholds here are deliberately generous. It still stops a single client
 * hammering one instance.
 */
const buckets = new Map<string, Bucket>();

const LIMITS: Array<{ pattern: RegExp; limit: number; windowMs: number }> = [
  // Checkout and bookings: the endpoints worth abusing.
  { pattern: /^\/api\/v1\/(orders|bookings)/, limit: 20, windowMs: 60_000 },
  // Credential minting is called on a timer by the QR dialog, so it is higher.
  { pattern: /^\/api\/v1\/tickets\/[^/]+\/credential/, limit: 120, windowMs: 60_000 },
  // Scanners at a busy gate produce a lot of legitimate traffic.
  { pattern: /^\/api\/v1\/checkins/, limit: 600, windowMs: 60_000 },
  { pattern: /^\/api\/v1\//, limit: 120, windowMs: 60_000 },
];

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimit(request: NextRequest): { limited: boolean; retryAfter: number } {
  const rule = LIMITS.find((entry) => entry.pattern.test(request.nextUrl.pathname));
  if (!rule) return { limited: false, retryAfter: 0 };

  const key = `${clientKey(request)}:${rule.pattern.source}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 5_000) {
      for (const [existingKey, existing] of buckets) {
        if (existing.resetAt <= now) buckets.delete(existingKey);
      }
    }
    return { limited: false, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > rule.limit) {
    return { limited: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { limited: false, retryAfter: 0 };
}

/* -------------------------------------------------------------------------- */

export default function proxy(request: NextRequest) {
  if (SKIP.test(request.nextUrl.pathname)) return NextResponse.next();

  // The M-Pesa callback is authenticated by source IP inside the provider and
  // must not be rate limited — dropping a payment callback loses money.
  const isPaymentWebhook = request.nextUrl.pathname.startsWith("/api/v1/payments/webhooks");

  if (!isPaymentWebhook) {
    const { limited, retryAfter } = rateLimit(request);
    if (limited) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please slow down and try again shortly.",
          },
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    // `strict-dynamic` lets the nonce-trusted Next runtime load its own chunks.
    // Dev needs `unsafe-eval` for React Refresh; production does not get it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
    // Styles are compiled by Tailwind, but Next injects a small inline style
    // block for font loading, so this stays 'unsafe-inline' for styles only.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    // The venue map is a Google Maps iframe (see MapEmbed) — without this,
    // `default-src 'self'` silently blocks it in every browser, on every
    // network. Scoped to Maps' own embed host, nothing broader.
    `frame-src https://www.google.com`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ")
    .replace(/\s{2,}/g, " ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
