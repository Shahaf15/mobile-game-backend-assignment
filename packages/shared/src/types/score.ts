import { Types } from 'mongoose';

export interface IScore {
  _id: Types.ObjectId;
  playerId: Types.ObjectId;
  score: number;
  gameMode: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
