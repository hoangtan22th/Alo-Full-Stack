import mongoose, { Schema } from 'mongoose';
const notificationSchema = new Schema({
    recipientId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    type: {
        type: String,
        enum: ['LIKE_POST', 'REACT_POST', 'COMMENT_POST', 'REPLY_COMMENT', 'TAG_POST', 'NEW_POST'],
        required: true,
    },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
//# sourceMappingURL=Notification.js.map