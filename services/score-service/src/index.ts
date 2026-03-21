import { connectMongo, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import app from './app';

const logger = createServiceLogger('score-service');

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
