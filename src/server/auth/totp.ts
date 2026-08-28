import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP — RFC 6238, HMAC-SHA1, 6 digits, 30-second step. The same algorithm
 * every authenticator app (Google Authenticator, Authy, 1Password, …)
 * implements, built on Node's own `crypto` rather than a dependency.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD_SECONDS = 30;
/** How many 30s steps either side of "now" still verify, absorbing clock drift. */
const WINDOW_STEPS = 1;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpAuthUrl(secret: string, accountEmail: string): string {
  const label = encodeURIComponent(`Bookit:${accountEmail}`);
  const issuer = encodeURIComponent("Bookit");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}

/** Formatted in groups of 4 for manual entry into an authenticator app. */
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function verifyTotpCode(secret: string, code: string, at: Date = new Date()): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const key = base32Decode(secret);
  const currentStep = Math.floor(at.getTime() / 1000 / PERIOD_SECONDS);

  for (let drift = -WINDOW_STEPS; drift <= WINDOW_STEPS; drift += 1) {
    const candidate = hotp(key, currentStep + drift);
    if (constantTimeEquals(candidate, normalized)) return true;
  }
  return false;
}

function hotp(key: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  // Counter fits comfortably in the low 32 bits until the year 2106056 or so.
  counterBuffer.writeUInt32BE(counter, 4);

  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
