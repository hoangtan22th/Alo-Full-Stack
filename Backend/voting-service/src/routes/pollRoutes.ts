import { Router } from 'express';
import { pollController } from '../controllers/pollController';

const router = Router();

// Poll Management
router.post('/', pollController.createPoll);
router.get('/conversation/:conversationId', pollController.getPollsByConversation);
router.get('/:pollId', pollController.getPollDetails);
router.put('/:pollId/close', pollController.closePoll);

// Voting & Options
router.post('/:pollId/options', pollController.addOption);
router.post('/:pollId/vote', pollController.vote);
router.get('/:pollId/results', pollController.getPollResults);

export default router;
