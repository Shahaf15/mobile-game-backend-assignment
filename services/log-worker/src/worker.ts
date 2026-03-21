import amqplib from 'amqplib';
import { createServiceLogger } from '@game-backend/shared';
import { BatchProcessor } from './batch-processor';
import { TokenBucketRateLimiter } from './rate-limiter';
import { Semaphore } from './semaphore';
import { config } from './config';

const logger = createServiceLogger('log-worker');

const QUEUE_NAME = 'logs.queue';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startWorker(): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 3000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connection: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let channel: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await amqplib.connect(config.rabbitmqUrl);
      channel = await connection.createChannel();
      break;
    } catch (error) {
      logger.warn({ attempt, maxRetries, error }, 'Failed to connect to RabbitMQ, retrying...');
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to RabbitMQ after max retries');
      }
      await sleep(retryDelay);
    }
  }

  // Set prefetch for concurrency control at the consumer level
  await channel.prefetch(config.prefetchCount);

  const rateLimiter = new TokenBucketRateLimiter(config.maxTokens, config.refillRate);
  const semaphore = new Semaphore(config.maxConcurrency);
  const batchProcessor = new BatchProcessor(
    config.batchSize,
    config.batchTimeoutMs,
    rateLimiter,
    semaphore
  );

  logger.info(
    {
      batchSize: config.batchSize,
      batchTimeoutMs: config.batchTimeoutMs,
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
      maxConcurrency: config.maxConcurrency,
      prefetchCount: config.prefetchCount,
    },
    'Worker configuration loaded'
  );

  await channel.consume(QUEUE_NAME, (msg: any) => {
    if (!msg) return;

    try {
      const logData = JSON.parse(msg.content.toString());

      batchProcessor.add({
        logData,
        ack: () => channel.ack(msg),
        nack: (requeue: boolean) => channel.nack(msg, false, requeue),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to parse message');
      channel.nack(msg, false, false); // discard malformed messages
    }
  });

  // Periodic stats logging
  setInterval(() => {
    const stats = batchProcessor.getStats();
    logger.info({ stats }, 'Worker stats');
  }, 30000);

  logger.info('Log worker started and consuming messages');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down worker...');
    try {
      await channel.close();
      await connection.close();
    } catch {
      // ignore close errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
