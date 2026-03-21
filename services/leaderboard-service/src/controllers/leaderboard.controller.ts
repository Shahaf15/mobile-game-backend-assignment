import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { createServiceLogger, PaginatedResponse, LeaderboardEntry } from '@game-backend/shared';
import { config } from '../config';

const logger = createServiceLogger('leaderboard-service');
const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function getLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const cacheKey = `leaderboard:page:${page}:limit:${limit}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const Score = mongoose.connection.collection('scores');

    const [results, countResult] = await Promise.all([
      Score.aggregate([
        {
          $group: {
            _id: '$playerId',
            totalScore: { $sum: '$score' },
            gamesPlayed: { $sum: 1 },
          },
        },
        { $sort: { totalScore: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'players',
            localField: '_id',
            foreignField: '_id',
            as: 'player',
          },
        },
        { $unwind: { path: '$player', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            playerId: '$_id',
            username: { $ifNull: ['$player.username', 'Unknown'] },
            displayName: { $ifNull: ['$player.displayName', 'Unknown'] },
            totalScore: 1,
            gamesPlayed: 1,
          },
        },
      ]).toArray(),
      Score.aggregate([
        { $group: { _id: '$playerId' } },
        { $count: 'total' },
      ]).toArray(),
    ]);

    const total = countResult[0]?.total || 0;

    const data: LeaderboardEntry[] = results.map((entry: any, index: number) => ({
      playerId: entry.playerId.toString(),
      username: entry.username,
      displayName: entry.displayName,
      totalScore: entry.totalScore,
      gamesPlayed: entry.gamesPlayed,
      rank: skip + index + 1,
    }));

    const response: PaginatedResponse<LeaderboardEntry> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', config.cacheTtl);

    res.json(response);
  } catch (error) {
    next(error);
  }
}
