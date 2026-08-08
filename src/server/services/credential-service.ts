import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/domain/errors";
import type { Ticket } from "@/domain/types";
import { activeSigningKey, config, signingKeyById } from "../config";
import { systemClock, type Clock } from "../lib/clock";

/**
 * Short-lived, signed ticket credentials.
 *
 * The QR code is not the ticket — the authoritative ticket is the backend
 * record. A credential is a signed assertion that says "at this moment, this
 * ticket, at this credential version, was valid". Two properties do the work:
 *
 *  - it expires in seconds, so a screenshot is worthless a minute later;
 *  - it carries `credentialVersion`, so transferring, reselling, refunding or
 *    voiding a ticket invalidates every credential ever issued for it simply by
 *    incrementing the ticket's version.
 *
 * Keys are addressed by id so they can be rotated: new credentials are signed
 * with the active key while in-flight credentials signed with the previous key
 * keep verifying until they expire.
 */

export interface CredentialPayload {
  /** Ticket id. */
  t: string;
  /** Event id. */
  e: string;
  /** Occurrence/session id, when the event has occurrences. */
  s: string | null;
  /** Credential version — must match the ticket's current version. */
  v: number;
  /** Issued at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
  /** Single-use nonce. */
  n: string;
  /** Signing key id. */
  k: string;
}

export interface IssuedCredential {
  /** The compact string encoded into the QR code. */
  token: string;
  payload: CredentialPayload;
  expiresAt: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export class CredentialService {
  constructor(private readonly clock: Clock = systemClock) {}

  issue(ticket: Ticket, occurrenceId: string | null = null): IssuedCredential {
    const { keyId, secret } = activeSigningKey();
    const issuedAt = this.clock.epochSeconds();
    const expiry = issuedAt + config.ticketCredentials.ttlSeconds;

    const payload: CredentialPayload = {
      t: ticket.id,
      e: ticket.eventId,
      s: occurrenceId,
      v: ticket.credentialVersion,
      iat: issuedAt,
      exp: expiry,
      n: randomBytes(9).toString("base64url"),
      k: keyId,
    };

    const encoded = base64url(JSON.stringify(payload));
    const signature = sign(encoded, secret);

    return {
      token: `BK1.${encoded}.${signature}`,
      payload,
      expiresAt: new Date(expiry * 1000).toISOString(),
    };
  }

  /**
   * Verifies signature, format and expiry. It deliberately does NOT check the
   * ticket's state — that is the check-in service's job, because state checks
   * need the database and must happen inside the same transaction that records
   * the admission.
   */
  verify(token: string): CredentialPayload {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "BK1") {
      throw new DomainError("CREDENTIAL_INVALID", "Malformed ticket credential");
    }
    const [, encoded, signature] = parts as [string, string, string];

    let payload: CredentialPayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CredentialPayload;
    } catch {
      throw new DomainError("CREDENTIAL_INVALID", "Unreadable ticket credential");
    }

    const secret = signingKeyById(payload.k);
    if (!secret) {
      throw new DomainError("CREDENTIAL_INVALID", "Credential signed with an unknown key");
    }
    if (!safeEquals(sign(encoded, secret), signature)) {
      throw new DomainError("CREDENTIAL_INVALID", "Credential signature does not verify");
    }
    if (payload.exp <= this.clock.epochSeconds()) {
      throw new DomainError("CREDENTIAL_INVALID", "Credential has expired");
    }
    return payload;
  }

  /** True when the credential still matches the ticket's live version. */
  matchesTicket(payload: CredentialPayload, ticket: Ticket): boolean {
    return payload.t === ticket.id && payload.v === ticket.credentialVersion;
  }
}
