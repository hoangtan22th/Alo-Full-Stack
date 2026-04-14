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
}

export default new RabbitMQProducerService();
