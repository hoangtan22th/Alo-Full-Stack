import mongoose, { Schema } from 'mongoose';
// ============ Schema ============
const reactionSchema = new Schema({
    userId: { type: String, required: true },
    type: {
        type: String,
        enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
        required: true,
    },
}, { _id: false });
const postSchema = new Schema({
    userId: { type: String, required: true, index: true },
    content: { type: String, maxlength: 2000 },
    backgroundTemplate: { type: String, default: null }, // Mẫu hình nền
    media: [
        {
            url: { type: String, required: true },
            type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
            fileName: { type: String, required: true },
        },
    ],
    privacy: {
        type: String,
        enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'CUSTOM'],
        default: 'FRIENDS_ONLY',
        index: true,
    },
    allowedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    reactionCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    // Backward compatibility — giữ lại để các client cũ không bị lỗi
    likes: { type: [String], default: [] },
    likeCount: { type: Number, default: 0 },
}, { timestamps: true });
// ============ Indexes ============
postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ 'reactions.userId': 1 });
postSchema.index({ tags: 1 });
export const Post = mongoose.model('Post', postSchema);
export default Post;
//# sourceMappingURL=Post.js.map