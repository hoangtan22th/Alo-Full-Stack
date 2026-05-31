import { Channel } from 'amqplib';
import axios from 'axios';
import messageService from '../services/message.service';
import RabbitMQProducerService from '../services/RabbitMQProducerService';

const SYSTEM_USER_ID = '11111111-1111-1111-1111-111111111111'; // Security Bot ID
const GROUP_SERVICE_URL = process.env.GROUP_SERVICE_URL || 'http://127.0.0.1:8082/api/v1/groups';

export function startSecurityWorker(channel: Channel) {
  const SECURITY_QUEUE = 'message_security_queue';
  console.log(`[SecurityWorker] Starting consumer for queue: ${SECURITY_QUEUE}`);

  channel.consume(SECURITY_QUEUE, async (msg) => {
    if (msg) {
      try {
        const routingKey = msg.fields.routingKey;
        const payload = JSON.parse(msg.content.toString());
        console.log(`[SecurityWorker] Received event ${routingKey}`, payload);

        if (routingKey === 'security.alert') {
          const { userId, message } = payload;
          if (!userId || !message) {
            return;
          }

          let conversationId: string;
          try {
            // Lấy hội thoại 1-1 với Security Bot
            const convoRes = await axios.post(`${GROUP_SERVICE_URL}/direct`, {
              targetUserId: userId
            }, {
              headers: { 'X-User-Id': SYSTEM_USER_ID } // Gửi request với tư cách Security Bot
            });
            conversationId = (convoRes.data.data || convoRes.data)._id;

            const createdMessage = await messageService.createMessage({
              conversationId,
              senderId: SYSTEM_USER_ID,
              senderName: 'Security Bot',
              type: 'text',
              content: message,
              metadata: { isSystemGenerated: true, securityEvent: 'ALERT' }
            });

            const messageObj = createdMessage.toObject ? createdMessage.toObject() : createdMessage;
            
            // Đẩy lên Realtime Service
            await RabbitMQProducerService.publishMessageEvent(messageObj as any);
            
            // Cập nhật Conversation
            await RabbitMQProducerService.publishConversationUpdatedEvent({
              conversationId,
              lastMessageId: createdMessage._id.toString(),
              lastMessageTime: new Date(),
              lastMessageContent: message,
              lastSenderId: SYSTEM_USER_ID,
            });
            console.log(`[SecurityWorker] Sent security alert to user ${userId}`);
          } catch (err) {
            console.error(`[SecurityWorker] Failed to send security alert:`, err);
          }
        }
      } catch (error) {
        console.error('[SecurityWorker] Error processing message:', error);
      } finally {
        channel.ack(msg);
      }
    }
  });
}
