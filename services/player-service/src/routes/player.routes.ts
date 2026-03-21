import { Router } from 'express';
import { validate, createPlayerSchema, updatePlayerSchema } from '@game-backend/shared';
import {
  createPlayer,
  getPlayer,
  updatePlayer,
  deletePlayer,
} from '../controllers/player.controller';

const router = Router();

router.post('/', validate(createPlayerSchema), createPlayer);
router.get('/:playerId', getPlayer);
router.put('/:playerId', validate(updatePlayerSchema), updatePlayer);
router.delete('/:playerId', deletePlayer);

export default router;
