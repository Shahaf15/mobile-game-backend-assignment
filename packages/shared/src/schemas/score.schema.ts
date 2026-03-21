import { type } from 'arktype';

export const submitScoreSchema = type({
  playerId: 'string >= 1',
  score: 'number.integer >= 0',
});
