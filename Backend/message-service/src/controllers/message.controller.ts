import { Request, Response, NextFunction } from 'express';
import messageDataService from '../services/message.service.js';

/**
 * Extract userId from x-user-id header (set by Gateway)
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' ? userId : null;
}

/**
 * Get message history for a conversation
 */
export async function getMessageHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conversationId } = req.params;

    // Typeof Check: Đảm bảo conversationId là string
    if (typeof conversationId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing conversationId' });
      return;
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const skip = Math.max(parseInt(req.query.skip as string) || 0, 0);
    const userId = getUserIdFromHeader(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    const messages = await messageDataService.getMessageHistory(conversationId, userId, limit, skip);

    res.json({
      conversationId,
      messages,
      count: messages.length,
      limit,
      skip,
    });
  } catch (error) {
    console.error('[MessageController] GET history error:', error);
    next(error);
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof conversationId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing conversationId' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    const count = await messageDataService.getUnreadCount(conversationId, userId);

    res.json({
      conversationId,
      unreadCount: count,
    });
  } catch (error) {
    console.error('[MessageController] GET unread-count error:', error);
    next(error);
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing messageId' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    await messageDataService.markAsRead([messageId], userId);

    res.json({
      status: 'success',
      messageId,
    });
  } catch (error) {
    console.error('[MessageController] PUT read error:', error);
    next(error);
  }
}

/**
 * Edit message
 */
export async function editMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing messageId' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    if (typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ error: 'Content must be a non-empty string' });
      return;
    }

    const isOwner = await messageDataService.isMessageOwner(messageId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Forbidden - you are not the message owner' });
      return;
    }

    const updated = await messageDataService.editMessage(messageId, content);

    res.json({
      status: 'success',
      message: updated,
    });
  } catch (error) {
    console.error('[MessageController] PUT edit error:', error);
    next(error);
  }
}

/**
 * Delete message (soft delete)
 * Dùng cho thu hồi tin nhắn (xóa ở mọi người)
 */
export async function deleteMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing messageId' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    const isOwner = await messageDataService.isMessageOwner(messageId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Forbidden - you are not the message owner' });
      return;
    }

    await messageDataService.revokeMessage(messageId);

    res.json({
      status: 'success',
      messageId,
    });
  } catch (error) {
    console.error('[MessageController] DELETE error:', error);
    next(error);
  }
}