import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.LEADERBOARD_SERVICE_PORT || '3003', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/game-backend',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtl: parseInt(process.env.LEADERBOARD_CACHE_TTL || '60', 10),
};
