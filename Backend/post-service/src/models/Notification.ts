import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'LIKE_POST'
  | 'REACT_POST'
  | 'COMMENT_POST'
  | 'REPLY_COMMENT'
  | 'TAG_POST'
  | 'NEW_POST';

export interface INotification extends Document {
  recipientId: string;       // Người nhận thông báo
  senderId: string;          // Người thực hiện hành động
  type: NotificationType;    // Loại thông báo
  postId?: Types.ObjectId;   // Bài viết liên quan
  commentId?: Types.ObjectId; // Bình luận liên quan
  message: string;           // Nội dung thông báo hiển thị
  isRead: boolean;           // Trạng thái đã đọc hay chưa
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
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
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
