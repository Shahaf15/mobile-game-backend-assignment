import { Types } from 'mongoose';

export interface IScore {
  _id: Types.ObjectId;
  playerId: Types.ObjectId;
  score: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
