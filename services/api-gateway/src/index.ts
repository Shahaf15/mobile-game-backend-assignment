import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import { config } from './config';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Player Service: /api/players/*
app.use(
  '/api/players/leaderboard',
  createProxyMiddleware({
    target: config.services.leaderboard,
    changeOrigin: true,
    pathRewrite: { '^/api/players/leaderboard': '/players/leaderboard' },
  })
);

app.use(
  '/api/players',
  createProxyMiddleware({
    target: config.services.player,
    changeOrigin: true,
    pathRewrite: { '^/api/players': '/players' },
  })
);

// Score Service: /api/scores/*
app.use(
  '/api/scores',
  createProxyMiddleware({
    target: config.services.score,
    changeOrigin: true,
    pathRewrite: { '^/api/scores': '/scores' },
  })
);

// Log Service: /api/logs/*
app.use(
  '/api/logs',
  createProxyMiddleware({
    target: config.services.log,
    changeOrigin: true,
    pathRewrite: { '^/api/logs': '/logs' },
  })
);

app.listen(config.port, () => {
  logger.info({ port: config.port, services: config.services }, 'API Gateway started');
});
