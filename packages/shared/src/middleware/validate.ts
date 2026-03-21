import { type, type Type } from 'arktype';
import type { Request, Response, NextFunction } from 'express';

export function validate(schema: Type) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema(req.body);
    if (result instanceof type.errors) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.summary,
      });
      return;
    }
    req.body = result;
    next();
  };
}
