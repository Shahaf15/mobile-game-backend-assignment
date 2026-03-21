import { describe, it, expect } from 'vitest';
import { Semaphore } from '../semaphore';

describe('Semaphore', () => {
  it('grants up to maxConcurrency acquisitions immediately', async () => {
    const sem = new Semaphore(3);
    await sem.acquire();
    await sem.acquire();
    await sem.acquire();
    expect(sem.getActiveConcurrency()).toBe(3);
  });

  it('queues acquires beyond maxConcurrency', async () => {
    const sem = new Semaphore(1);
    await sem.acquire(); // slot 0 taken

    let released = false;
    const waiting = sem.acquire().then(() => { released = true; });

    expect(released).toBe(false);
    sem.release(); // free slot 0
    await waiting;
    expect(released).toBe(true);
  });

  it('release decrements activeConcurrency', async () => {
    const sem = new Semaphore(2);
    await sem.acquire();
    await sem.acquire();
    sem.release();
    expect(sem.getActiveConcurrency()).toBe(1);
  });

  it('queued waiters resolve in FIFO order', async () => {
    const sem = new Semaphore(1);
    await sem.acquire(); // fill

    const order: number[] = [];
    const w1 = sem.acquire().then(() => order.push(1));
    const w2 = sem.acquire().then(() => order.push(2));
    const w3 = sem.acquire().then(() => order.push(3));

    sem.release(); await w1;
    sem.release(); await w2;
    sem.release(); await w3;

    expect(order).toEqual([1, 2, 3]);
  });

  it('getQueueLength returns number of waiting acquires', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    const w1 = sem.acquire();
    const w2 = sem.acquire();
    expect(sem.getQueueLength()).toBe(2);

    sem.release(); await w1;
    sem.release(); await w2;
  });
});
