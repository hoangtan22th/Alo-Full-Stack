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
  async publishConversationRemoved(conversationId: string, userId: string, reason: 'kick' | 'leave' | 'delete' = 'kick') {
    await this.publishToRealtimeService('CONVERSATION_REMOVED', {
      target: userId,
      data: { conversationId, reason }
    });
    
    console.log(`[RabbitMQProducer] Event 'CONVERSATION_REMOVED' published for user: ${userId}, conversation: ${conversationId}, reason: ${reason}`);
  }

  /**
   * Phát sự kiện khi thông tin nhóm (tên, avatar, thành viên...) thay đổi.
   * Gửi đến tất cả mọi người đang ở trong room của hội thoại đó.
   */
  async publishGroupUpdated(conversation: any) {
    if (!conversation?._id) return;

    await this.publishToRealtimeService('GROUP_UPDATED', {
      room: conversation._id.toString(),
      data: conversation
    });

    console.log(`[RabbitMQProducer] Event 'GROUP_UPDATED' published to room: ${conversation._id}`);
  }

  /**
   * Phát sự kiện khi có người yêu cầu tham gia nhóm (cần duyệt).
   * Gửi riêng cho các quản trị viên (LEADER, DEPUTY).
   */
  async publishNewJoinRequest(groupId: string, requesterName: string, adminIds: string[], groupName: string) {
    for (const adminId of adminIds) {
      await this.publishToRealtimeService('NEW_JOIN_REQUEST', {
        target: adminId,
        data: { groupId, requesterName, groupName }
      });
    }
    console.log(`[RabbitMQProducer] Event 'NEW_JOIN_REQUEST' published to ${adminIds.length} admins for group: ${groupId}`);
  }

  /**
   * Phát sự kiện khi yêu cầu tham gia nhóm được duyệt.
   * Gửi riêng cho người dùng đã gửi yêu cầu.
   */
  async publishJoinRequestApproved(userId: string, group: any) {
    await this.publishToRealtimeService('JOIN_REQUEST_APPROVED', {
      target: userId,
      data: {
        groupId: group._id.toString(),
        groupName: group.name,
        groupAvatar: group.groupAvatar || '',
        membersCount: group.members.length
      }
    });
    console.log(`[RabbitMQProducer] Event 'JOIN_REQUEST_APPROVED' published to user: ${userId} for group: ${group._id}`);
  }
}

export default new RabbitMQProducerService();
