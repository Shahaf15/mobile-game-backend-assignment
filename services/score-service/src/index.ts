import express from 'express';
import { connectMongo, errorHandler, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import scoreRoutes from './routes/score.routes';

const logger = createServiceLogger('score-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'score-service' });
});

app.use('/scores', scoreRoutes);

app.use(errorHandler);

async function start() {
  await connectMongo(config.mongoUri);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Score service started');
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start score service');
  process.exit(1);
});
