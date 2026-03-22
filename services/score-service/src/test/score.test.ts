import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  startMongoMemory,
  stopMongoMemory,
  clearCollections,
} from '@game-backend/shared/src/test/mongo-helper';

vi.mock('../redis', () => {
  return {
    default: {
      zincrby: vi.fn().mockResolvedValue('100'),
      on: vi.fn(),
    },
  };
});

import app from '../app';
import { Score } from '../models/score.model';
import redis from '../redis';

beforeAll(startMongoMemory);
afterAll(stopMongoMemory);
beforeEach(clearCollections);

const validPlayerId = new mongoose.Types.ObjectId().toString();

describe('POST /scores', () => {
  it('submits a score and returns 201 with scoreId', async () => {
    const res = await request(app).post('/scores').send({ playerId: validPlayerId, score: 100 });
    expect(res.status).toBe(201);
    expect(res.body.scoreId).toBeDefined();
    expect(res.body.score).toBe(100);
    expect(res.body.playerId).toBe(validPlayerId);
  });

  it('returns 400 for invalid playerId format', async () => {
    const res = await request(app).post('/scores').send({ playerId: 'bad-id', score: 50 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing score', async () => {
    const res = await request(app).post('/scores').send({ playerId: validPlayerId });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative score', async () => {
    const res = await request(app).post('/scores').send({ playerId: validPlayerId, score: -10 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for float score', async () => {
    const res = await request(app).post('/scores').send({ playerId: validPlayerId, score: 9.9 });
    expect(res.status).toBe(400);
  });
});

describe('GET /scores/top', () => {
  it('returns empty array when no scores exist', async () => {
    const res = await request(app).get('/scores/top');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('returns scores sorted by descending score', async () => {
    const pid = new mongoose.Types.ObjectId().toString();
    await Score.insertMany([
      { playerId: pid, score: 50 },
      { playerId: pid, score: 200 },
      { playerId: pid, score: 100 },
    ]);

    const res = await request(app).get('/scores/top');
    expect(res.status).toBe(200);
    expect(res.body.data[0].score).toBe(200);
    expect(res.body.data[1].score).toBe(100);
    expect(res.body.data[2].score).toBe(50);
  });

  it('limits to 10 by default', async () => {
    const pid = new mongoose.Types.ObjectId().toString();
    await Score.insertMany(
      Array.from({ length: 15 }, (_, i) => ({ playerId: pid, score: i * 10 }))
    );

    const res = await request(app).get('/scores/top');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
  });

  it('respects custom limit query param', async () => {
    const pid = new mongoose.Types.ObjectId().toString();
    await Score.insertMany(
      Array.from({ length: 5 }, (_, i) => ({ playerId: pid, score: i * 10 }))
    );

    const res = await request(app).get('/scores/top?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });
});

describe('Redis Integration (score submission)', () => {
  it('calls zincrby on Redis after successful score submission', async () => {
    const mockZincrby = vi.mocked(redis.zincrby);
    mockZincrby.mockClear();
    const res = await request(app).post('/scores').send({ playerId: validPlayerId, score: 75 });

    expect(res.status).toBe(201);
    // zincrby is fire-and-forget, give microtask queue a tick
    await new Promise((r) => setImmediate(r));
    expect(mockZincrby).toHaveBeenCalledWith('leaderboard', 75, validPlayerId);
  });

  it('still returns 201 even if Redis zincrby rejects', async () => {
    const mockZincrby = vi.mocked(redis.zincrby);
    mockZincrby.mockRejectedValueOnce(new Error('Redis down'));
    const res = await request(app).post('/scores').send({ playerId: validPlayerId, score: 50 });

    expect(res.status).toBe(201);
    expect(res.body.scoreId).toBeDefined();
    // Redis failure must not affect HTTP response
  });
});
