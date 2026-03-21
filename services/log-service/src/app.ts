import express from 'express';
import { errorHandler } from '@game-backend/shared';
import logRoutes from './routes/log.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'log-service' });
});

app.use('/logs', logRoutes);
app.use(errorHandler);

export default app;
