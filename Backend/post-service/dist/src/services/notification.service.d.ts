import { INotification, NotificationType } from '../models/Notification';
export declare class NotificationService {
    /**
     * Tạo và lưu thông báo mới, đồng thời phát qua RabbitMQ
     */
    createNotification(recipientId: string, senderId: string, type: NotificationType, message: string, postId?: string, commentId?: string): Promise<INotification | null>;
    /**
     * Lấy danh sách thông báo phân trang của một user
     */
    getNotifications(userId: string, limit?: number, skip?: number): Promise<INotification[]>;
    /**
     * Đánh dấu một thông báo là đã đọc
     */
    markAsRead(notificationId: string, userId: string): Promise<INotification | null>;
    /**
     * Đánh dấu tất cả thông báo của một user là đã đọc
     */
    markAllAsRead(userId: string): Promise<void>;
    /**
     * Đếm số lượng thông báo chưa đọc
     */
    getUnreadCount(userId: string): Promise<number>;
}
export declare const notificationService: NotificationService;
export default notificationService;
//# sourceMappingURL=notification.service.d.ts.map