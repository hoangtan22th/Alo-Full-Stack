import { Request, Response, NextFunction } from 'express';
export declare class NotificationController {
    /**
     * Lấy danh sách thông báo của người dùng hiện tại
     */
    getNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Đánh dấu một thông báo là đã đọc
     */
    markAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
     */
    markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy số lượng thông báo chưa đọc của người dùng hiện tại
     */
    getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const notificationController: NotificationController;
export default notificationController;
//# sourceMappingURL=notification.controller.d.ts.map