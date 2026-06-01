"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
router.get('/', notification_controller_1.notificationController.getNotifications);
router.get('/unread-count', notification_controller_1.notificationController.getUnreadCount);
router.put('/read-all', notification_controller_1.notificationController.markAllAsRead);
router.put('/:notificationId/read', notification_controller_1.notificationController.markAsRead);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map