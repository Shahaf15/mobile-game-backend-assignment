import express from 'express';
import { errorHandler } from '@game-backend/shared';
import leaderboardRoutes from './routes/leaderboard.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'leaderboard-service' });
});

app.use('/players/leaderboard', leaderboardRoutes);
app.use(errorHandler);

export default app;
