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

    console.log(`[Group ReportWorker] Waiting for group events in ${GROUP_REPORT_QUEUE}`);

    channel.consume(GROUP_REPORT_QUEUE, async (msg) => {
      if (msg) {
        try {
          const routingKey = msg.fields.routingKey;
          const payload = JSON.parse(msg.content.toString());
          console.log(`[Group ReportWorker] Received event "${routingKey}" with payload:`, JSON.stringify(payload, null, 2));
          
          const { targetId, targetType, targetName, adminNotes } = payload;

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

              if (group.isBanned) {
                console.log(`[Group ReportWorker] Group ${targetId} is banned. Disbanding and notifying all members...`);
                
                const { leaderId: payloadLeaderId, reason } = payload;
                const leader = group.members.find(m => m.role === 'LEADER');
                const leaderId = payloadLeaderId || leader?.userId?.toString();
                const finalTargetName = targetName || group.name || "Nhóm";
                
                console.log(`[Group ReportWorker] Disbanding group. LeaderId: ${leaderId || 'NOT FOUND'}, TargetName: ${finalTargetName}`);

                // 0. Send a permanent System DM to the leader before deleting the group
                if (leaderId) {
                  try {
                    const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
                    const readableReason = reason === 'SCAM_FRAUD' ? 'Lừa đảo, gian lận' : (reason || 'Vi phạm tiêu chuẩn cộng đồng');
                    
                    console.log(`[Group ReportWorker] Attempting to send disband DM to leader ${leaderId} for group "${finalTargetName}" at ${MESSAGE_SERVICE_URL}`);
                    
                    const response = await axios.post(MESSAGE_SERVICE_URL, {
                      targetUserId: leaderId,
                      senderName: 'Hệ thống Alo Chat ✅',
                      content: `Nhóm "${finalTargetName}" của bạn đã bị giải tán do nhận đủ 3 cảnh cáo hệ thống. Lý do: ${readableReason}.`,
                      type: 'text'
                    }, {
                      headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
                    });
                    
                    console.log(`[Group ReportWorker] SUCCESS: Sent permanent disband notification to leader ${leaderId}. MessageId: ${response.data?._id || response.data?.data?._id || 'unknown'}`);
                  } catch (err: any) {
                    console.error(`[Group ReportWorker] ERROR: Failed to send permanent notification to leader:`, {
                      status: err.response?.status,
                      data: err.response?.data,
                      message: err.message,
                      config: { url: err.config?.url, data: err.config?.data }
                    });
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
                    // Give a small delay to ensure message-service worker processed the DM
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
                await group.save();
                // Emit update event to notify all members via Socket.IO (for non-ban updates like warnings)
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
