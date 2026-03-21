import mongoose, { Schema, Document } from 'mongoose';
import { IPlayer } from '@game-backend/shared';

export interface PlayerDocument extends Omit<IPlayer, '_id'>, Document {}

const playerSchema = new Schema<PlayerDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    experiencePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

playerSchema.index({ username: 1 }, { unique: true });
playerSchema.index({ email: 1 }, { unique: true });

export const Player = mongoose.model<PlayerDocument>('Player', playerSchema);
