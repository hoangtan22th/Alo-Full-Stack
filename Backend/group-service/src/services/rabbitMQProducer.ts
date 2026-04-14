import { publishToQueue, ROUTING_KEYS } from '../config/rabbitmq';

export class RabbitMQProducerService {
  /**
   * Phát sự kiện khi trạng thái ghim thay đổi
   */
  async publishPinUpdated(userId: string, conversationId: string, isPinned: boolean) {
    try {
      const payload = {
        type: 'CONVERSATION_PIN_UPDATED',
        data: { userId, conversationId, isPinned },
        timestamp: new Date().toISOString(),
      };
      await publishToQueue(ROUTING_KEYS.CONVERSATION_PIN_UPDATED, payload);
    } catch (error) {
      console.error('[RabbitMQProducer] ERROR:', error);
    }
  }

  /**
   * Phát sự kiện khi nhãn của hội thoại thay đổi
   */
  async publishLabelUpdated(userId: string, conversationId: string, label: any) {
    try {
      const payload = {
        type: 'CONVERSATION_LABEL_UPDATED',
        data: { userId, conversationId, label },
        timestamp: new Date().toISOString(),
      };
      await publishToQueue(ROUTING_KEYS.CONVERSATION_LABEL_UPDATED, payload);
    } catch (error) {
      console.error('[RabbitMQProducer] ERROR:', error);
    }
  }

  /**
   * Phát sự kiện khi hội thoại mới được tạo (Nhóm hoặc Chat 1-1)
   */
  async publishConversationCreated(conversation: any) {
    if (!conversation?.members) return;

    try {
      const payload = {
        type: 'CONVERSATION_CREATED',
        data: conversation,
        timestamp: new Date().toISOString(),
      };
      await publishToQueue(ROUTING_KEYS.CONVERSATION_CREATED, payload);
      console.log(`[RabbitMQProducer] Published CONVERSATION_CREATED: ${conversation._id}`);
    } catch (error) {
      console.error('[RabbitMQProducer] ERROR:', error);
    }
  }

  /**
   * Phát sự kiện khi một người dùng bị gỡ khỏi hội thoại (bị kick, rời nhóm, hoặc giải tán nhóm)
   */
  async publishConversationRemoved(conversationId: string, userId: string) {
    try {
      const payload = {
        type: 'CONVERSATION_REMOVED',
        data: { conversationId, userId },
        timestamp: new Date().toISOString(),
      };
      await publishToQueue(ROUTING_KEYS.CONVERSATION_REMOVED, payload);
    } catch (error) {
      console.error('[RabbitMQProducer] ERROR:', error);
    }
  }
}

export default new RabbitMQProducerService();
