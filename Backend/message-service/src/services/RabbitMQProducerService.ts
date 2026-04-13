import { publishToQueue, ROUTING_KEYS } from '../config/rabbitmq';
import { MessageEvent, PresenceEvent, MessageReadEvent } from '../types/events';

/**
 *Bước 3 (Class này - The Producer): Sau khi MongoDB báo "Đã lưu xong", handler sẽ
  gọi rabbitMQProducer.publishMessageEvent.
  Nhiệm vụ của Class này: Đóng gói cái tin nhắn vừa lưu đó vào một chiếc "bao thư" (payload)
 và quăng nó vào "thùng thư" (RabbitMQ Queue). Xong!
 */
export class RabbitMQProducerService {
  /**
   * Đồng bộ tin nhắn mới giữa các server socket để người nhận thấy tin nhắn ngay lập tức.
   */
  async publishMessageEvent(messageData: MessageEvent): Promise<void> {
    try {
      const payload = {
        type: 'message.created',
        data: messageData,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_CREATED, payload);
      console.log(`[RabbitMQProducer] Message event published: ${messageData._id}`);
    } catch (error) {
      console.error('[RabbitMQProducer] Failed to publish message event:', error);
      // Don't throw - allow app to continue even if RabbitMQ is down
    }
  }

  /**
   * Gửi thông báo khi nội dung tin nhắn bị sửa đổi (đã chỉnh sửa).
   */
  async publishMessageUpdateEvent(messageData: MessageEvent): Promise<void> {
    try {
      const payload = {
        type: 'message.updated',
        data: messageData,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_UPDATED, payload);
      console.log(`[RabbitMQProducer] Message update event published: ${messageData._id}`);
    } catch (error) {
      console.error('[RabbitMQProducer] Failed to publish message update event:', error);
    }
  }

  /**
   * Báo cho các client xóa bỏ tin nhắn khỏi màn hình chat khi có lệnh xóa.
   */
  async publishMessageDeletedEvent(messageId: string, conversationId: string): Promise<void> {
    try {
      const payload = {
        type: 'message.deleted',
        data: { messageId, conversationId },
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_DELETED, payload);
      console.log(`[RabbitMQProducer] Message deleted event published: ${messageId}`);
    } catch (error) {
      console.error('[RabbitMQProducer] Failed to publish message deleted event:', error);
    }
  }

  
  /**
   * Đồng bộ trạng thái "Đã xem" để đối phương thấy tích xanh hoặc thông báo.
   */
  async publishMessageReadEvent(readEvent: MessageReadEvent): Promise<void> {
    try {
      const payload = {
        type: 'message.read',
        data: readEvent,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_READ, payload);
      console.log(`[RabbitMQProducer] Message read event published`);
    } catch (error) {
      console.error('[RabbitMQProducer] Failed to publish message read event:', error);
    }
  }

  /**
   * Cập nhật tin nhắn mới nhất (Last Message) và thời gian 
   * lên danh sách hội thoại của group-service
   */
  async publishConversationUpdatedEvent(conversationData: {
    conversationId: string;
    lastMessageId: string;
    lastMessageTime: Date;
    lastMessageContent: string;
    lastSenderId: string;
  }): Promise<void> {
    try {
      const payload = {
        type: 'conversation.updated',
        data: conversationData,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.CONVERSATION_UPDATED, payload);
      console.log(`[RabbitMQProducer] Conversation updated event published: ${conversationData.conversationId}`);
    } catch (error) {
      console.error('[RabbitMQProducer] Failed to publish conversation updated event:', error);
      // Don't throw - allow app to continue even if RabbitMQ is down
    }
  }
}

export default new RabbitMQProducerService();
