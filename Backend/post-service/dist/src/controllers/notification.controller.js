"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
function getUserIdFromHeader(req) {
    const userId = req.headers['x-user-id'];
    return typeof userId === 'string' ? userId : null;
}
class NotificationController {
    /**
     * Lấy danh sách thông báo của người dùng hiện tại
     */
    async getNotifications(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const limit = parseInt(req.query.limit) || 20;
            const skip = parseInt(req.query.skip) || 0;
            const notifications = await notification_service_1.notificationService.getNotifications(userId, limit, skip);
            res.status(200).json({ status: 200, data: notifications });
        }
        catch (error) {
            console.error('[NotificationController] Error fetching notifications:', error);
            res.status(400).json({ status: 400, message: error.message });
        }
    }
    /**
     * Đánh dấu một thông báo là đã đọc
     */
    async markAsRead(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const { notificationId } = req.params;
            if (!notificationId) {
                res.status(400).json({ status: 400, message: 'Thiếu notificationId' });
                return;
            }
            const notification = await notification_service_1.notificationService.markAsRead(notificationId, userId);
            if (!notification) {
                res.status(404).json({ status: 404, message: 'Thông báo không tồn tại hoặc không có quyền' });
                return;
            }
            res.status(200).json({ status: 200, data: notification });
        }
        catch (error) {
            console.error('[NotificationController] Error marking notification as read:', error);
            res.status(400).json({ status: 400, message: error.message });
        }
    }
    /**
     * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
     */
    async markAllAsRead(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            await notification_service_1.notificationService.markAllAsRead(userId);
            res.status(200).json({ status: 200, message: 'Đã đánh dấu đọc tất cả thông báo' });
        }
        catch (error) {
            console.error('[NotificationController] Error marking all notifications as read:', error);
            res.status(400).json({ status: 400, message: error.message });
        }
    }
    /**
     * Lấy số lượng thông báo chưa đọc của người dùng hiện tại
     */
    async getUnreadCount(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const count = await notification_service_1.notificationService.getUnreadCount(userId);
            res.status(200).json({ status: 200, data: { unreadCount: count } });
        }
        catch (error) {
            console.error('[NotificationController] Error counting unread notifications:', error);
            res.status(400).json({ status: 400, message: error.message });
        }
    }
}
exports.NotificationController = NotificationController;
exports.notificationController = new NotificationController();
exports.default = exports.notificationController;
//# sourceMappingURL=notification.controller.js.map