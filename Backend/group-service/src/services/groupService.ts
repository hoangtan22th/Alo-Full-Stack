import Conversation from "../models/Conversation";
import rabbitMQProducer from "./rabbitMQProducer";
import { deleteImageFromS3 } from "./s3Service";

export class GroupService {
  /**
   * Giải tán nhóm (Có thể gọi từ Controller của Trưởng nhóm hoặc từ Worker của Admin)
   * @param groupId ID nhóm
   * @param isHardDelete Nếu true sẽ xóa vĩnh viễn khỏi DB (dùng cho Trưởng nhóm), false sẽ đánh dấu DISBANDED (dùng cho Admin)
   */
  async disbandGroup(groupId: string, isHardDelete: boolean = true): Promise<void> {
    const group = await Conversation.findById(groupId);
    if (!group) return;

    if (group.groupAvatar && isHardDelete) {
      await deleteImageFromS3(group.groupAvatar).catch(console.error);
    }

    if (isHardDelete) {
      await Conversation.findByIdAndDelete(groupId);
    } else {
      group.status = 'DISBANDED';
      await group.save();
    }

    // Thông báo cho tất cả thành viên để xóa khỏi danh sách chat của họ
    if (group.members) {
      for (const member of group.members) {
        if (member.userId) {
          rabbitMQProducer
            .publishConversationRemoved(
              groupId,
              String(member.userId),
              group.name || "Nhóm",
              isHardDelete ? "delete" : "kick" // Admin disband is like a mass-kick/removal
            )
            .catch(console.error);
        }
      }
    }
    // Phát sự kiện để kích tất cả user đang online trong chat room này ra ngoài
    rabbitMQProducer.publishGroupDisbanded(groupId).catch(console.error);
    
    console.log(`[GroupService] Group ${groupId} disbanded (${isHardDelete ? 'Hard' : 'Soft'} delete)`);
  }

  /**
   * Xóa thành viên khỏi nhóm (Kick hoặc Tự rời)
   */
  async removeMember(
    groupId: string, 
    userId: string, 
    options: { 
      requesterId: string, 
      isBanned?: boolean, 
      preventReinvite?: boolean,
      reason?: "LEAVE" | "KICK" 
    }
  ): Promise<any> {
    const { requesterId, isBanned, preventReinvite, reason: explicitReason } = options;
    const group = await Conversation.findById(groupId);
    if (!group) throw new Error("Nhóm không tồn tại");

    console.log(`[GroupService removeMember] Attempting to remove User ${userId} from Group ${groupId}.`);
    console.log(`[GroupService removeMember] Current group members:`, group.members.map(m => m.userId.toString().trim()));

    const target = group.members.find(
      (m) => m.userId.toString().trim().toLowerCase() === userId.toString().trim().toLowerCase(),
    );
    if (!target) {
      console.warn(`[GroupService removeMember] User ${userId} NOT found in group members! Skipping removal.`);
      return group; // User not in group
    }

    console.log(`[GroupService removeMember] Found target member:`, target);

    const reason = explicitReason || (userId.toString().trim().toLowerCase() === requesterId.toString().trim().toLowerCase() ? "LEAVE" : "KICK");

    // Cập nhật removedMembers
    if (!group.removedMembers) group.removedMembers = [];
    group.removedMembers = group.removedMembers.filter(
      (rm) => rm.userId.toString().trim().toLowerCase() !== userId.toString().trim().toLowerCase(),
    );

    group.removedMembers.push({
      userId,
      removedAt: new Date(),
      reason,
      isBanned: reason === "KICK" ? !!isBanned : false,
      preventReinvite: reason === "LEAVE" ? !!preventReinvite : false,
    });

    // Thực hiện xóa khỏi members
    group.members = group.members.filter(
      (m) => m.userId.toString().trim().toLowerCase() !== userId.toString().trim().toLowerCase(),
    );
    await group.save();

    // Real-time Sync
    rabbitMQProducer
      .publishConversationRemoved(
        groupId,
        userId,
        group.name || "Nhóm",
        reason.toLowerCase() as "kick" | "leave" | "delete",
      )
      .catch(console.error);

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    return group;
  }
}

export default new GroupService();
