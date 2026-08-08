/**
 * All time access goes through this module so tests can freeze the clock and
 * so scheduled jobs (hold expiry, credential TTL, payout release) are testable
 * without sleeping.
 */
export interface Clock {
  now(): Date;
  nowIso(): string;
  epochSeconds(): number;
}

export const systemClock: Clock = {
  now: () => new Date(),
  nowIso: () => new Date().toISOString(),
  epochSeconds: () => Math.floor(Date.now() / 1000),
};

export function fixedClock(iso: string): Clock {
  const at = new Date(iso);
  return {
    now: () => new Date(at),
    nowIso: () => at.toISOString(),
    epochSeconds: () => Math.floor(at.getTime() / 1000),
  };
}

export function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return addSeconds(iso, hours * 3600);
}

export function addDays(iso: string, days: number): string {
  return addSeconds(iso, days * 86400);
}

export function isBefore(a: string, b: string): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}

export function isAfter(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}
