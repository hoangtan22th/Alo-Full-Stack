import mongoose, { Document, Types } from 'mongoose';
export type NotificationType = 'LIKE_POST' | 'REACT_POST' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'TAG_POST' | 'NEW_POST';
export interface INotification extends Document {
    recipientId: string;
    senderId: string;
    type: NotificationType;
    postId?: Types.ObjectId;
    commentId?: Types.ObjectId;
    message: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, mongoose.DefaultSchemaOptions> & INotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, INotification>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map