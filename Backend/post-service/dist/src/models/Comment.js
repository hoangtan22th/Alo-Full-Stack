import mongoose, { Schema } from 'mongoose';
const commentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: String, required: true },
    content: { type: String, maxlength: 1000 },
    mediaUrl: { type: String, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    reactions: {
        type: [
            {
                userId: { type: String, required: true },
                type: {
                    type: String,
                    enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
                    required: true,
                },
            },
        ],
        default: [],
    },
    reactionCount: { type: Number, default: 0 },
}, { timestamps: true });
commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ 'reactions.userId': 1 });
export const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
//# sourceMappingURL=Comment.js.map