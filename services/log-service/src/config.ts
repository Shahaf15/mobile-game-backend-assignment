import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.LOG_SERVICE_PORT || '3004', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/game-backend',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
};
