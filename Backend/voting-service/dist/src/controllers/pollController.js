"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollController = exports.PollController = void 0;
const pollService_1 = require("../services/pollService");
class PollController {
    async createPoll(req, res) {
        try {
            const { conversationId, question, options, settings, expiresAt } = req.body;
            const creatorId = req.user?.id || req.body.creatorId; // Using mock user if no auth middleware
            const poll = await pollService_1.pollService.createPoll({
                conversationId,
                creatorId,
                question,
                options,
                settings,
                expiresAt,
            });
            res.status(201).json(poll);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async getPollsByConversation(req, res) {
        try {
            const { conversationId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const cursor = req.query.cursor;
            const polls = await pollService_1.pollService.getPollsByConversation(conversationId, limit, cursor);
            res.status(200).json(polls);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async getPollDetails(req, res) {
        try {
            const { pollId } = req.params;
            const poll = await pollService_1.pollService.getPollDetails(pollId);
            res.status(200).json(poll);
        }
        catch (error) {
            res.status(404).json({ message: error.message });
        }
    }
    async closePoll(req, res) {
        try {
            const { pollId } = req.params;
            const userId = req.user?.id || req.body.userId; // Mock user
            const poll = await pollService_1.pollService.closePoll(pollId, userId);
            res.status(200).json(poll);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async addOption(req, res) {
        try {
            const { pollId } = req.params;
            const { text } = req.body;
            const userId = req.user?.id || req.body.userId;
            const poll = await pollService_1.pollService.addOption(pollId, userId, text);
            res.status(200).json(poll);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async vote(req, res) {
        try {
            const { pollId } = req.params;
            const { optionIds } = req.body;
            const userId = req.user?.id || req.body.userId;
            const result = await pollService_1.pollService.vote(pollId, userId, optionIds);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async getPollResults(req, res) {
        try {
            const { pollId } = req.params;
            const userId = req.user?.id || req.query.userId;
            const results = await pollService_1.pollService.getPollResults(pollId, userId);
            res.status(200).json(results);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}
exports.PollController = PollController;
exports.pollController = new PollController();
