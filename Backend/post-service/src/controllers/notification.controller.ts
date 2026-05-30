import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' ? userId : null;
}

export class NotificationController {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại
   */
  public async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const notifications = await notificationService.getNotifications(userId, limit, skip);
      res.status(200).json({ status: 200, data: notifications });
    } catch (error: any) {
      console.error('[NotificationController] Error fetching notifications:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Đánh dấu một thông báo là đã đọc
   */
  public async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const notification = await notificationService.markAsRead(notificationId as string, userId);
      if (!notification) {
        res.status(404).json({ status: 404, message: 'Thông báo không tồn tại hoặc không có quyền' });
        return;
      }

      res.status(200).json({ status: 200, data: notification });
    } catch (error: any) {
      console.error('[NotificationController] Error marking notification as read:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
   */
  public async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      await notificationService.markAllAsRead(userId);
      res.status(200).json({ status: 200, message: 'Đã đánh dấu đọc tất cả thông báo' });
    } catch (error: any) {
      console.error('[NotificationController] Error marking all notifications as read:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy số lượng thông báo chưa đọc của người dùng hiện tại
   */
  public async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const count = await notificationService.getUnreadCount(userId);
      res.status(200).json({ status: 200, data: { unreadCount: count } });
    } catch (error: any) {
      console.error('[NotificationController] Error counting unread notifications:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;
