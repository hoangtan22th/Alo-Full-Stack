// src/workers/reportWorker.ts
import { Channel } from 'amqplib';
import axios from 'axios';
import Conversation from '../models/Conversation';
import rabbitMQProducer from '../services/rabbitMQProducer';
import groupService from '../services/groupService';

const ADMIN_EXCHANGE = 'admin.exchange';
const GROUP_REPORT_QUEUE = 'group_report_queue';

export async function startReportWorker(channel: Channel) {
  try {
    await channel.assertExchange(ADMIN_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(GROUP_REPORT_QUEUE, { durable: true });

    // Bind for new group-specific moderation events
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'group.warned');
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'group.banned');
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'group.disbanded');
    
    // Maintain legacy bindings for safety (optional)
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'user.warned');
    await channel.bindQueue(GROUP_REPORT_QUEUE, ADMIN_EXCHANGE, 'user.banned');

    console.log(`[Group ReportWorker] Waiting for group moderation events in ${GROUP_REPORT_QUEUE}`);

    channel.consume(GROUP_REPORT_QUEUE, async (msg) => {
      if (msg) {
        try {
          const routingKey = msg.fields.routingKey;
          const payload = JSON.parse(msg.content.toString());
          console.log(`[Group ReportWorker] Received event "${routingKey}"`, payload);

          const targetType = payload.targetType || payload.target_type || (routingKey.startsWith('group.') ? 'GROUP' : 'USER');
          const targetId = payload.targetId || payload.target_id || payload.groupId || payload.group_id;
          const groupId = payload.groupId || payload.group_id || (targetType === 'GROUP' ? targetId : null);

          if (targetType === 'USER' && !groupId) {
            console.log(`[Group ReportWorker] Global User moderation (${routingKey}) for User ${targetId}. Skipping group-specific logic.`);
            return;
          }

          if (!groupId) {
            console.warn("[Group ReportWorker] Missing groupId in payload for group-specific moderation");
            return;
          }

          const group = await Conversation.findById(groupId);
          if (!group) {
            console.warn(`[Group ReportWorker] Group ${groupId} not found`);
            return;
          }

          const { adminNotes, reason, resolvedBy } = payload;
          const reasonMap: Record<string, string> = {
            'SPAM': 'Spam/Tin nhắn rác',
            'INAPPROPRIATE_CONTENT': 'Nội dung không phù hợp',
            'HARASSMENT': 'Quấy rối',
            'SCAM': 'Lừa đảo',
            'OTHER': 'Lý do khác'
          };
          const readableReason = reasonMap[reason] || reason || 'Vi phạm tiêu chuẩn';

          const leader = group.members.find(m => m.role === 'LEADER');
          const leaderId = leader?.userId;
          const groupName = group.name || payload.groupName || "Nhóm";

          let shouldNotifyLeader = false;
          let notificationMessage = "";

          // Logic based on routing key
          if (routingKey === 'group.warned' || routingKey === 'user.warned') {
            if (targetType === 'GROUP') {
              group.warningCount = (group.warningCount || 0) + 1;
              console.log(`[Group ReportWorker] Group ${groupId} warning count: ${group.warningCount}`);
              
              shouldNotifyLeader = true;
              notificationMessage = `Nhóm "${groupName}" của bạn vừa nhận 1 cảnh cáo từ hệ thống. Lý do: ${readableReason}.`;

              if (group.warningCount >= 3) {
                console.log(`[Group ReportWorker] Group ${groupId} reached 3 strikes. Setting to READ_ONLY...`);
                group.status = 'READ_ONLY';
                notificationMessage += " Do nhận đủ 3 cảnh cáo, nhóm đã bị khóa hoạt động (chỉ đọc).";
                await rabbitMQProducer.publishGroupBanned(groupId, 'READ_ONLY');
              }
            } else {
              // USER WARNED within a group
              console.log(`[Group ReportWorker] User ${targetId} warned within group ${groupId}.`);
              // Optionally: Add user to a "warned members" list in the group or just notify
            }
          } 
          else if (routingKey === 'group.banned') {
            group.status = 'READ_ONLY';
            console.log(`[Group ReportWorker] Group ${groupId} set to READ_ONLY.`);
            
            shouldNotifyLeader = true;
            notificationMessage = `Nhóm "${groupName}" của bạn đã bị chuyển sang chế độ CHỈ ĐỌC do vi phạm nghiêm trọng. Lý do: ${readableReason}.`;
            
            await rabbitMQProducer.publishGroupBanned(groupId, 'READ_ONLY');
          }
          else if (routingKey === 'user.banned') {
             // USER BANNED within a group context
             console.log(`[Group ReportWorker] User ${targetId} banned. Removing from group ${groupId}...`);
             
             // Reuse removeMember logic (Kick)
             await groupService.removeMember(groupId, targetId as string, { 
                requesterId: 'SYSTEM', 
                isBanned: true // This prevents them from re-joining
             } as any);

             const notificationMsg = `Thành viên vi phạm (ID: ${targetId}) đã bị hệ thống mời ra khỏi nhóm "${groupName}" và chặn tham gia lại.`;
             
             // Send notification to leader via Message Service
             if (leaderId) {
               const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
               await axios.post(MESSAGE_SERVICE_URL, {
                 targetUserId: leaderId,
                 senderName: 'Alo Chat System',
                 content: notificationMsg,
                 type: 'text'
               }, {
                 headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
               }).catch((err: any) => console.error(`[Group ReportWorker] Failed to notify leader:`, err.message));
             }

             // Send system message to the group itself
             try {
               const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
               await axios.post(MESSAGE_SERVICE_URL, {
                 conversationId: groupId,
                 content: `Một thành viên đã bị hệ thống mời ra khỏi nhóm do vi phạm quy tắc.`,
                 type: 'system'
               }, {
                 headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
               });
             } catch (err: any) {
               console.error(`[Group ReportWorker] Failed to send system message:`, err.message);
             }

             return; // EXIT EARLY to prevent overwriting group with stale in-memory 'group' object
          }
          else if (routingKey === 'group.disbanded') {
            await groupService.disbandGroup(groupId, false); // Soft delete for admin - already saves internally
            console.log(`[Group ReportWorker] Group ${groupId} DISBANDED via GroupService.`);

            shouldNotifyLeader = true;
            notificationMessage = `Nhóm "${groupName}" của bạn đã bị GIẢI TÁN do vi phạm chính sách cộng đồng. Ghi chú Admin: ${adminNotes || 'N/A'}`;
            
            // groupService.disbandGroup already saved the status = DISBANDED,
            // we do NOT call group.save() again below to avoid overwriting it.
            
            // Send DM to leader
            if (shouldNotifyLeader && leaderId) {
              const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
              await axios.post(MESSAGE_SERVICE_URL, {
                targetUserId: leaderId,
                senderName: 'Alo Chat System',
                content: notificationMessage,
                type: 'text'
              }, {
                headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
              }).catch((err: any) => console.error(`[Group ReportWorker] Failed to notify leader:`, err.message));
            }
            return; // Exit consumer callback early
          }

          await group.save();

          // Send notification to leader via Message Service
          if (shouldNotifyLeader && leaderId) {
            const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
            try {
              await axios.post(MESSAGE_SERVICE_URL, {
                targetUserId: leaderId,
                senderName: 'Alo Chat System',
                content: notificationMessage,
                type: 'text'
              }, {
                headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
              });
              console.log(`[Group ReportWorker] Notified leader ${leaderId}`);
            } catch (err: any) {
              console.error(`[Group ReportWorker] Failed to notify leader:`, err.message);
            }
          }

          // Send system message to the group itself
          try {
            const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:8083/api/v1/messages';
            let systemText = "";
            if (group.status === 'READ_ONLY') systemText = "⚠️ Nhóm này đã bị hệ thống khóa địa chỉ gửi tin nhắn do vi phạm. Nhóm chỉ cho phép xem (đọc)."

            if (systemText) {
              await axios.post(MESSAGE_SERVICE_URL, {
                conversationId: groupId,
                content: systemText,
                type: 'system'
              }, {
                headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' }
              });
            }
          } catch (err: any) {
            console.error(`[Group ReportWorker] Failed to send system message:`, err.message);
          }

          // Publish sync event for other services (if any listen to group updates)
          rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

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
