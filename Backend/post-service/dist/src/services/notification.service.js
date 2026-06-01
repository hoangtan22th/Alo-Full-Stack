"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = require("mongoose");
const rabbitmq_1 = require("../config/rabbitmq");
class NotificationService {
    /**
     * Tạo và lưu thông báo mới, đồng thời phát qua RabbitMQ
     */
    async createNotification(recipientId, senderId, type, message, postId, commentId) {
        // Tránh gửi thông báo cho chính bản thân
        if (recipientId === senderId)
            return null;
        try {
            const notification = new Notification_1.default({
                recipientId,
                senderId,
                type,
                message,
                postId: postId ? new mongoose_1.Types.ObjectId(postId) : null,
                commentId: commentId ? new mongoose_1.Types.ObjectId(commentId) : null,
            });
            const savedNotification = await notification.save();
            // Publish to RabbitMQ to deliver in real-time
            console.log(`[RabbitMQ] Publishing NEW_NOTIFICATION to user_${recipientId}`);
            await (0, rabbitmq_1.publishToRealtime)('NEW_NOTIFICATION', {
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
        return await Notification_1.default.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    }
    /**
     * Đánh dấu một thông báo là đã đọc
     */
    async markAsRead(notificationId, userId) {
        return await Notification_1.default.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(notificationId), recipientId: userId }, { $set: { isRead: true } }, { new: true });
    }
    /**
     * Đánh dấu tất cả thông báo của một user là đã đọc
     */
    async markAllAsRead(userId) {
        await Notification_1.default.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });
    }
    /**
     * Đếm số lượng thông báo chưa đọc
     */
    async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({ recipientId: userId, isRead: false });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
exports.default = exports.notificationService;
//# sourceMappingURL=notification.service.js.map