/**
 * Runs once at server boot, before any request is served. With a database
 * configured, this is where an empty PostgreSQL instance receives the demo
 * dataset — pages never race an unseeded store.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  const { getPrismaClient } = await import("./server/repositories/prisma/client");
  const { seedPostgresIfEmpty } = await import("./server/repositories/prisma/seed");

  const seeded = await seedPostgresIfEmpty(getPrismaClient());
  if (seeded) {
    console.log("[bookit] seeded empty PostgreSQL database with the demo dataset");
  }
}
