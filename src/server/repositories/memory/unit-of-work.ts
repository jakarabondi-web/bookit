import type { Repositories, UnitOfWork } from "../types";
import { createMemoryRepositories } from "./repositories";
import { Mutex } from "./mutex";
import { type MemoryDb, restore, snapshot } from "./store";

/**
 * Transactional wrapper over the in-memory store.
 *
 * `runInTransaction` is serialized by a mutex and rolls the whole dataset back
 * if the callback throws — the same all-or-nothing contract a service gets from
 * a Postgres transaction. Nested calls reuse the outer transaction rather than
 * deadlocking on the mutex.
 */
export function createMemoryUnitOfWork(db: MemoryDb): UnitOfWork {
  const repos: Repositories = createMemoryRepositories(db);
  const mutex = new Mutex();
  let depth = 0;

  return {
    repos,
    async runInTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
      if (depth > 0) {
        // Already inside a transaction — join it, so the outermost call owns
        // the commit/rollback decision.
        return work(repos);
      }
      return mutex.runExclusive(async () => {
        const before = snapshot(db);
        depth += 1;
        try {
          return await work(repos);
        } catch (error) {
          restore(db, before);
          throw error;
        } finally {
          depth -= 1;
        }
      });
    },
  };
}
