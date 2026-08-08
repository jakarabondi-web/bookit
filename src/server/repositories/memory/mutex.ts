/**
 * A minimal FIFO async mutex.
 *
 * The in-memory store uses it to give `runInTransaction` the same serialization
 * guarantee PostgreSQL gives us via row locks: two concurrent checkouts for the
 * last remaining seat cannot interleave between "read availability" and
 * "mark held". Without it the in-memory store would happily oversell and the
 * concurrency test would be meaningless.
 */
export class Mutex {
  #queue: Array<() => void> = [];
  #locked = false;

  async acquire(): Promise<() => void> {
    if (!this.#locked) {
      this.#locked = true;
      return this.#release;
    }
    return new Promise<() => void>((resolve) => {
      this.#queue.push(() => resolve(this.#release));
    });
  }

  readonly #release = (): void => {
    const next = this.#queue.shift();
    if (next) {
      next();
      return;
    }
    this.#locked = false;
  };

  async runExclusive<T>(work: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await work();
    } finally {
      release();
    }
  }
}
