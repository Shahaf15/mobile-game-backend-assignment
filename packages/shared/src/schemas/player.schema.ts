import { type } from 'arktype';

export const createPlayerSchema = type({
  username: 'string >= 3 & string <= 30',
  email: 'string.email',
  'displayName?': 'string >= 1 & string <= 50',
});

export const updatePlayerSchema = type({
  'username?': 'string >= 3 & string <= 30',
  'email?': 'string.email',
});
