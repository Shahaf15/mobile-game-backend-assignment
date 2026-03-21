import { Request, Response, NextFunction } from 'express';
import { Player } from '../models/player.model';
import { createServiceLogger } from '@game-backend/shared';

const logger = createServiceLogger('player-service');

export async function createPlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, email, displayName } = req.body;

    const player = new Player({
      username,
      email,
      displayName: displayName || username,
    });

    const saved = await player.save();
    logger.info({ playerId: saved._id }, 'Player created');

    res.status(201).json({
      playerId: saved._id,
      username: saved.username,
      email: saved.email,
      displayName: saved.displayName,
      level: saved.level,
      experiencePoints: saved.experiencePoints,
      createdAt: saved.createdAt,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }
    next(error);
  }
}

export async function getPlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;
    const player = await Player.findById(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.json(player);
  } catch (error) {
    next(error);
  }
}

export async function updatePlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const player = await Player.findByIdAndUpdate(playerId, updates, {
      new: true,
      runValidators: true,
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    logger.info({ playerId }, 'Player updated');
    res.json(player);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }
    next(error);
  }
}

export async function deletePlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;
    const player = await Player.findByIdAndDelete(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    logger.info({ playerId }, 'Player deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
