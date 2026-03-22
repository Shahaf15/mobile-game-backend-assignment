import amqplib, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
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

  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;

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

  // Guaranteed non-null: the loop above throws if all retries fail
  const ch = channel!;
  const conn = connection!;

  // Declare exchange and queue (idempotent, safe to call multiple times)
  await ch.assertExchange('logs.exchange', 'direct', { durable: true });
  await ch.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: { 'x-max-priority': 10 },
  });
  await ch.bindQueue(QUEUE_NAME, 'logs.exchange', 'log.ingest');

  // Set prefetch for concurrency control at the consumer level
  await ch.prefetch(config.prefetchCount);

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

  await ch.consume(QUEUE_NAME, (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const logData = JSON.parse(msg.content.toString());

      batchProcessor.add({
        logData,
        ack: () => ch.ack(msg),
        nack: (requeue: boolean) => ch.nack(msg, false, requeue),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to parse message');
      ch.nack(msg, false, false); // discard malformed messages
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
      await ch.close();
      await conn.close();
    } catch {
      // ignore close errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
