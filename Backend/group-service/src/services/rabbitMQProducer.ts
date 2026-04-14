import { getChannel } from '../config/rabbitmq';

export class RabbitMQProducerService {
  /**
   * Helper để gửi sự kiện sang Realtime Service (Socket.io broadcast)
   */
  private async publishToRealtimeService(event: string, payload: { target?: string; room?: string; data: any }): Promise<void> {
    try {
      const realtimePayload = {
        event,
        target: payload.target,
        room: payload.room,
        data: payload.data,
      };
      
      const ch = getChannel();
      // Gửi vào queue 'realtime_events' mà realtime-service đang lắng nghe
      const result = ch.sendToQueue('realtime_events', Buffer.from(JSON.stringify(realtimePayload)), {
        persistent: true
      });
      
      if (result) {
        console.log(`[RabbitMQProducer] SUCCESS: Event '${event}' published to Realtime for ${payload.target || payload.room}. Payload:`, JSON.stringify(realtimePayload));
      } else {
        console.warn(`[RabbitMQProducer] WARNING: Failed to buffer event '${event}' to RabbitMQ. Target: ${payload.target || payload.room}`);
      }
    } catch (error) {
      console.error('[RabbitMQProducer] ERROR: Failed to publish to realtime queue:', error);
    }
  }

  /**
   * Phát sự kiện khi trạng thái ghim thay đổi
   */
  async publishPinUpdated(userId: string, conversationId: string, isPinned: boolean) {
    await this.publishToRealtimeService('CONVERSATION_PIN_UPDATED', {
      target: userId,
      data: { conversationId, isPinned }
    });
  }

  /**
   * Phát sự kiện khi nhãn của hội thoại thay đổi
   */
  async publishLabelUpdated(userId: string, conversationId: string, label: any) {
    await this.publishToRealtimeService('CONVERSATION_LABEL_UPDATED', {
      target: userId,
      data: { conversationId, label }
    });
  }

  /**
   * Phát sự kiện khi hội thoại mới được tạo (Nhóm hoặc Chat 1-1)
   */
  async publishConversationCreated(conversation: any) {
    if (!conversation?.members) return;

    // Phát sự kiện cho từng thành viên trong hội thoại
    for (const member of conversation.members) {
      const memberId = member.userId;
      if (!memberId) continue;

      await this.publishToRealtimeService('CONVERSATION_CREATED', {
        target: memberId.toString(),
        data: conversation
      });
    }
    
    console.log(`[RabbitMQProducer] Event 'CONVERSATION_CREATED' published to all ${conversation.members.length} members for conversation: ${conversation._id}`);
  }

  /**
   * Phát sự kiện khi một người dùng bị gỡ khỏi hội thoại (bị kick, rời nhóm, hoặc giải tán nhóm)
   */
  async publishConversationRemoved(conversationId: string, userId: string) {
    await this.publishToRealtimeService('CONVERSATION_REMOVED', {
      target: userId,
      data: { conversationId }
    });
    
    console.log(`[RabbitMQProducer] Event 'CONVERSATION_REMOVED' published for user: ${userId}, conversation: ${conversationId}`);
  }
}

export default new RabbitMQProducerService();
