import { Types } from 'mongoose';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ILog {
  _id: Types.ObjectId;
  playerId: string | null;
  level: LogLevel;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
}

export const LOG_PRIORITY_MAP: Record<LogLevel, number> = {
  debug: 1,
  info: 3,
  warn: 5,
  error: 7,
  fatal: 9,
};
