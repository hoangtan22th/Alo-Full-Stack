import messageDataService from '../services/message.service.js';
import { uploadFileToS3 } from '../services/s3Service.js';
import { Types } from 'mongoose';
import rabbitMQProducer from '../services/RabbitMQProducerService.js';
import { MessageEvent } from '../types/events.js';
import { Request, Response, NextFunction } from 'express';

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

/**
 * Send a new message
 */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conversationId, type, content, metadata } = req.body;
    const userId = getUserIdFromHeader(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    if (!conversationId || (!content && type !== 'image' && type !== 'file')) {
      res.status(400).json({ error: 'Missing conversationId or content' });
      return;
    }

    // 1. Lưu vào Database
    const messageDoc = await messageDataService.createMessage({
      conversationId,
      senderId: userId,
      type: type || 'text',
      content: content || '',
      metadata: metadata || {},
    });

    // 2. Chuẩn bị event để bắn sang RabbitMQ
    const messageEvent: MessageEvent = {
      _id: messageDoc._id.toString(),
      conversationId,
      senderId: userId,
      type: messageDoc.type,
      content: messageDoc.content,
      metadata: messageDoc.metadata || {},
      isRead: false,
      createdAt: messageDoc.createdAt,
    };

    // 3. Đẩy sang RabbitMQ cho Realtime Service tiêu thụ
    await rabbitMQProducer.publishMessageEvent(messageEvent);

    // 4. Trả về kết quả cho Client
    res.status(201).json({
      status: 'success',
      data: messageEvent
    });

  } catch (error) {
    console.error('[MessageController] POST sendMessage error:', error);
    next(error);
  }
}

/**
 * Upload a file and create a message
 */
export async function uploadFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conversationId } = req.body;
    const userId = getUserIdFromHeader(req);
    const file = req.file;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized - no user id' });
      return;
    }

    if (!conversationId || !file) {
      res.status(400).json({ error: 'Missing conversationId or file' });
      return;
    }

    // 1. Upload to S3
    const fileUrl = await uploadFileToS3(file.buffer, file.mimetype, file.originalname);

    // 2. Determine message type
    const isImage = file.mimetype.startsWith('image/');
    const type = isImage ? 'image' : 'file';

    // 3. Save to Database
    const messageDoc = await messageDataService.createMessage({
      conversationId,
      senderId: userId,
      type,
      content: fileUrl, // For files, content is the URL
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
      },
    });

    // 4. Prepare event for RabbitMQ
    const messageEvent: MessageEvent = {
      _id: messageDoc._id.toString(),
      conversationId,
      senderId: userId,
      type: messageDoc.type,
      content: messageDoc.content,
      metadata: messageDoc.metadata || {},
      isRead: false,
      createdAt: messageDoc.createdAt,
    };

    // 5. Publish to RabbitMQ
    await rabbitMQProducer.publishMessageEvent(messageEvent);

    // 4. Trả về kết quả cho Client
    res.status(201).json({
      status: 'success',
      data: messageEvent
    });

  } catch (error) {
    console.error('[MessageController] POST uploadFile error:', error);
    next(error);
  }
}

/**
 * Đánh dấu đã xem tất cả tin nhắn trong một cuộc hội thoại
 */
export async function markMessagesAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!conversationId) {
      res.status(400).json({ status: 'error', message: 'Thiếu conversationId' });
      return;
    }

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const modifiedCount = await messageDataService.markConversationAsRead(conversationId, userId);

    // Gửi sự kiện qua RabbitMQ để realtime-service báo cho đối phương (người gửi)
    if (modifiedCount > 0) {
      await rabbitMQProducer.publishMessageReadEvent({
        conversationId,
        userId,
        readAt: new Date()
      });
    }

    res.status(200).json({
      status: 'success',
      data: { modifiedCount }
    });
  } catch (error) {
    console.error('[MessageController] PATCH markMessagesAsRead error:', error);
    next(error);
  }
}

/**
 * Thả cảm xúc hoặc tăng số lượng (Spam)
 */
export async function reactToMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = getUserIdFromHeader(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!messageId || !emoji) {
      res.status(400).json({ error: 'Missing messageId or emoji' });
      return;
    }

    const updatedMessage = await messageDataService.addReaction(messageId, userId, emoji);
    
    if (updatedMessage) {
      // Bắn sự kiện realtime
      await rabbitMQProducer.publishReactionUpdateEvent({
        messageId,
        conversationId: updatedMessage.conversationId.toString(),
        reactions: updatedMessage.reactions
      });
    }

    res.json({
      status: 'success',
      data: updatedMessage?.reactions || []
    });
  } catch (error) {
    console.error('[MessageController] POST reactToMessage error:', error);
    next(error);
  }
}

/**
 * Xóa toàn bộ cảm xúc của user trên tin nhắn
 */
export async function clearReactions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedMessage = await messageDataService.clearReactions(messageId, userId);

    if (updatedMessage) {
      // Bắn sự kiện realtime
      await rabbitMQProducer.publishReactionUpdateEvent({
        messageId,
        conversationId: updatedMessage.conversationId.toString(),
        reactions: updatedMessage.reactions
      });
    }

    res.json({
      status: 'success',
      data: updatedMessage?.reactions || []
    });
  } catch (error) {
    console.error('[MessageController] DELETE clearReactions error:', error);
    next(error);
  }
}