import mongoose, { Schema, Document } from 'mongoose';
import { IScore } from '@game-backend/shared';

export interface ScoreDocument extends Omit<IScore, '_id'>, Document {}

const scoreSchema = new Schema<ScoreDocument>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Player',
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

scoreSchema.index({ score: -1 });
scoreSchema.index({ playerId: 1, score: -1 });

export const Score = mongoose.model<ScoreDocument>('Score', scoreSchema);
