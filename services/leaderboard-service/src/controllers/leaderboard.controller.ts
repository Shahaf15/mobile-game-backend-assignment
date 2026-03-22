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
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // Step 1: Get paginated slice from sorted set, highest score first
    const [rawEntries, total] = await Promise.all([
      redis.zrevrange('leaderboard', start, stop, 'WITHSCORES'),
      redis.zcard('leaderboard'),
    ]);

    // ZREVRANGE WITHSCORES returns flat array: [member, score, member, score, ...]
    const pageEntries: { playerId: string; totalScore: number }[] = [];
    for (let i = 0; i < rawEntries.length; i += 2) {
      pageEntries.push({
        playerId: rawEntries[i],
        totalScore: parseFloat(rawEntries[i + 1]),
      });
    }

    // Short-circuit for empty leaderboard
    if (pageEntries.length === 0) {
      res.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
      return;
    }

    const playerIds = pageEntries.map((e) => new mongoose.Types.ObjectId(e.playerId));
    const db = mongoose.connection.db!;

    // Step 2: Fetch player display info + gamesPlayed for this page only
    const [playerDocs, gameCounts] = await Promise.all([
      db.collection('players')
        .find({ _id: { $in: playerIds } }, { projection: { username: 1, displayName: 1 } })
        .toArray(),
      db.collection('scores')
        .aggregate([
          { $match: { playerId: { $in: playerIds } } },
          { $group: { _id: '$playerId', gamesPlayed: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const playerMap = new Map(playerDocs.map((p) => [p._id.toString(), p]));
    const gamesMap = new Map(gameCounts.map((g) => [g._id.toString(), g.gamesPlayed]));

    // Step 3: Assemble response
    const data: LeaderboardEntry[] = pageEntries.map((entry, i) => ({
      playerId: entry.playerId,
      username: playerMap.get(entry.playerId)?.username ?? 'Unknown',
      displayName: playerMap.get(entry.playerId)?.displayName ?? 'Unknown',
      totalScore: entry.totalScore,
      gamesPlayed: gamesMap.get(entry.playerId) ?? 0,
      rank: start + i + 1,
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

    res.json(response);
  } catch (error) {
    next(error);
  }
}
