import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "../../config";

/**
 * Process-wide Prisma client. Prisma 7 connects through a driver adapter
 * rather than a URL in the schema; the pg adapter also gives Prisma a real
 * connection pool. Cached on `globalThis` for the same reason as the
 * container: Next.js re-evaluates modules on every hot reload in development.
 */

const globalForPrisma = globalThis as unknown as { __bookitPrisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__bookitPrisma) {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL must be set to use the Prisma repositories");
    }
    const adapter = new PrismaPg({ connectionString: config.databaseUrl });
    globalForPrisma.__bookitPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.__bookitPrisma;
}
