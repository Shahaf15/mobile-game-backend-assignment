import { createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import { connectRabbitMQ } from './publisher';
import app from './app';

const logger = createServiceLogger('log-service');

async function start() {
  await connectRabbitMQ(config.rabbitmqUrl);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Log service started');
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start log service');
  process.exit(1);
});
