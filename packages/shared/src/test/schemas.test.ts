import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { createPlayerSchema, updatePlayerSchema } from '../schemas/player.schema';
import { submitScoreSchema } from '../schemas/score.schema';
import { createLogSchema } from '../schemas/log.schema';

describe('createPlayerSchema', () => {
  it('accepts valid input', () => {
    const result = createPlayerSchema({ username: 'alice', email: 'alice@example.com' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects missing email', () => {
    const result = createPlayerSchema({ username: 'alice' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects username shorter than 3 chars', () => {
    const result = createPlayerSchema({ username: 'ab', email: 'a@b.com' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = createPlayerSchema({ username: 'alice', email: 'not-an-email' });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe('updatePlayerSchema', () => {
  it('accepts partial update with only username', () => {
    const result = updatePlayerSchema({ username: 'newname' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts empty object (no-op update — caught at controller level)', () => {
    const result = updatePlayerSchema({});
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects invalid email in update', () => {
    const result = updatePlayerSchema({ email: 'bad' });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe('submitScoreSchema', () => {
  it('accepts valid score', () => {
    const result = submitScoreSchema({ playerId: 'abc123', score: 500 });
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects negative score', () => {
    const result = submitScoreSchema({ playerId: 'abc123', score: -1 });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects float score', () => {
    const result = submitScoreSchema({ playerId: 'abc123', score: 1.5 });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects missing playerId', () => {
    const result = submitScoreSchema({ score: 100 });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe('createLogSchema', () => {
  it('accepts minimal valid log', () => {
    const result = createLogSchema({ playerId: 'p1', logData: 'something happened' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts log with all optional fields', () => {
    const result = createLogSchema({
      playerId: 'p1',
      logData: 'event',
      level: 'error',
      action: 'login',
      metadata: { ip: '127.0.0.1' },
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects invalid log level', () => {
    const result = createLogSchema({ playerId: 'p1', logData: 'x', level: 'verbose' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects empty logData', () => {
    const result = createLogSchema({ playerId: 'p1', logData: '' });
    expect(result instanceof type.errors).toBe(true);
  });
});
