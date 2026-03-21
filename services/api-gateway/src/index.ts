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

// In http-proxy-middleware v3, when mounted via app.use('/prefix', proxy),
// Express strips the prefix before the middleware sees the path.
// pathRewrite must match what the middleware receives (path without the mount prefix).

// Leaderboard: /api/players/leaderboard -> /players/leaderboard
app.use(
  '/api/players/leaderboard',
  createProxyMiddleware({
    target: config.services.leaderboard,
    changeOrigin: true,
    pathRewrite: { '^/': '/players/leaderboard' },
  })
);

// Player: /api/players/* -> /players/*
app.use(
  '/api/players',
  createProxyMiddleware({
    target: config.services.player,
    changeOrigin: true,
    pathRewrite: { '^/': '/players/' },
  })
);

// Score: /api/scores/* -> /scores/*
app.use(
  '/api/scores',
  createProxyMiddleware({
    target: config.services.score,
    changeOrigin: true,
    pathRewrite: { '^/': '/scores/' },
  })
);

// Log: /api/logs/* -> /logs/*
app.use(
  '/api/logs',
  createProxyMiddleware({
    target: config.services.log,
    changeOrigin: true,
    pathRewrite: { '^/': '/logs/' },
  })
);

app.listen(config.port, () => {
  logger.info({ port: config.port, services: config.services }, 'API Gateway started');
});
