/**
 * Central environment configuration. Everything is read once, validated, and
 * exposed as a frozen object so no module reaches into `process.env` directly.
 *
 * Modules under `src/server` are server-only by convention: they are imported
 * from server components, route handlers and the test-suite, never from a
 * `"use client"` module.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string, fallback?: string): string {
  const value = optional(name) ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = optional(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parses `TICKET_CREDENTIAL_KEYS` in `keyId:secret,keyId:secret` form. Holding
 * several keys at once is what makes rotation possible: new credentials are
 * signed with the active key while credentials signed by the previous key keep
 * verifying until they expire.
 */
function parseSigningKeys(raw: string): Map<string, string> {
  const keys = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;
    keys.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }
  return keys;
}

const credentialKeys = parseSigningKeys(
  required("TICKET_CREDENTIAL_KEYS", "k1:dev-only-change-me-0123456789abcdef"),
);

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  appUrl: required("APP_URL", "http://localhost:3000"),

  /** When unset, the in-memory repositories are used. */
  databaseUrl: optional("DATABASE_URL"),
  redisUrl: optional("REDIS_URL"),

  ticketCredentials: {
    activeKeyId: required("TICKET_CREDENTIAL_ACTIVE_KEY_ID", "k1"),
    keys: credentialKeys,
    ttlSeconds: int("TICKET_CREDENTIAL_TTL_SECONDS", 45),
  },

  session: {
    secret: required("SESSION_SECRET", "dev-only-change-me-session-secret"),
    magicLinkTtlSeconds: int("MAGIC_LINK_TTL_SECONDS", 900),
  },

  checkout: {
    /** How long a hold survives before the expiry job releases the inventory. */
    holdTtlSeconds: int("CHECKOUT_HOLD_TTL_SECONDS", 600),
    /** Platform service fee in basis points (600 = 6%). */
    serviceFeeBps: int("PLATFORM_SERVICE_FEE_BPS", 600),
    /** Platform fee charged on a completed resale, in basis points. */
    resaleFeeBps: int("PLATFORM_RESALE_FEE_BPS", 800),
  },

  media: {
    /**
     * Largest upload accepted, before any decoding. A phone photograph is
     * typically 2–5 MB; 8 MB leaves room for a DSLR export without letting a
     * caller stream something enormous at the process.
     */
    maxUploadBytes: int("MEDIA_MAX_UPLOAD_BYTES", 8 * 1024 * 1024),
  },

  /**
   * The design assistant's optional model escalation.
   *
   * The prompt console resolves in the browser and works with none of this set.
   * A key only widens the vocabulary: prompts the local interpreter cannot
   * place are passed to a model, which answers in the same closed operation set
   * and is validated against it before anything touches a design.
   */
  designAssistant: {
    apiKey: optional("ANTHROPIC_API_KEY"),
    model: optional("DESIGN_ASSISTANT_MODEL") ?? "claude-sonnet-5",
    enabled: Boolean(optional("ANTHROPIC_API_KEY")),
  },

  mpesa: {
    environment: (optional("MPESA_ENVIRONMENT") ?? "sandbox") as "sandbox" | "production",
    consumerKey: optional("MPESA_CONSUMER_KEY"),
    consumerSecret: optional("MPESA_CONSUMER_SECRET"),
    shortcode: optional("MPESA_SHORTCODE"),
    passkey: optional("MPESA_PASSKEY"),
    callbackUrl: optional("MPESA_CALLBACK_URL"),
    /** Callbacks are only accepted from Safaricom's published ranges. */
    allowlist: (optional("MPESA_WEBHOOK_ALLOWLIST") ?? "196.201.214.0/24")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  },

  logLevel: optional("LOG_LEVEL") ?? "info",
});

export function activeSigningKey(): { keyId: string; secret: string } {
  const keyId = config.ticketCredentials.activeKeyId;
  const secret = config.ticketCredentials.keys.get(keyId);
  if (!secret) {
    throw new Error(`Active credential key "${keyId}" is not present in TICKET_CREDENTIAL_KEYS`);
  }
  return { keyId, secret };
}

export function signingKeyById(keyId: string): string | undefined {
  return config.ticketCredentials.keys.get(keyId);
}
