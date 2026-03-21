import mongoose, { Schema, Document } from 'mongoose';
import { ILog } from '@game-backend/shared';

export interface LogDocument extends Omit<ILog, '_id'>, Document {}

const logSchema = new Schema<LogDocument>(
  {
    playerId: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error', 'fatal'],
      default: 'info',
      index: true,
    },
    action: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

logSchema.index({ playerId: 1, timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30-day TTL

export const Log = mongoose.model<LogDocument>('Log', logSchema);
