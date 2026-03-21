import express from 'express';
import { errorHandler } from '@game-backend/shared';
import playerRoutes from './routes/player.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'player-service' });
});

app.use('/players', playerRoutes);
app.use(errorHandler);

export default app;
