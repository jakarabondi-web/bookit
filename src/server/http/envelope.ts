import { NextResponse } from "next/server";
import { z } from "zod";
import { DomainError, isDomainError } from "@/domain/errors";
import type { ActorContext } from "@/domain/types";
import { currentActor, currentOrganizerActor } from "../container";

/**
 * A single response shape for every endpoint.
 *
 * Success: `{ data, meta? }`
 * Failure: `{ error: { code, message, details? } }`
 *
 * Clients can therefore branch on the presence of `error` and switch on a
 * stable machine-readable `code` rather than parsing prose.
 */

export interface SuccessEnvelope<T> {
  data: T;
  meta?: { nextCursor?: string | null; count?: number };
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export function ok<T>(data: T, meta?: SuccessEnvelope<T>["meta"], status = 200) {
  return NextResponse.json<SuccessEnvelope<T>>({ data, ...(meta ? { meta } : {}) }, { status });
}

export function created<T>(data: T) {
  return ok(data, undefined, 201);
}

export function fail(error: DomainError) {
  return NextResponse.json<ErrorEnvelope>(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  );
}

/**
 * Wraps a handler so every thrown error becomes a correct envelope.
 * Unexpected errors are logged server-side and reported to the client as a
 * generic INTERNAL_ERROR — internals never leak into a response body.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isDomainError(error)) return fail(error);
      if (error instanceof z.ZodError) {
        return fail(
          new DomainError("VALIDATION_ERROR", "Some fields need attention", {
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          }),
        );
      }
      console.error("[bookit] unhandled error", error);
      return fail(new DomainError("INTERNAL_ERROR", "Something went wrong on our side"));
    }
  };
}

/** Parses and validates a JSON body, throwing a ZodError the wrapper handles. */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Request body must be valid JSON");
  }
  return schema.parse(raw);
}

/** Cursor pagination params, shared by every list endpoint. */
export function pagination(request: Request): { cursor: string | null; limit: number } {
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "24", 10) || 24, 1),
    100,
  );
  return { cursor: url.searchParams.get("cursor"), limit };
}

/**
 * Resolves the acting principal for a request.
 *
 * The session model, token verification and MFA assurance are specified in
 * `docs/ARCHITECTURE.md` and modelled in the Prisma schema; until the auth
 * provider is wired up this returns the demo consumer, or the demo organizer
 * for `/organizer` endpoints, so authorization checks in the services still run
 * against a real actor rather than being bypassed.
 */
export function actorFor(request: Request): ActorContext {
  const url = new URL(request.url);
  const isOrganizerScope = url.pathname.includes("/organizers/");
  const base = isOrganizerScope ? currentOrganizerActor() : currentActor();
  return {
    ...base,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}
