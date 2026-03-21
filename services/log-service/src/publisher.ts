import amqplib, { ChannelModel, Channel } from 'amqplib';
import { createServiceLogger, LOG_PRIORITY_MAP, LogLevel } from '@game-backend/shared';

const logger = createServiceLogger('log-publisher');

const EXCHANGE_NAME = 'logs.exchange';
const QUEUE_NAME = 'logs.queue';
const ROUTING_KEY = 'log.ingest';
const MAX_PRIORITY = 10;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let rabbitmqUrl: string = '';
let isReconnecting = false;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connect(url: string, maxRetries = 10, retryDelay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = await amqplib.connect(url);
      connection = model;
      channel = await model.createChannel();

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
        logger.warn('RabbitMQ connection closed — scheduling reconnect');
        channel = null;
        connection = null;
        if (!isReconnecting) {
          isReconnecting = true;
          sleep(retryDelay)
            .then(() => connect(rabbitmqUrl))
            .then(() => { isReconnecting = false; })
            .catch((err) => {
              isReconnecting = false;
              logger.error({ err }, 'RabbitMQ reconnect failed');
            });
        }
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

export async function connectRabbitMQ(url: string): Promise<void> {
  rabbitmqUrl = url;
  await connect(url);
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
  isReconnecting = true; // prevent reconnect loop on intentional close
  if (channel) await channel.close();
  if (connection) await connection.close();
}
