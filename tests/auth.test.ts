import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { generateTotpSecret, totpAuthUrl, verifyTotpCode } from "@/server/auth/totp";

describe("password hashing", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the password itself in the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
  });
});

describe("TOTP", () => {
  // RFC 6238's own test vector: the ASCII key "12345678901234567890" at
  // Unix time 59 (counter 1, since the time step is 30s) produces 287082
  // once truncated to 6 digits — pinning our implementation against the
  // published algorithm, not just against itself.
  it("matches the RFC 6238 test vector", () => {
    const key = Buffer.from("12345678901234567890", "ascii");
    const secret = base32(key);
    expect(verifyTotpCode(secret, "287082", new Date(59_000))).toBe(true);
  });

  it("accepts a code generated for the current time", () => {
    const secret = generateTotpSecret();
    const now = new Date();
    const code = codeAt(secret, now);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("rejects a code from far outside the drift window", () => {
    const secret = generateTotpSecret();
    const now = new Date();
    const code = codeAt(secret, now);
    const muchLater = new Date(now.getTime() + 10 * 60_000);
    expect(verifyTotpCode(secret, code, muchLater)).toBe(false);
  });

  it("rejects a code from a different secret entirely", () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const now = new Date();
    expect(verifyTotpCode(secretB, codeAt(secretA, now), now)).toBe(false);
  });

  it("builds a scannable otpauth URL carrying the secret and account", () => {
    const secret = generateTotpSecret();
    const url = totpAuthUrl(secret, "amina@bookit.co.ke");
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain(secret);
    expect(url).toContain("Bookit");
  });
});

/**
 * Computes a code the same way an authenticator app would, independently of
 * `verifyTotpCode` — so a test asserting the two agree is actually checking
 * something, not just that the module agrees with itself.
 */
function codeAt(secret: string, at: Date): string {
  const key = base32Decode(secret);
  const counter = Math.floor(at.getTime() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(counter, 4);
  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = alphabet.indexOf(char);
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

function base32(bytes: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 0x1f];
  return output;
}
