import type { ActorContext, AuditLog } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { AuditRepository } from "../repositories/types";

export interface AuditInput {
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  approvalChain?: string[];
}

/** Keys whose values must never reach the audit trail in the clear. */
const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "passkey",
  "signature",
  "idnumber",
  "krapin",
  "accountnumber",
  "cardnumber",
]);

/**
 * Redacts sensitive values from before/after snapshots. The audit trail records
 * that a payout destination changed and who changed it — not the account
 * number itself.
 */
export function redact(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? redact(raw as Record<string, unknown>)
        : raw;
  }
  return out;
}

export class AuditService {
  constructor(
    private readonly repo: AuditRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async record(actor: ActorContext, input: AuditInput): Promise<AuditLog> {
    return this.repo.append({
      id: newId("aud"),
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: redact(input.before),
      after: redact(input.after),
      ip: actor.ip,
      sessionId: actor.sessionId,
      mfaSatisfied: actor.mfaSatisfied,
      reason: input.reason ?? null,
      approvalChain: input.approvalChain ?? [],
      at: this.clock.nowIso(),
    });
  }

  listForResource(resourceType: string, resourceId: string) {
    return this.repo.listForResource(resourceType, resourceId);
  }

  listRecent(limit = 50) {
    return this.repo.listRecent(limit);
  }
}
