import { Request, Response, NextFunction } from 'express';
import { createServiceLogger } from '@game-backend/shared';
import { publishLog } from '../publisher';

const logger = createServiceLogger('log-service');

export async function createLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const logEntry = {
      ...req.body,
      level: req.body.level || 'info',
      timestamp: req.body.timestamp || new Date().toISOString(),
    };

    const published = publishLog(logEntry);

    if (!published) {
      logger.error('Failed to publish log to RabbitMQ');
      res.status(503).json({ error: 'Log queue unavailable' });
      return;
    }

    res.status(202).json({
      message: 'Log received',
      timestamp: logEntry.timestamp,
    });
  } catch (error) {
    next(error);
  }
}
