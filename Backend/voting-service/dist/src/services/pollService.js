"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollService = exports.PollService = void 0;
const Poll_1 = require("../models/Poll");
const PollVote_1 = require("../models/PollVote");
const rabbitmq_1 = require("../configs/rabbitmq");
const mongoose_1 = require("mongoose");
class PollService {
    async createPoll(data) {
        const { conversationId, creatorId, question, options, settings, expiresAt } = data;
        // Validate options
        if (!options || options.length < 2) {
            throw new Error('A poll must have at least 2 options');
        }
        const pollOptions = options.map((opt) => ({
            text: opt,
            addedBy: creatorId,
        }));
        const poll = new Poll_1.Poll({
            conversationId,
            creatorId,
            question,
            options: pollOptions,
            settings: settings || {},
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            status: 'OPEN',
        });
        const savedPoll = await poll.save();
        // Publish event to message-service to create a system message
        await rabbitmq_1.rabbitMQService.publishExchange('chat_exchange', 'poll.created', {
            conversationId,
            creatorId,
            pollId: savedPoll._id,
            question: savedPoll.question,
            type: 'poll',
        });
        return savedPoll;
    }
    async getPollsByConversation(conversationId, limit = 20, cursor) {
        const query = { conversationId };
        if (cursor) {
            query._id = { $lt: new mongoose_1.Types.ObjectId(cursor) };
        }
        const polls = await Poll_1.Poll.find(query).sort({ createdAt: -1 }).limit(limit);
        return polls;
    }
    async getPollDetails(pollId) {
        const poll = await Poll_1.Poll.findById(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        return poll;
    }
    async closePoll(pollId, userId) {
        const poll = await Poll_1.Poll.findById(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        if (poll.creatorId !== userId) {
            // Depending on rules, you might want group admins to also be able to close
            throw new Error('Only the creator can close this poll');
        }
        poll.status = 'CLOSED';
        await poll.save();
        // Publish event
        await rabbitmq_1.rabbitMQService.publishExchange('chat_exchange', 'poll.closed', {
            conversationId: poll.conversationId,
            pollId: poll._id,
        });
        return poll;
    }
    async addOption(pollId, userId, text) {
        const poll = await Poll_1.Poll.findById(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        if (poll.status !== 'OPEN') {
            throw new Error('Poll is already closed');
        }
        if (!poll.settings.allowAddOptions && poll.creatorId !== userId) {
            throw new Error('Only the creator can add options to this poll');
        }
        poll.options.push({ text, addedBy: userId });
        await poll.save();
        return poll;
    }
    async vote(pollId, userId, optionIds) {
        const poll = await Poll_1.Poll.findById(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        if (poll.status !== 'OPEN') {
            throw new Error('Poll is closed');
        }
        if (!poll.settings.allowMultipleAnswers && optionIds.length > 1) {
            throw new Error('Multiple answers are not allowed for this poll');
        }
        // Verify all optionIds exist in poll.options
        const validOptionIds = poll.options.map(opt => opt._id.toString());
        for (const optId of optionIds) {
            if (!validOptionIds.includes(optId)) {
                throw new Error(`Invalid option ID: ${optId}`);
            }
        }
        // Replace old votes for this user in this poll
        await PollVote_1.PollVote.deleteMany({ pollId, userId });
        const newVotes = optionIds.map(optId => ({
            pollId,
            optionId: optId,
            userId,
        }));
        if (newVotes.length > 0) {
            await PollVote_1.PollVote.insertMany(newVotes);
        }
        // Publish event to realtime-service
        await rabbitmq_1.rabbitMQService.publishExchange('realtime_exchange', 'poll.updated', {
            conversationId: poll.conversationId,
            pollId,
        });
        return { message: 'Voted successfully' };
    }
    async getPollResults(pollId, requestUserId) {
        const poll = await Poll_1.Poll.findById(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        // Get all votes for this poll
        const votes = await PollVote_1.PollVote.find({ pollId });
        // Enforce visibility settings
        let hasVoted = false;
        if (poll.settings.hideResultsUntilVoted) {
            hasVoted = votes.some(v => v.userId === requestUserId);
            if (!hasVoted && poll.status === 'OPEN') {
                return {
                    _id: poll._id,
                    hidden: true,
                    message: "You must vote to see the results.",
                };
            }
        }
        // Aggregate counts
        const results = poll.options.map((opt) => {
            const optionVotes = votes.filter(v => v.optionId.toString() === opt._id.toString());
            return {
                optionId: opt._id,
                text: opt.text,
                voterCount: optionVotes.length,
                voters: poll.settings.hideVoters ? [] : optionVotes.map(v => v.userId)
            };
        });
        return {
            _id: poll._id,
            question: poll.question,
            status: poll.status,
            totalVotes: votes.length,
            results,
        };
    }
}
exports.PollService = PollService;
exports.pollService = new PollService();
