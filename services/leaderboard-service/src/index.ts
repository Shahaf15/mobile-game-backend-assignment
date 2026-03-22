import { connectMongo, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import { rebuildLeaderboardIfEmpty } from './leaderboard.init';
import app from './app';

const logger = createServiceLogger('leaderboard-service');

async function start() {
  await connectMongo(config.mongoUri);
  await rebuildLeaderboardIfEmpty();

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Leaderboard service started');
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start leaderboard service');
  process.exit(1);
});
