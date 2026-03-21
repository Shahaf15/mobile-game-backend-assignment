import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Score } from '../models/score.model';
import { createServiceLogger } from '@game-backend/shared';

const logger = createServiceLogger('score-service');

export async function submitScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId, score } = req.body;

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      res.status(400).json({ error: 'Invalid playerId format' });
      return;
    }

    const scoreDoc = new Score({
      playerId: new mongoose.Types.ObjectId(playerId),
      score,
    });

    const saved = await scoreDoc.save();
    logger.info({ scoreId: saved._id, playerId, score }, 'Score submitted');

    res.status(201).json({
      scoreId: saved._id,
      playerId: saved.playerId,
      score: saved.score,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTopScores(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const topScores = await Score.find()
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    res.json({
      data: topScores,
      count: topScores.length,
    });
  } catch (error) {
    next(error);
  }
}
