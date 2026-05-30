import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
const router = Router();
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:notificationId/read', notificationController.markAsRead);
export default router;
//# sourceMappingURL=notification.routes.js.map