import { type } from 'arktype';

export const createLogSchema = type({
  playerId: 'string >= 1',
  logData: 'string >= 1',
  'level?': "'debug' | 'info' | 'warn' | 'error' | 'fatal'",
  'action?': 'string >= 1',
  'metadata?': 'Record<string, unknown>',
  'timestamp?': 'string',
});
