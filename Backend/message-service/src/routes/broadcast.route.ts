// src/routes/broadcast.route.ts
import { Router } from 'express';
import * as broadcastController from '../controllers/broadcast.controller';

const router = Router();

// POST /api/v1/admin/messages/broadcasts
router.post('/', broadcastController.createBroadcast);

// GET /api/v1/admin/messages/broadcasts/history
router.get('/history', broadcastController.getBroadcastHistory);

export default router;
