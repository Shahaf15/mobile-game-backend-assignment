import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectMongo(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    process.exit(1);
  }

  mongoose.connection.on('error', (error) => {
    logger.error({ error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
