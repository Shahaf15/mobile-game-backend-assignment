import { connectMongo, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import { startWorker } from './worker';

const logger = createServiceLogger('log-worker');

async function start() {
  await connectMongo(config.mongoUri);
  await startWorker();
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start log worker');
  process.exit(1);
});
