import { Channel } from 'amqplib';
import { QUEUES } from '../config/rabbitmq';
import messageService from '../services/message.service';
import RabbitMQProducerService from '../services/RabbitMQProducerService';

export function startPollWorker(channel: Channel) {
  console.log(`[PollWorker] Starting consumer for queue: ${QUEUES.POLL}`);
  channel.consume(QUEUES.POLL, async (msg) => {
    if (msg) {
      try {
        const routingKey = msg.fields.routingKey;
        if (routingKey.startsWith('poll.')) {
          const payload = JSON.parse(msg.content.toString());
          console.log(`[PollWorker] Received event ${routingKey}`, payload);

          if (routingKey === 'poll.created') {
            const { conversationId, creatorId, pollId, question, type } = payload;
            
            // Create a message in DB
            const createdMessage = await messageService.createMessage({
              conversationId,
              senderId: creatorId,
              type: type || 'poll',
              content: question || 'Bình chọn mới',
              metadata: { pollId }
            });

            // Convert to plain object for event publishing (important for ID strings)
            const messageObj = createdMessage.toObject ? createdMessage.toObject() : createdMessage;

            // Sau khi lưu message, gọi Producer để đẩy qua Realtime Service (cho các client nhận được tin nhắn System dạng poll)
            await RabbitMQProducerService.publishMessageEvent(messageObj as any);

            // Cập nhật lại cuộc trò chuyện báo có tin nhắn mới
            await RabbitMQProducerService.publishConversationUpdatedEvent({
              conversationId,
              lastMessageId: createdMessage._id.toString(),
              lastMessageTime: new Date(),
              lastMessageContent: 'Bình chọn: ' + (question || 'Bình chọn mới'),
              lastSenderId: creatorId,
            });
            console.log(`[PollWorker] Successfully processed ${routingKey} and created Message ${createdMessage._id}`);
          }
        }
      } catch (error) {
        console.error('[PollWorker] Error processing message:', error);
      } finally {
        channel.ack(msg);
      }
    }
  });
}
