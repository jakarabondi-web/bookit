/**
 * A single error taxonomy shared by the domain, the services and the HTTP
 * layer. Every API error response is derived from a `DomainError`, so error
 * envelopes stay consistent and machine-readable across all endpoints.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "STEP_UP_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SOLD_OUT"
  | "HOLD_EXPIRED"
  | "INVALID_STATE"
  | "PAYMENT_FAILED"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "DUPLICATE_WEBHOOK"
  | "UNKNOWN_TRANSACTION"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "RISK_BLOCKED"
  | "RISK_REVIEW"
  | "CREDENTIAL_INVALID"
  | "ALREADY_CHECKED_IN"
  | "RESALE_NOT_ALLOWED"
  | "LEDGER_UNBALANCED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  STEP_UP_REQUIRED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SOLD_OUT: 409,
  HOLD_EXPIRED: 410,
  INVALID_STATE: 409,
  PAYMENT_FAILED: 402,
  PAYMENT_AMOUNT_MISMATCH: 409,
  DUPLICATE_WEBHOOK: 200,
  UNKNOWN_TRANSACTION: 202,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  RISK_BLOCKED: 403,
  RISK_REVIEW: 202,
  CREDENTIAL_INVALID: 401,
  ALREADY_CHECKED_IN: 409,
  RESALE_NOT_ALLOWED: 403,
  LEDGER_UNBALANCED: 500,
  INTERNAL_ERROR: 500,
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const notFound = (resource: string, id?: string) =>
  new DomainError("NOT_FOUND", `${resource} not found`, id ? { id } : undefined);

export const invalidState = (message: string, details?: Record<string, unknown>) =>
  new DomainError("INVALID_STATE", message, details);

export const forbidden = (message = "You do not have permission to do that") =>
  new DomainError("FORBIDDEN", message);

export const unauthenticated = (message = "Authentication required") =>
  new DomainError("UNAUTHENTICATED", message);

export const validationError = (message: string, details?: Record<string, unknown>) =>
  new DomainError("VALIDATION_ERROR", message, details);

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new DomainError("CONFLICT", message, details);

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
