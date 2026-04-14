import { publishToQueue, ROUTING_KEYS, getChannel } from "../config/rabbitmq";
import { MessageEvent, PresenceEvent, MessageReadEvent } from "../types/events";

/**
 *Bước 3 (Class này - The Producer): Sau khi MongoDB báo "Đã lưu xong", handler sẽ
  gọi rabbitMQProducer.publishMessageEvent.
  Nhiệm vụ của Class này: Đóng gói cái tin nhắn vừa lưu đó vào một chiếc "bao thư" (payload)
 và quăng nó vào "thùng thư" (RabbitMQ Queue). Xong!
 */
export class RabbitMQProducerService {
  /**
   * Publish sự kiện tin nhắn mới lên Message Broker (Exchange: chat_exchange)
   * Các Client / Service khác tực subscribe để nhận.
   */
  async publishMessageEvent(messageData: MessageEvent): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_CREATED", // Tên business event tĩnh
        data: messageData,
        timestamp: new Date().toISOString(),
      };

      // Bắn 1 LẦN DUY NHẤT LÊN TOPIC EXCHANGE, KHÔNG QUAN TÂM AI NHẬN
      await publishToQueue(ROUTING_KEYS.MESSAGE_CREATED, payload);
      console.log(
        `[RabbitMQProducer] Published MESSAGE_CREATED: ${messageData._id}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish message event:",
        error,
      );
    }
  }

  /**
   * Gửi thông báo khi nội dung tin nhắn bị sửa đổi (đã chỉnh sửa).
   */
  async publishMessageUpdateEvent(messageData: MessageEvent): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_UPDATED",
        data: messageData,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_UPDATED, payload);
      console.log(
        `[RabbitMQProducer] Message update event published: ${messageData._id}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish message update event:",
        error,
      );
    }
  }

  /**
   * Báo cho các client xóa bỏ tin nhắn khỏi màn hình chat khi có lệnh xóa.
   */
  async publishMessageDeletedEvent(
    messageId: string,
    conversationId: string,
  ): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_DELETED",
        data: { messageId, conversationId },
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_DELETED, payload);
      console.log(
        `[RabbitMQProducer] Message deleted event published: ${messageId}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish message deleted event:",
        error,
      );
    }
  }

  /**
   * Đồng bộ trạng thái "Đã xem" để đối phương thấy tích xanh hoặc thông báo.
   */
  async publishMessageReadEvent(readEvent: MessageReadEvent): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_READ",
        data: readEvent,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_READ, payload);
      console.log(
        `[RabbitMQProducer] Message read event published on Exchange`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish message read event:",
        error,
      );
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
        type: "CONVERSATION_UPDATED",
        data: conversationData,
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.CONVERSATION_UPDATED, payload);
      console.log(
        `[RabbitMQProducer] Conversation updated event published: ${conversationData.conversationId}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish conversation updated event:",
        error,
      );
      // Don't throw - allow app to continue even if RabbitMQ is down
    }
  }

  /**
   * Đồng bộ cập nhật cảm xúc tới Broker
   */
  async publishReactionUpdateEvent(data: {
    messageId: string;
    conversationId: string;
    reactions: any[];
  }): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_REACTION_UPDATED",
        data: {
          messageId: data.messageId,
          conversationId: data.conversationId,
          reactions: data.reactions,
        },
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_REACTION, payload);
      console.log(
        `[RabbitMQProducer] Reaction update event published: ${data.messageId}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish reaction update event:",
        error,
      );
    }
  }

  /**
   * Đồng bộ sự kiện THU HỒI tin nhắn tới Broker
   */
  async publishMessageRevokedEvent(data: {
    messageId: string;
    conversationId: string;
  }): Promise<void> {
    try {
      const payload = {
        type: "MESSAGE_REVOKED",
        data: {
          messageId: data.messageId,
          conversationId: data.conversationId,
          isRevoked: true,
          revokedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await publishToQueue(ROUTING_KEYS.MESSAGE_REVOKED, payload);
      console.log(
        `[RabbitMQProducer] Message revoked event published: ${data.messageId}`,
      );
    } catch (error) {
      console.error(
        "[RabbitMQProducer] Failed to publish message revoked event:",
        error,
      );
    }
  }
}

export default new RabbitMQProducerService();
