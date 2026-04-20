"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pollController_1 = require("../controllers/pollController");
const router = (0, express_1.Router)();
// Poll Management
router.post('/', pollController_1.pollController.createPoll);
router.get('/conversation/:conversationId', pollController_1.pollController.getPollsByConversation);
router.get('/:pollId', pollController_1.pollController.getPollDetails);
router.put('/:pollId/close', pollController_1.pollController.closePoll);
// Voting & Options
router.post('/:pollId/options', pollController_1.pollController.addOption);
router.post('/:pollId/vote', pollController_1.pollController.vote);
router.get('/:pollId/results', pollController_1.pollController.getPollResults);
exports.default = router;
