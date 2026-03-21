import express from 'express';
import { errorHandler } from '@game-backend/shared';
import scoreRoutes from './routes/score.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'score-service' });
});

app.use('/scores', scoreRoutes);
app.use(errorHandler);

export default app;
