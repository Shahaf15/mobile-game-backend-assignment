import { createServiceLogger } from '@game-backend/shared';
import { TokenBucketRateLimiter } from './rate-limiter';
import { Semaphore } from './semaphore';
import { Log } from './models/log.model';

const logger = createServiceLogger('batch-processor');

interface BufferedMessage {
  logData: Record<string, unknown>;
  ack: () => void;
  nack: (requeue: boolean) => void;
}

/**
 * BatchProcessor accumulates log messages and flushes them to MongoDB
 * in batches. Flushes occur when either:
 * - The buffer reaches BATCH_SIZE
 * - BATCH_TIMEOUT elapses since the first message in the current batch
 *
 * Each flush is gated by the token bucket (rate limiting) and the
 * semaphore (concurrency control).
 */
export class BatchProcessor {
  private buffer: BufferedMessage[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushPromise: Promise<void> | null = null;
  private flushCount = 0;
  private totalProcessed = 0;

  constructor(
    private readonly batchSize: number,
    private readonly batchTimeoutMs: number,
    private readonly rateLimiter: TokenBucketRateLimiter,
    private readonly semaphore: Semaphore
  ) {}

  add(message: BufferedMessage): void {
    this.buffer.push(message);

    if (this.buffer.length >= this.batchSize) {
      this.scheduleFlush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.scheduleFlush(), this.batchTimeoutMs);
    }
  }

  private scheduleFlush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Chain flushes so concurrent calls are serialised
    this.flushPromise = (this.flushPromise ?? Promise.resolve()).then(() =>
      this.flush()
    );
  }

  private async flush(): Promise<void> {
    const batch = this.buffer.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      // Rate limit: wait for tokens proportional to batch size
      await this.rateLimiter.acquire(batch.length);

      // Concurrency control: wait for a semaphore slot
      await this.semaphore.acquire();

      try {
        const docs = batch.map((msg) => ({
          playerId: msg.logData.playerId as string,
          level: msg.logData.level || 'info',
          action: msg.logData.action || '',
          message: msg.logData.logData || msg.logData.message || '',
          metadata: msg.logData.metadata || {},
          timestamp: msg.logData.timestamp
            ? new Date(msg.logData.timestamp as string)
            : new Date(),
        }));

        await Log.insertMany(docs, { ordered: false });

        // Acknowledge all messages in the batch
        batch.forEach((msg) => msg.ack());

        this.flushCount++;
        this.totalProcessed += batch.length;

        logger.info(
          {
            batchSize: batch.length,
            flushCount: this.flushCount,
            totalProcessed: this.totalProcessed,
          },
          'Batch flushed to database'
        );
      } finally {
        this.semaphore.release();
      }
    } catch (error) {
      logger.error({ error, batchSize: batch.length }, 'Failed to flush batch');

      // Negative acknowledge and requeue on failure
      batch.forEach((msg) => msg.nack(true));
    }
  }

  getStats() {
    return {
      bufferSize: this.buffer.length,
      flushCount: this.flushCount,
      totalProcessed: this.totalProcessed,
      activeConcurrency: this.semaphore.getActiveConcurrency(),
      availableTokens: this.rateLimiter.getAvailableTokens(),
    };
  }
}
