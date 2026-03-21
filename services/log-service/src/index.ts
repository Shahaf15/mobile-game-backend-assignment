import express from 'express';
import { errorHandler, createServiceLogger } from '@game-backend/shared';
import { config } from './config';
import { connectRabbitMQ } from './publisher';
import logRoutes from './routes/log.routes';

const logger = createServiceLogger('log-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'log-service' });
});

app.use('/logs', logRoutes);

app.use(errorHandler);

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
