import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
  services: {
    player: process.env.PLAYER_SERVICE_URL || 'http://localhost:3001',
    score: process.env.SCORE_SERVICE_URL || 'http://localhost:3002',
    leaderboard: process.env.LEADERBOARD_SERVICE_URL || 'http://localhost:3003',
    log: process.env.LOG_SERVICE_URL || 'http://localhost:3004',
  },
};
