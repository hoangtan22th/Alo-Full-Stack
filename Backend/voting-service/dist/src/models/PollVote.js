"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollVote = void 0;
const mongoose_1 = require("mongoose");
const pollVoteSchema = new mongoose_1.Schema({
    pollId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
    optionId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
// Optional: Ensure a user can only vote for an option ONCE.
pollVoteSchema.index({ pollId: 1, optionId: 1, userId: 1 }, { unique: true });
exports.PollVote = (0, mongoose_1.model)('PollVote', pollVoteSchema);
