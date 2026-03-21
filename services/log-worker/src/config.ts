import dotenv from 'dotenv';
dotenv.config();

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/game-backend',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  batchSize: parseInt(process.env.BATCH_SIZE || '50', 10),
  batchTimeoutMs: parseInt(process.env.BATCH_TIMEOUT_MS || '2000', 10),
  maxTokens: parseInt(process.env.RATE_LIMIT_MAX_TOKENS || '100', 10),
  refillRate: parseInt(process.env.RATE_LIMIT_REFILL_RATE || '20', 10),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '3', 10),
  prefetchCount: parseInt(process.env.PREFETCH_COUNT || '100', 10),
  logTtlSeconds: parseInt(process.env.LOG_TTL_SECONDS || '2592000', 10),
};
