// src/workers/broadcastWorker.ts
import axios from 'axios';
import { Message } from '../models/Message';
import { BroadcastCampaign } from '../models/BroadcastCampaign';
import RabbitMQProducerService from '../services/RabbitMQProducerService';

const GROUP_SERVICE_URL = process.env.GROUP_SERVICE_URL || 'http://localhost:8082/api/v1/groups';
const USER_SERVICE_INTERNAL_URL = 'http://localhost:8086/api/v1/admin/users';

const BATCH_SIZE = 2000;

/**
 * Fetch all user IDs from user-service using internal direct call.
 */
async function getAllUserIds(): Promise<string[]> {
  try {
    console.log(`[BroadcastWorker] Fetching all user IDs from ${USER_SERVICE_INTERNAL_URL}/internal/ids`);
    const res = await axios.get(`${USER_SERVICE_INTERNAL_URL}/internal/ids`);
    
    const userIds = res.data.data || res.data;
    if (Array.isArray(userIds)) {
      return userIds;
    }
    return [];
  } catch (err: any) {
    console.error('[BroadcastWorker] Failed to fetch user IDs:', err.message);
    return [];
  }
}

/**
 * Process persistent broadcast in batches to prevent OOM.
 */
export async function processPersistentBroadcast(campaignId: string, broadcastData: {
  title: string;
  content: string;
  senderId: string;
}) {
  const { title, content, senderId } = broadcastData;
  console.log(`[BroadcastWorker] Starting Campaign ${campaignId}: "${title}"`);

  let totalProcessed = 0;

  try {
    // 1. Fetch all users
    const userIds = await getAllUserIds();
    if (userIds.length === 0) {
      console.warn('[BroadcastWorker] No users found to broadcast to.');
      await BroadcastCampaign.findByIdAndUpdate(campaignId, { status: 'COMPLETED', targetCount: 0 });
      return;
    }

    const messageText = `[${title}]\n\n${content}`;

    // 2. Process in Batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
      const userToConvo = new Map<string, string>();

      // Ensure 1-on-1 conversations exist for the batch
      // Process in smaller sub-chunks to avoid overwhelming group-service (e.g. 50 at a time)
      const CONCURRENCY_LIMIT = 50;
      for (let j = 0; j < batchUserIds.length; j += CONCURRENCY_LIMIT) {
        const subChunk = batchUserIds.slice(j, j + CONCURRENCY_LIMIT);
        await Promise.all(subChunk.map(async (userId) => {
          try {
            const convoRes = await axios.post(`${GROUP_SERVICE_URL}/direct`, {
              targetUserId: userId
            }, {
              headers: { 'X-User-Id': senderId }
            });
            const conversationId = (convoRes.data.data || convoRes.data)._id;
            userToConvo.set(userId, conversationId);
          } catch (err) {
            // Silently fail for individual users but log it
            console.error(`[BroadcastWorker] Failed for user ${userId}`);
          }
        }));
      }

      if (userToConvo.size === 0) continue;

      // Prepare messages for bulk insertion
      const messageDocs = Array.from(userToConvo.entries()).map(([userId, conversationId]) => ({
        conversationId: conversationId,
        senderId: senderId,
        senderName: 'Alo Chat System', 
        type: 'text',
        content: messageText,
        isRead: false,
        isRevoked: false,
        deletedByUsers: [],
        metadata: { isBroadcast: true, campaignId },
        createdAt: new Date()
      }));

      // High-performance bulk insert (unordered to allow partial success)
      const insertedMessages = await Message.insertMany(messageDocs, { ordered: false });
      totalProcessed += insertedMessages.length;

      // Notify users via RabbitMQ
      // Also chunk RabbitMQ publishes
      const RMQ_CHUNK = 100;
      for (let k = 0; k < insertedMessages.length; k += RMQ_CHUNK) {
        const rmqBatch = insertedMessages.slice(k, k + RMQ_CHUNK);
        await Promise.all(rmqBatch.map(async (msg) => {
          const msgObj = msg.toObject ? msg.toObject() : msg;
          await RabbitMQProducerService.publishMessageEvent(msgObj as any);
          await RabbitMQProducerService.publishConversationUpdatedEvent({
            conversationId: msgObj.conversationId.toString(),
            lastMessageId: msgObj._id.toString(),
            lastMessageTime: msgObj.createdAt,
            lastMessageContent: msgObj.content,
            lastSenderId: msgObj.senderId,
          });
        }));
      }

      console.log(`[BroadcastWorker] Campaign ${campaignId}: Processed ${totalProcessed}/${userIds.length} users.`);
    }

    // 3. Complete Campaign
    await BroadcastCampaign.findByIdAndUpdate(campaignId, { 
      status: 'COMPLETED', 
      targetCount: totalProcessed 
    });
    console.log(`[BroadcastWorker] Campaign ${campaignId} finished successfully. Total: ${totalProcessed}`);

  } catch (error) {
    console.error(`[BroadcastWorker] Fatal error for Campaign ${campaignId}:`, error);
    await BroadcastCampaign.findByIdAndUpdate(campaignId, { status: 'FAILED' });
  }
}
