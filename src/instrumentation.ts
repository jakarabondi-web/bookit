/**
 * Runs once at server boot, before any request is served.
 *
 * Two jobs: with a database configured, seed an empty PostgreSQL instance
 * with the demo dataset so pages never race an unseeded store; and start the
 * background schedule the service layer was always written for —
 * `docs/ARCHITECTURE.md` lists `releaseExpiredHolds`, `reconcilePending`,
 * `releaseMaturedReserves` and `notifications.drain()` as "idempotent,
 * retry-safe service methods ready to be scheduled," and until now nothing
 * ever called them. A real deployment would run these from a proper cron or
 * queue (so they survive a restart mid-run and don't duplicate across
 * instances); an in-process interval is the honest single-instance version
 * of that, not a replacement for it at real scale.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.DATABASE_URL) {
    const { getPrismaClient } = await import("./server/repositories/prisma/client");
    const { seedPostgresIfEmpty } = await import("./server/repositories/prisma/seed");

    const seeded = await seedPostgresIfEmpty(getPrismaClient());
    if (seeded) {
      console.log("[bookit] seeded empty PostgreSQL database with the demo dataset");
    }
  }

  await startBackgroundJobs();
}

/**
 * Guarded against double-start on `globalThis` — the same pattern
 * `getContainer()` uses — so a dev hot-reload or an accidental second
 * `register()` call can't stack up duplicate intervals.
 */
async function startBackgroundJobs(): Promise<void> {
  const globalScope = globalThis as unknown as { __bookitJobsStarted?: boolean };
  if (globalScope.__bookitJobsStarted) return;
  globalScope.__bookitJobsStarted = true;

  const { getContainer } = await import("./server/container");
  const { Role } = await import("./domain/enums");

  const systemActor = {
    userId: null,
    roles: [Role.SUPER_ADMIN],
    organizerId: null,
    ip: null,
    sessionId: "system-scheduler",
    mfaSatisfied: true,
    deviceId: null,
  };

  function every(label: string, intervalMs: number, run: () => Promise<number>): void {
    const timer = setInterval(() => {
      run().catch((error: unknown) => {
        console.error(`[bookit] scheduled job "${label}" failed`, error);
      });
    }, intervalMs);
    // Never keeps the process alive on its own — a graceful shutdown isn't
    // blocked waiting for the next tick of a job like this.
    timer.unref();
  }

  every("release-expired-holds", 60_000, () => getContainer().checkout.releaseExpiredHolds());
  every("reconcile-pending-payments", 5 * 60_000, () => getContainer().payments.reconcilePending());
  every("release-matured-reserves", 60 * 60_000, () =>
    getContainer().payouts.releaseMaturedReserves(systemActor),
  );
  // "Continuously" per the architecture doc; a short interval is the
  // in-process approximation of a worker that drains the queue as it fills.
  every("drain-notifications", 15_000, () => getContainer().notifications.drain());

  console.log("[bookit] background jobs scheduled: holds, payments, reserves, notifications");
}
