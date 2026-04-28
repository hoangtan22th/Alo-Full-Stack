// src/workers/reportWorker.ts
import { Channel } from 'amqplib';
import axios from 'axios';
import Conversation from '../models/Conversation';
import rabbitMQProducer from '../services/rabbitMQProducer';

const ADMIN_EXCHANGE = 'admin.exchange';
const GROUP_REPORT_QUEUE = 'group_report_queue';

export async function startReportWorker(channel: Channel) {
  try {
    await channel.assertExchange(ADMIN_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(GROUP_REPORT_QUEUE, { durable: true });
    
    // Bind for both warned and banned events
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'user.warned');
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'user.banned');
    // CATCH-ALL debug binding
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, '#');

    console.log(`[Group ReportWorker] Waiting for group events in ${GROUP_REPORT_QUEUE}`);

    channel.consume(GROUP_REPORT_QUEUE, async (msg) => {
      if (msg) {
        try {
          const routingKey = msg.fields.routingKey;
          const payload = JSON.parse(msg.content.toString());
          console.log(`[Group ReportWorker] Received event "${routingKey}" with payload:`, JSON.stringify(payload, null, 2));
          
          const { targetId, targetType, targetName } = payload;

          if (targetType === 'GROUP') {
            const group = await Conversation.findById(targetId);
            if (group) {
              if (routingKey === 'user.warned') {
                group.warningCount = (group.warningCount || 0) + 1;
                console.log(`[Group ReportWorker] Group ${targetId} warning count: ${group.warningCount}`);
                
                if (group.warningCount >= 3) {
                  console.log(`[Group ReportWorker] Group ${targetId} reached 3 strikes. Banning...`);
                  group.isBanned = true;
                }
              } else if (routingKey === 'user.banned') {
                group.isBanned = true;
                console.log(`[Group ReportWorker] Group ${targetId} banned manually.`);
              }

              const { leaderId: payloadLeaderId, reason } = payload;
              const leader = group.members.find(m => m.role === 'LEADER');
              const leaderId = payloadLeaderId || leader?.userId?.toString();
              const finalTargetName = targetName || group.name || "Nhóm";
              
              const reasonMap: Record<string, string> = {
                'SPAM_HARRASSMENT': 'Spam/Quấy rối',
                'CHILD_ABUSE': 'Bảo vệ trẻ em',
                'SEXUAL_CONTENT': 'Nội dung khiêu dâm',
                'VIOLENCE_TERRORISM': 'Bạo lực/Khủng bố',
                'SCAM_FRAUD': 'Lừa đảo/Gian lận',
                'HATE_SPEECH': 'Ngôn từ thù ghét',
              };
              const readableReason = reasonMap[reason] || reason || 'Vi phạm tiêu chuẩn cộng đồng';
              const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';

              if (group.isBanned) {
                console.log(`[Group ReportWorker] Group ${targetId} is banned. Disbanding and notifying all members...`);
                console.log(`[Group ReportWorker] Disbanding group. LeaderId: ${leaderId || 'NOT FOUND'}, TargetName: ${finalTargetName}`);

                // 0. Send a permanent System DM to the leader before deleting the group
                if (leaderId) {
                  try {
                    console.log(`[Group ReportWorker] Attempting to send disband DM to leader ${leaderId} for group "${finalTargetName}" at ${MESSAGE_SERVICE_URL}`);
                    
                    const isStrikeBan = group.warningCount >= 3;
                    const notificationContent = isStrikeBan
                      ? `Nhóm "${finalTargetName}" của bạn đã bị giải tán do nhận đủ 3 cảnh cáo hệ thống. Lý do: ${readableReason}.`
                      : `Nhóm "${finalTargetName}" của bạn đã bị giải tán/khóa do vi phạm tiêu chuẩn cộng đồng. Lý do: ${readableReason}.`;

                    const response = await axios.post(MESSAGE_SERVICE_URL, {
                      targetUserId: leaderId,
                      senderName: 'Hệ thống Alo Chat ✅',
                      content: notificationContent,
                      type: 'text'
                    }, {
                      headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
                    });
                    
                    console.log(`[Group ReportWorker] SUCCESS: Sent permanent disband notification to leader ${leaderId}. MessageId: ${response.data?._id || response.data?.data?._id || 'unknown'}`);
                  } catch (err: any) {
                    console.error(`[Group ReportWorker] ERROR: Failed to send permanent notification to leader:`, err.message);
                  }
                }

                // 1. Notify all members (EXCEPT leader for now) to remove the group from UI
                if (group.members && group.members.length > 0) {
                  for (const member of group.members) {
                    const memberId = member.userId?.toString();
                    if (memberId && memberId !== leaderId) {
                      try {
                        await rabbitMQProducer.publishConversationRemoved(targetId, memberId, finalTargetName, 'delete');
                        console.log(`[Group ReportWorker] Notified removal to member ${memberId}`);
                      } catch (err) {
                        console.error(`[Group ReportWorker] Error notifying member ${memberId}:`, err);
                      }
                    }
                  }
                }

                // 2. Notify the LEADER LAST to remove the group from UI
                if (leaderId) {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await rabbitMQProducer.publishConversationRemoved(targetId, leaderId, finalTargetName, 'delete');
                    console.log(`[Group ReportWorker] Notified removal to leader ${leaderId} (LAST)`);
                  } catch (err) {
                    console.error(`[Group ReportWorker] Error notifying leader ${leaderId}:`, err);
                  }
                }
                
                // 3. Finally delete the group
                await Conversation.findByIdAndDelete(targetId);
                console.log(`[Group ReportWorker] Group ${targetId} permanently deleted.`);
              } else {
                // NOT BANNED (1st or 2nd warning)
                if (leaderId && routingKey === 'user.warned') {
                  try {
                    await axios.post(MESSAGE_SERVICE_URL, {
                      targetUserId: leaderId,
                      senderName: 'Hệ thống Alo Chat ✅',
                      content: `Nhóm "${finalTargetName}" của bạn vừa nhận 1 cảnh cáo từ hệ thống. Lý do: ${readableReason}. Lưu ý: Nếu tiếp tục vi phạm, nhóm sẽ bị giải tán.`,
                      type: 'text'
                    }, {
                      headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
                    });
                    console.log(`[Group ReportWorker] Sent warning notification to leader ${leaderId} for strike ${group.warningCount}`);
                  } catch (err: any) {
                    console.error(`[Group ReportWorker] Failed to send warning notification:`, err.message);
                  }
                }
                
                await group.save();
                rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
              }
            }
          }
        } catch (err) {
          console.error('[Group ReportWorker] Error processing message:', err);
        } finally {
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    console.error('[Group ReportWorker] Failed to start:', error);
  }
}
