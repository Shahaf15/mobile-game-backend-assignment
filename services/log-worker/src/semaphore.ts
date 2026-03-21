/**
 * Counting Semaphore for Concurrency Control
 *
 * Limits the number of concurrent database write operations
 * to prevent overloading MongoDB's connection pool.
 */
export class Semaphore {
  private current = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrency) {
      this.current++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    const next = this.waitQueue.shift();
    if (next) {
      next();
    }
  }

  getActiveConcurrency(): number {
    return this.current;
  }

  getQueueLength(): number {
    return this.waitQueue.length;
  }
}
