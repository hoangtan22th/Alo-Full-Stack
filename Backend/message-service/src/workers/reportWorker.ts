import { Channel } from 'amqplib';
import axios from 'axios';
import { QUEUES, EXCHANGES } from '../config/rabbitmq';
import messageService from '../services/message.service';
import RabbitMQProducerService from '../services/RabbitMQProducerService';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8888';
const GROUP_SERVICE_URL = process.env.GROUP_SERVICE_URL || 'http://127.0.0.1:8082/api/v1/groups';

export function startReportWorker(channel: Channel) {
  console.log(`[ReportWorker] Starting consumer for queue: ${QUEUES.REPORT}`);

  channel.consume(QUEUES.REPORT, async (msg) => {
    if (msg) {
      try {
        const routingKey = msg.fields.routingKey;
        const payload = JSON.parse(msg.content.toString());
        console.log(`[ReportWorker] Received event ${routingKey}`, payload);

        const { targetId, targetType, targetName, action, reason, reporterId } = payload;

        const reasonMap: Record<string, string> = {
          'SPAM': 'Spam/Tin nhắn rác',
          'INAPPROPRIATE_CONTENT': 'Nội dung không phù hợp',
          'HARASSMENT': 'Quấy rối',
          'SCAM': 'Lừa đảo',
          'OTHER': 'Lý do khác'
        };
        const readableReason = reasonMap[reason] || reason;

        if (routingKey === 'report.created') {
          // Send confirmation to reporter
          let conversationId: string;
          try {
            const convoRes = await axios.post(`${GROUP_SERVICE_URL}/direct`, {
              targetUserId: reporterId
            }, {
              headers: { 'X-User-Id': SYSTEM_USER_ID }
            });
            conversationId = (convoRes.data.data || convoRes.data)._id;

            const content = `Hệ thống đã tiếp nhận báo cáo của bạn về "${targetName}". Chúng tôi sẽ xem xét và xử lý trong vòng 7-10 ngày làm việc. Cảm ơn bạn đã góp phần xây dựng cộng đồng an toàn.`;

            const createdMessage = await messageService.createMessage({
              conversationId,
              senderId: SYSTEM_USER_ID,
              senderName: 'Hệ thống Alo Chat',
              type: 'text',
              content,
              metadata: { isSystemGenerated: true, reportEvent: 'CREATED' }
            });

            const messageObj = createdMessage.toObject ? createdMessage.toObject() : createdMessage;
            await RabbitMQProducerService.publishMessageEvent(messageObj as any);
            await RabbitMQProducerService.publishConversationUpdatedEvent({
              conversationId,
              lastMessageId: createdMessage._id.toString(),
              lastMessageTime: new Date(),
              lastMessageContent: content,
              lastSenderId: SYSTEM_USER_ID,
            });
            console.log(`[ReportWorker] Sent confirmation to reporter ${reporterId}`);
          } catch (err) {
            console.error(`[ReportWorker] Failed to send report confirmation:`, err);
          }
        }

        if (routingKey === 'report.resolved') {

          if (action === 'WARN' || action === 'BAN') {
            let targetUserId = targetId;

            // Nếu report nhóm, gửi cho Leader
            if (targetType === 'GROUP') {
              try {
                const groupRes = await axios.get(`${GROUP_SERVICE_URL}/${targetId}`, {
                  headers: { 'X-User-Id': SYSTEM_USER_ID }
                });
                const group = groupRes.data.data || groupRes.data;
                const leader = group.members.find((m: any) => m.role === 'LEADER');
                if (leader) {
                  targetUserId = leader.userId;
                } else {
                  console.warn(`[ReportWorker] No leader found for group ${targetId}`);
                  channel.ack(msg);
                  return;
                }
              } catch (err) {
                console.error(`[ReportWorker] Failed to fetch group info for ${targetId}:`, err);
                channel.ack(msg);
                return;
              }
            }

            // Get or create direct conversation with System User
            let conversationId: string;
            try {
              const convoRes = await axios.post(`${GROUP_SERVICE_URL}/direct`, {
                targetUserId: targetUserId
              }, {
                headers: { 'X-User-Id': SYSTEM_USER_ID }
              });
              conversationId = (convoRes.data.data || convoRes.data)._id;
            } catch (err) {
              console.error(`[ReportWorker] Failed to get system conversation for user ${targetUserId}:`, err);
              channel.ack(msg);
              return;
            }

            // Prepare content
            let content = '';
            if (action === 'WARN') {
              content = targetType === 'GROUP'
                ? `Nhóm "${targetName}" của bạn vừa nhận 1 cảnh cáo từ hệ thống. Lý do: ${readableReason}. Lưu ý: Nếu tiếp tục vi phạm, nhóm sẽ bị giải tán.`
                : `Tài khoản của bạn vừa nhận 1 cảnh cáo từ hệ thống. Lý do: ${readableReason}. Lưu ý: Đủ 3 cảnh cáo tài khoản sẽ bị khóa vĩnh viễn.`;
            } else if (action === 'BAN') {
              content = targetType === 'GROUP'
                ? `Nhóm "${targetName}" của bạn đã bị giải tán/khóa do vi phạm tiêu chuẩn cộng đồng.`
                : `Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm tiêu chuẩn cộng đồng quá nhiều lần.`;
            }

            // Create message
            const createdMessage = await messageService.createMessage({
              conversationId,
              senderId: SYSTEM_USER_ID,
              senderName: 'Hệ thống Alo Chat ✅',
              type: 'text',
              content,
              metadata: { isSystemGenerated: true, reportAction: action }
            });

            const messageObj = createdMessage.toObject ? createdMessage.toObject() : createdMessage;

            // Notify Realtime
            await RabbitMQProducerService.publishMessageEvent(messageObj as any);

            // Update Conversation
            await RabbitMQProducerService.publishConversationUpdatedEvent({
              conversationId,
              lastMessageId: createdMessage._id.toString(),
              lastMessageTime: new Date(),
              lastMessageContent: content,
              lastSenderId: SYSTEM_USER_ID,
            });

            console.log(`[ReportWorker] Successfully sent system message to ${targetUserId}`);
          }
        }
      } catch (error) {
        console.error('[ReportWorker] Error processing message:', error);
      } finally {
        channel.ack(msg);
      }
    }
  });
}
