import type { PrismaClient } from "@prisma/client";
import type { Repositories, UnitOfWork } from "../types";
import { createPrismaRepositories } from "./repositories";

/**
 * PostgreSQL unit of work. `runInTransaction` maps to a real database
 * transaction: every repository call inside `work` runs on the same
 * connection, row locks taken by `inventory.lockAvailableUnits` hold until
 * commit, and a thrown error rolls the whole batch back — the same contract
 * the in-memory store honours with its mutex and snapshot.
 */
export function createPrismaUnitOfWork(prisma: PrismaClient): UnitOfWork {
  return {
    repos: createPrismaRepositories(prisma),
    runInTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
      return prisma.$transaction(
        async (tx) => work(createPrismaRepositories(tx)),
        // Checkout does real work inside the transaction (risk scoring, fee
        // arithmetic, notification queueing); the defaults are too tight.
        { maxWait: 10_000, timeout: 20_000 },
      );
    },
  };
}
