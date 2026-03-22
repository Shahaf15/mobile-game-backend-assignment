import Redis from 'ioredis';
import { config } from './config';
import { createServiceLogger } from '@game-backend/shared';

const logger = createServiceLogger('score-service');

logger.info({ redisUrl: config.redisUrl }, 'Initializing Redis client');

const redis = new Redis(config.redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error in score-service');
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

export default redis;
