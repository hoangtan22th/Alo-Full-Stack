import { Router, Request, Response, NextFunction } from 'express';
import * as messageController from '../controllers/message.controller.js';

const messageRouter = Router();

// Định nghĩa Base Path tập trung tại đây
const BASE_PATH = '/api/v1/messages';

/**
 * Middleware to extract userId from headers
 * API Gateway has already validated the request
 * Just extract x-user-id that Gateway provides
 */
const extractUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  (req as any).userId = userId;
  next();
};

messageRouter.use(extractUserId);

/**
 * GET ${BASE_PATH}/:conversationId
 * Get message history for a conversation (paginated)
 */
messageRouter.get(`${BASE_PATH}/:conversationId`, messageController.getMessageHistory);

/**
 * GET ${BASE_PATH}/:conversationId/unread-count
 * Get unread message count
 */
messageRouter.get(`${BASE_PATH}/:conversationId/unread-count`, messageController.getUnreadCount);

/**
 * PUT ${BASE_PATH}/:messageId/read
 * Mark message as read
 */
messageRouter.put(`${BASE_PATH}/:messageId/read`, messageController.markAsRead);

/**
 * PUT ${BASE_PATH}/:messageId
 * Edit message
 */
messageRouter.put(`${BASE_PATH}/:messageId`, messageController.editMessage);

/**
 * DELETE ${BASE_PATH}/:messageId
 * Delete message (soft delete)
 */
messageRouter.delete(`${BASE_PATH}/:messageId`, messageController.deleteMessage);

export default messageRouter;