import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from './config';
import { createServiceLogger } from '@game-backend/shared';

const logger = createServiceLogger('leaderboard-service');
const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function rebuildLeaderboardIfEmpty(): Promise<void> {
  try {
    const size = await redis.zcard('leaderboard');
    if (size > 0) {
      logger.info({ size }, 'Sorted set already populated, skipping rebuild');
      return;
    }

    logger.warn('Sorted set is empty — rebuilding from MongoDB scores collection');

    const results = await mongoose.connection.db!
      .collection('scores')
      .aggregate([{ $group: { _id: '$playerId', totalScore: { $sum: '$score' } } }])
      .toArray();

    if (results.length === 0) {
      logger.info('No scores in MongoDB, nothing to rebuild');
      return;
    }

    // Use a pipeline for atomic bulk insert
    const pipeline = redis.pipeline();
    for (const row of results) {
      pipeline.zadd('leaderboard', row.totalScore, row._id.toString());
    }
    await pipeline.exec();

    logger.info({ count: results.length }, 'Sorted set rebuilt from MongoDB');
  } catch (err) {
    logger.error({ err }, 'Sorted set rebuild failed — continuing without it');
    // Non-fatal: leaderboard will serve empty results until Redis is populated
  }
}
