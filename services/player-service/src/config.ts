import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PLAYER_SERVICE_PORT || '3001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/game-backend',
};
