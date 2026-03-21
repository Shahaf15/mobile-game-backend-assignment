import express from 'express';
import { connectMongo, errorHandler, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import leaderboardRoutes from './routes/leaderboard.routes';

const logger = createServiceLogger('leaderboard-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'leaderboard-service' });
});

app.use('/players/leaderboard', leaderboardRoutes);

app.use(errorHandler);

async function start() {
  await connectMongo(config.mongoUri);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Leaderboard service started');
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start leaderboard service');
  process.exit(1);
});
