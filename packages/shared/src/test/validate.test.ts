import { describe, it, expect, vi } from 'vitest';
import { type } from 'arktype';
import { validate } from '../middleware/validate';
import type { Request, Response, NextFunction } from 'express';

const schema = type({ name: 'string >= 1', age: 'number.integer >= 0' });

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  it('calls next() and replaces req.body on valid input', () => {
    const { req, res, next } = makeReqRes({ name: 'Alice', age: 30 });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns 400 with error details on invalid input', () => {
    const { req, res, next } = makeReqRes({ name: '', age: -1 });
    validate(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation failed' })
    );
  });

  it('returns 400 when required field is missing', () => {
    const { req, res, next } = makeReqRes({ age: 25 });
    validate(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
