import { connectMongo, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import app from './app';

const logger = createServiceLogger('player-service');

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
