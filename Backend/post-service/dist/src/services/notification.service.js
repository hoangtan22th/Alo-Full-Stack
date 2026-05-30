import Notification from '../models/Notification';
import { Types } from 'mongoose';
import { publishToRealtime } from '../config/rabbitmq';
export class NotificationService {
    /**
     * Tạo và lưu thông báo mới, đồng thời phát qua RabbitMQ
     */
    async createNotification(recipientId, senderId, type, message, postId, commentId) {
        // Tránh gửi thông báo cho chính bản thân
        if (recipientId === senderId)
            return null;
        try {
            const notification = new Notification({
                recipientId,
                senderId,
                type,
                message,
                postId: postId ? new Types.ObjectId(postId) : null,
                commentId: commentId ? new Types.ObjectId(commentId) : null,
            });
            const savedNotification = await notification.save();
            // Publish to RabbitMQ to deliver in real-time
            console.log(`[RabbitMQ] Publishing NEW_NOTIFICATION to user_${recipientId}`);
            await publishToRealtime('NEW_NOTIFICATION', {
                target: recipientId,
                data: savedNotification,
            });
            return savedNotification;
        }
        catch (err) {
            console.error('[NotificationService] Error creating notification:', err);
            return null;
        }
    }
    /**
     * Lấy danh sách thông báo phân trang của một user
     */
    async getNotifications(userId, limit = 20, skip = 0) {
        return await Notification.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    }
    /**
     * Đánh dấu một thông báo là đã đọc
     */
    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate({ _id: new Types.ObjectId(notificationId), recipientId: userId }, { $set: { isRead: true } }, { new: true });
    }
    /**
     * Đánh dấu tất cả thông báo của một user là đã đọc
     */
    async markAllAsRead(userId) {
        await Notification.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });
    }
    /**
     * Đếm số lượng thông báo chưa đọc
     */
    async getUnreadCount(userId) {
        return await Notification.countDocuments({ recipientId: userId, isRead: false });
    }
}
export const notificationService = new NotificationService();
export default notificationService;
//# sourceMappingURL=notification.service.js.map