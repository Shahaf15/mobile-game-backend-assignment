import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import {
  startMongoMemory,
  stopMongoMemory,
  clearCollections,
} from '@game-backend/shared/src/test/mongo-helper';

beforeAll(startMongoMemory);
afterAll(stopMongoMemory);
beforeEach(clearCollections);

const validPlayer = { username: 'alice', email: 'alice@example.com' };

describe('POST /players', () => {
  it('creates a player and returns 201 with playerId', async () => {
    const res = await request(app).post('/players').send(validPlayer);
    expect(res.status).toBe(201);
    expect(res.body.playerId).toBeDefined();
    expect(res.body.username).toBe('alice');
    expect(res.body.email).toBe('alice@example.com');
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/players').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/players').send({ username: 'bob', email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate username', async () => {
    await request(app).post('/players').send(validPlayer);
    const res = await request(app).post('/players').send(validPlayer);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('GET /players/:playerId', () => {
  it('retrieves a player by id', async () => {
    const created = await request(app).post('/players').send(validPlayer);
    const { playerId } = created.body;

    const res = await request(app).get(`/players/${playerId}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/players/64f1a2b3c4d5e6f7a8b9c0d1');
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed id', async () => {
    const res = await request(app).get('/players/not-an-id');
    expect(res.status).toBe(400);
  });
});

describe('PUT /players/:playerId', () => {
  it('updates username and returns updated player', async () => {
    const created = await request(app).post('/players').send(validPlayer);
    const { playerId } = created.body;

    const res = await request(app)
      .put(`/players/${playerId}`)
      .send({ username: 'alice2' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice2');
  });

  it('returns 400 when body is empty', async () => {
    const created = await request(app).post('/players').send(validPlayer);
    const res = await request(app).put(`/players/${created.body.playerId}`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/players/64f1a2b3c4d5e6f7a8b9c0d1')
      .send({ username: 'x123' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed id', async () => {
    const res = await request(app).put('/players/bad-id').send({ username: 'x123' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /players/:playerId', () => {
  it('deletes a player and returns 204', async () => {
    const created = await request(app).post('/players').send(validPlayer);
    const { playerId } = created.body;

    const res = await request(app).delete(`/players/${playerId}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/players/${playerId}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/players/64f1a2b3c4d5e6f7a8b9c0d1');
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed id', async () => {
    const res = await request(app).delete('/players/bad-id');
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
