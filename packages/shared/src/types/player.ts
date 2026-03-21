import { Types } from 'mongoose';

export interface IPlayer {
  _id: Types.ObjectId;
  username: string;
  email: string;
  displayName: string;
  level: number;
  experiencePoints: number;
  createdAt: Date;
  updatedAt: Date;
}
