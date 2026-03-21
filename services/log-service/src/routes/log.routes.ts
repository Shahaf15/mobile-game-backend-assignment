import { Router } from 'express';
import { validate, createLogSchema } from '@game-backend/shared';
import { createLog } from '../controllers/log.controller';

const router = Router();

router.post('/', validate(createLogSchema), createLog);

export default router;
