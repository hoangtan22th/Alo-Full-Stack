import { Schema, model } from 'mongoose';
const pollVoteSchema = new Schema({
    pollId: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
// Optional: Ensure a user can only vote for an option ONCE.
pollVoteSchema.index({ pollId: 1, optionId: 1, userId: 1 }, { unique: true });
export const PollVote = model('PollVote', pollVoteSchema);
