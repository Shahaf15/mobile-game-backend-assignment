import amqplib from 'amqplib';
import { createServiceLogger, LOG_PRIORITY_MAP, LogLevel } from '@game-backend/shared';

const logger = createServiceLogger('log-publisher');

const EXCHANGE_NAME = 'logs.exchange';
const QUEUE_NAME = 'logs.queue';
const ROUTING_KEY = 'log.ingest';
const MAX_PRIORITY = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let channel: any = null;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectRabbitMQ(url: string): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await amqplib.connect(url);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
      await channel.assertQueue(QUEUE_NAME, {
        durable: true,
        arguments: { 'x-max-priority': MAX_PRIORITY },
      });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

      logger.info('Connected to RabbitMQ');

      connection.on('error', (err: Error) => {
        logger.error({ err }, 'RabbitMQ connection error');
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
      });

      return;
    } catch (error) {
      logger.warn({ attempt, maxRetries, error }, 'Failed to connect to RabbitMQ, retrying...');
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to RabbitMQ after max retries');
      }
      await sleep(retryDelay);
    }
  }
}

export function publishLog(logEntry: Record<string, unknown>): boolean {
  if (!channel) {
    logger.error('RabbitMQ channel not available');
    return false;
  }

  const level = (logEntry.level as LogLevel) || 'info';
  const priority = LOG_PRIORITY_MAP[level] || 3;

  return channel.publish(
    EXCHANGE_NAME,
    ROUTING_KEY,
    Buffer.from(JSON.stringify(logEntry)),
    {
      persistent: true,
      priority,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    }
  );
}

export async function closeRabbitMQ(): Promise<void> {
  if (channel) await channel.close();
  if (connection) await connection.close();
}
