import { randomBytes, randomUUID } from "node:crypto";

/** Opaque primary keys. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

const HUMAN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Human-readable reference for order/booking/ticket codes. Excludes the
 * characters people confuse when reading a code over the phone (I, O, 0, 1).
 */
export function humanCode(prefix: string, length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += HUMAN_ALPHABET[bytes[i]! % HUMAN_ALPHABET.length];
  }
  return `${prefix}-${out}`;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
