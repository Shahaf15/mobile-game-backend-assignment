import { Router } from 'express';
import { validate, submitScoreSchema } from '@game-backend/shared';
import { submitScore, getTopScores } from '../controllers/score.controller';

const router = Router();

router.post('/', validate(submitScoreSchema), submitScore);
router.get('/top', getTopScores);

export default router;
