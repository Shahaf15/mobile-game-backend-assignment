import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  startMongoMemory,
  stopMongoMemory,
  clearCollections,
} from '@game-backend/shared/src/test/mongo-helper';

// In-memory sorted set mock
let store = new Map<string, number>();

vi.mock('ioredis', () => {
  class Redis {
    on() { return this; }

    async zcard(): Promise<number> {
      return store.size;
    }

    async zrevrange(
      key: string,
      start: number,
      stop: number,
      withScores?: string
    ): Promise<string[]> {
      const sorted = [...store.entries()].sort((a, b) => b[1] - a[1]);
      const slice = stop === -1 ? sorted.slice(start) : sorted.slice(start, stop + 1);
      if (withScores === 'WITHSCORES') {
        return slice.flatMap(([member, score]) => [member, String(score)]);
      }
      return slice.map(([member]) => member);
    }

    async zincrby(key: string, increment: number, member: string): Promise<string> {
      const current = store.get(member) ?? 0;
      const next = current + increment;
      store.set(member, next);
      return String(next);
    }

    async zadd(key: string, score: number, member: string): Promise<number> {
      const isNew = !store.has(member);
      store.set(member, score);
      return isNew ? 1 : 0;
    }

    pipeline() {
      const cmds: (() => void)[] = [];
      return {
        zadd: (k: string, s: number, m: string) => {
          cmds.push(() => store.set(m, s));
          return this;
        },
        exec: async () => {
          cmds.forEach((f) => f());
          return [];
        },
      };
    }
  }
  return { default: Redis };
});

// vitest hoists vi.mock calls so this import runs after the mock is set up
import app from '../app';

beforeAll(startMongoMemory);
afterAll(stopMongoMemory);
beforeEach(() => {
  clearCollections();
  store.clear();
});

async function seedScores(entries: { playerId: string; score: number }[]) {
  const collection = mongoose.connection.collection('scores');
  await collection.insertMany(
    entries.map(({ playerId, score }) => ({
      playerId: new mongoose.Types.ObjectId(playerId),
      score,
    }))
  );
}

describe('GET /players/leaderboard', () => {
  it('returns empty leaderboard when no scores exist', async () => {
    const res = await request(app).get('/players/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('aggregates total scores per player and sorts descending', async () => {
    const p1 = new mongoose.Types.ObjectId().toString();
    const p2 = new mongoose.Types.ObjectId().toString();

    // Seed sorted set with pre-computed totals
    store.set(p1, 150);
    store.set(p2, 300);

    // Seed MongoDB scores for gamesPlayed count
    await seedScores([
      { playerId: p1, score: 100 },
      { playerId: p1, score: 50 },
      { playerId: p2, score: 300 },
    ]);

    const res = await request(app).get('/players/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data[0].totalScore).toBe(300);
    expect(res.body.data[0].playerId).toBe(p2);
    expect(res.body.data[1].totalScore).toBe(150);
    expect(res.body.data[1].playerId).toBe(p1);
  });

  it('includes gamesPlayed count per player', async () => {
    const p1 = new mongoose.Types.ObjectId().toString();

    // Seed sorted set
    store.set(p1, 60);

    // Seed MongoDB scores
    await seedScores([
      { playerId: p1, score: 10 },
      { playerId: p1, score: 20 },
      { playerId: p1, score: 30 },
    ]);

    const res = await request(app).get('/players/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data[0].gamesPlayed).toBe(3);
  });

  it('assigns sequential rank starting at 1', async () => {
    const p1 = new mongoose.Types.ObjectId().toString();
    const p2 = new mongoose.Types.ObjectId().toString();

    // Seed sorted set
    store.set(p1, 100);
    store.set(p2, 200);

    // Seed MongoDB scores
    await seedScores([
      { playerId: p1, score: 100 },
      { playerId: p2, score: 200 },
    ]);

    const res = await request(app).get('/players/leaderboard');
    expect(res.body.data[0].rank).toBe(1);
    expect(res.body.data[1].rank).toBe(2);
  });

  it('paginates results correctly', async () => {
    const players = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId().toString());

    // Seed sorted set with descending scores
    players.forEach((p, i) => store.set(p, (5 - i) * 100));

    // Seed MongoDB scores
    await seedScores(players.map((p, i) => ({ playerId: p, score: (i + 1) * 100 })));

    const page1 = await request(app).get('/players/leaderboard?page=1&limit=2');
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination.page).toBe(1);
    expect(page1.body.pagination.totalPages).toBe(3);

    const page2 = await request(app).get('/players/leaderboard?page=2&limit=2');
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.pagination.page).toBe(2);
    expect(page2.body.data[0].rank).toBe(3);
  });

  it('returns correct totalPages in pagination metadata', async () => {
    const players = Array.from({ length: 7 }, () => new mongoose.Types.ObjectId().toString());

    // Seed sorted set
    players.forEach((p, i) => store.set(p, i * 10));

    // Seed MongoDB scores
    await seedScores(players.map((p, i) => ({ playerId: p, score: i * 10 })));

    const res = await request(app).get('/players/leaderboard?limit=3');
    expect(res.body.pagination.total).toBe(7);
    expect(res.body.pagination.totalPages).toBe(3);
  });
});
