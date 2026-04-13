import { Socket } from 'socket.io';
import axios from 'axios'; // Đảm bảo bạn đã cài axios: npm install axios
import messageDataService from '../services/message.service';
import rabbitMQProducer from '../services/RabbitMQProducerService';
import { MessageEvent, MessageReadEvent } from '../types/events';

/**
 * Cấu hình URL nội bộ cho Group Service
 */
const GROUP_SERVICE_INTERNAL_URL = process.env.GROUP_SERVICE_URL;

/**
 * Khai báo Augmentation để sử dụng socket.userId chính thống
 */
declare module 'socket.io' {
  interface Socket {
    userId: string;
  }
}

console.log("LOOK AT" , GROUP_SERVICE_INTERNAL_URL)
/**
 * Helper: Kiểm tra quyền thành viên trong Group thông qua API nội bộ
 * 
 * Group-service không có endpoint verify membership riêng.
 * Ta gọi GET /api/v1/groups/:groupId để lấy members array,
 * rồi check userid có trong đó không.
 * 
 * Tin tưởng x-user-id từ api-gateway đã xác thực.
 */
async function checkGroupMembership(conversationId: string, userId: string, socket: Socket): Promise<boolean> {
  try {
    // Gọi Group-service lấy thông tin group (no auth required, returns members array)
    const response = await axios.get(
      `${GROUP_SERVICE_INTERNAL_URL}/${conversationId}`,
      {
        headers: { 'x-user-id': userId },
        timeout: 2000
      }
    );

    // Check nếu userId có trong members array
    const group = response.data?.data; // response có cấu trúc { data: { members: [...] } }
    if (!group || !group.members) {
      console.warn(`[InternalCheck] Group not found or no members: ${conversationId}`);
      return false;
    }

    const isMember = group.members.some(
      (m: any) => m.userId === userId || m.userId?.toString() === userId
    );
    
    if (!isMember) {
      console.warn(`[InternalCheck] User ${userId} is not a member of ${conversationId}`);
    }

    return isMember;
  } catch (error: any) {
    console.error(`[InternalCheck] Error checking membership: ${error.response?.status || error.code} - ${error.message}`);
    return false;
  }
}

/**
 * Hàm khởi tạo kết nối
 */
export async function handleConnect(socket: Socket): Promise<void> {
  const userId = socket.userId;

  if (!userId) {
    console.warn(`[MessageHandlers] Rejecting connection: Missing userId on socket ${socket.id}`);
    socket.disconnect();
    return;
  }

  console.log(`[MessageHandlers] User connected: ${userId}`);

  socket.on('join-room', (data) => handleJoinRoom(socket, userId, data));
  socket.on('send-message', (data) => handleSendMessage(socket, userId, data));
  socket.on('message-read', (data) => handleMessageRead(socket, userId, data));
  socket.on('leave-room', (data) => handleLeaveRoom(socket, userId, data));
  
  socket.on('disconnect', () => {
    console.log(`[MessageHandlers] User disconnected: ${userId}`);
  });
}

/**
 * Xử lý khi người dùng vào một cuộc hội thoại (Room)
 */
export async function handleJoinRoom(
  socket: Socket,
  userId: string,
  data: { conversationId: string }
): Promise<void> {
  try {
    const { conversationId } = data;
    if (!conversationId) return;

    // Xác minh quyền tham gia bằng ID
    const isMember = await checkGroupMembership(conversationId, userId, socket);
    
    if (!isMember) {
      socket.emit('error', { message: 'Access denied: You are not a member of this group' });
      return;
    }

    socket.join(conversationId);
    console.log(`[MessageHandlers] User ${userId} joined room: ${conversationId}`);

    // Trả về lịch sử tin nhắn
    const messages = await messageDataService.getMessageHistory(conversationId, 50, 0);
    socket.emit('message-history', { conversationId, messages, count: messages.length });
    
  } catch (error) {
    socket.emit('error', { message: 'Failed to join conversation' });
  }
}

/**
 * Xử lý gửi tin nhắn mới
 */
export async function handleSendMessage(
  socket: Socket,
  userId: string,
  data: {
    conversationId: string;
    type: string;
    content: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const { conversationId, type, content, metadata } = data;
    
    if (!conversationId || !content) {
      socket.emit('error', { message: 'Missing conversationId or content' });
      return;
    }

    // Check quyền gửi (Internal Authorization)
    const isMember = await checkGroupMembership(conversationId, userId, socket);
    if (!isMember) {
      socket.emit('error', { message: 'Forbidden: Cannot send message to this group' });
      return;
    }

    const messageDoc = await messageDataService.createMessage({
      conversationId,
      senderId: userId,
      type: type || 'text',
      content,
      metadata: metadata || {},
    });

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

    // Đẩy message sang các instance khác qua RabbitMQ
    await rabbitMQProducer.publishMessageEvent(messageEvent);
    
    // Ack cho sender
    socket.emit('send-message-ack', { messageId: messageDoc._id, conversationId });

  } catch (error) {
    console.error('[MessageHandlers] Error in handleSendMessage:', error);
    socket.emit('error', { message: 'Failed to process message' });
  }
}

/**
 * Xử lý đánh dấu đã xem
 */
export async function handleMessageRead(
  socket: Socket,
  userId: string,
  data: { conversationId: string; messageIds: string[] }
): Promise<void> {
  try {
    const { conversationId, messageIds } = data;
    if (!conversationId || !messageIds?.length) return;

    await messageDataService.markAsRead(messageIds, userId);

    const readEvent: MessageReadEvent = {
      messageIds,
      messageId: messageIds[0],
      conversationId,
      userId,
      timestamp: new Date(),
    };

    await rabbitMQProducer.publishMessageReadEvent(readEvent);
    socket.emit('message-read-ack', { conversationId, messageIds });
  } catch (error) {
    console.error('[MessageHandlers] Error in handleMessageRead:', error);
  }
}

/**
 * Xử lý khi rời phòng
 */
export async function handleLeaveRoom(
  socket: Socket,
  userId: string,
  data: { conversationId: string }
): Promise<void> {
  try {
    const { conversationId } = data;
    socket.leave(conversationId);
    console.log(`[MessageHandlers] User ${userId} left room: ${conversationId}`);
  } catch (error) {
    console.error('[MessageHandlers] Error in handleLeaveRoom:', error);
  }
}