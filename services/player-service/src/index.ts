import express from 'express';
import { connectMongo, errorHandler, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import playerRoutes from './routes/player.routes';

const logger = createServiceLogger('player-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'player-service' });
});

app.use('/players', playerRoutes);

app.use(errorHandler);

async function start() {
  await connectMongo(config.mongoUri);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Player service started');
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start player service');
  process.exit(1);
});
