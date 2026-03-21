import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the publisher module so tests never touch RabbitMQ.
// vi.mock is hoisted, so the import of app below gets the mocked publisher.
vi.mock('../publisher', () => ({
  publishLog: vi.fn().mockReturnValue(true),
  connectRabbitMQ: vi.fn().mockResolvedValue(undefined),
}));

import app from '../app';
import { publishLog } from '../publisher';

beforeEach(() => {
  vi.mocked(publishLog).mockReturnValue(true);
});

describe('POST /logs', () => {
  it('returns 202 and acknowledges receipt', async () => {
    const res = await request(app)
      .post('/logs')
      .send({ playerId: 'player1', logData: 'user clicked button' });

    expect(res.status).toBe(202);
    expect(res.body.message).toBe('Log received');
    expect(res.body.timestamp).toBeDefined();
  });

  it('calls publishLog with the log entry', async () => {
    await request(app)
      .post('/logs')
      .send({ playerId: 'player1', logData: 'login event' });

    expect(publishLog).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'player1', logData: 'login event' })
    );
  });

  it('defaults level to info when not provided', async () => {
    await request(app)
      .post('/logs')
      .send({ playerId: 'p1', logData: 'some event' });

    expect(publishLog).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info' })
    );
  });

  it('preserves provided log level', async () => {
    await request(app)
      .post('/logs')
      .send({ playerId: 'p1', logData: 'crash', level: 'fatal' });

    expect(publishLog).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'fatal' })
    );
  });

  it('returns 400 when playerId is missing', async () => {
    const res = await request(app).post('/logs').send({ logData: 'something' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when logData is missing', async () => {
    const res = await request(app).post('/logs').send({ playerId: 'p1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid log level', async () => {
    const res = await request(app)
      .post('/logs')
      .send({ playerId: 'p1', logData: 'x', level: 'verbose' });
    expect(res.status).toBe(400);
  });

  it('returns 503 when RabbitMQ channel is unavailable', async () => {
    vi.mocked(publishLog).mockReturnValueOnce(false);

    const res = await request(app)
      .post('/logs')
      .send({ playerId: 'p1', logData: 'event' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/unavailable/i);
  });
});

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
