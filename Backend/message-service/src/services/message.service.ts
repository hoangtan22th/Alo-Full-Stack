import { Message, IMessage } from "../models/Message";
import { Types } from "mongoose";

export class MessageDataService {
  /**
   * Ghim tin nhắn
   */
  async pinMessage(messageId: string): Promise<IMessage | null> {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { $set: { isPinned: true } },
        { new: true },
      );
      return updated;
    } catch (error) {
      console.error("[MessageDataService] Failed to pin message:", error);
      throw error;
    }
  }

  /**
   * Bỏ ghim tin nhắn
   */
  async unpinMessage(messageId: string): Promise<IMessage | null> {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { $set: { isPinned: false } },
        { new: true },
      );
      return updated;
    } catch (error) {
      console.error("[MessageDataService] Failed to unpin message:", error);
      throw error;
    }
  }
  /**
   * Tạo tin nhắn mới
   */
  async createMessage(data: {
    conversationId: string;
    senderId: string;
    type: string;
    content: string;

    metadata?: Record<string, any>;
  }): Promise<IMessage> {
    try {
      const message = new Message({
        conversationId: new Types.ObjectId(data.conversationId),
        senderId: data.senderId,
        type: data.type,
        content: data.content,
        metadata: data.metadata || {},
        isRead: false,
        isRevoked: false, // Thu hồi (revoke)
        deletedByUsers: [], // Xóa 1 phía (delete)
      });

      await message.save();
      console.log(`[MessageDataService] Message created: ${message._id}`);
      return message;
    } catch (error) {
      console.error("[MessageDataService] Failed to create message:", error);
      throw error;
    }
  }

  /**
   * Thu hồi tin nhắn (Cho tất cả mọi người)
   */
  async revokeMessage(messageId: string): Promise<IMessage | null> {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        {
          $set: { isRevoked: true },
          revokedAt: new Date(),
        },
        { new: true },
      );
      console.log(
        `[MessageDataService] Message revoked for everyone: ${messageId}`,
      );
      return updated;
    } catch (error) {
      console.error("[MessageDataService] Failed to revoke message:", error);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn chỉ ở phía tôi
   */
  async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
    try {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedByUsers: userId },
      });
      console.log(`[MessageDataService] Message hidden for user ${userId}`);
    } catch (error) {
      console.error(
        "[MessageDataService] Failed to delete message for me:",
        error,
      );
      throw error;
    }
  }

  /**
   * Lấy lịch sử tin nhắn (Có lọc những tin đã xóa 1 phía và xử lý thu hồi)
   */
  async getMessageHistory(
    conversationId: string,
    userId: string, // UserId của người yêu cầu
    limit: number = 50,
    skip: number = 0,
    clearedAt?: Date,
    type?: string,
    joinedAt?: Date,
  ): Promise<IMessage[]> {
    try {
      const query: any = {
        conversationId: new Types.ObjectId(conversationId),
        deletedByUsers: { $ne: userId }, // LỌC: Không lấy tin mà user này đã xóa phía mình
      };

      // Xác định mốc thời gian bắt đầu có thể xem tin nhắn
      let startTime = 0;
      if (clearedAt) startTime = Math.max(startTime, new Date(clearedAt).getTime());
      if (joinedAt) startTime = Math.max(startTime, new Date(joinedAt).getTime());

      if (startTime > 0) {
        query.createdAt = { $gt: new Date(startTime) };
      }

      if (type) {
        query.type = type;
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      // Reverse và xử lý hiển thị tin đã thu hồi
      return messages.reverse().map((msg: any) => {
        if (msg.isRevoked) {
          // Chỉ ẩn nội dung đối với người không phải người gửi
          if (String(msg.senderId) !== String(userId)) {
            msg.content = "Tin nhắn đã được thu hồi";
          }
          // Note: Người gửi vẫn nhận được nội dung gốc để thực hiện Redo/Sửa nhanh
        }
        return msg;
      });
    } catch (error) {
      console.error(
        "[MessageDataService] Failed to get message history:",
        error,
      );
      throw error;
    }
  }

  // --- Các hàm hỗ trợ khác giữ nguyên nhưng bỏ 'async function' thay bằng 'async' ---

  async getMessageById(messageId: string): Promise<IMessage | null> {
    return await Message.findById(messageId);
  }

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    const objectIds = messageIds.map((id) => new Types.ObjectId(id));
    await Message.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: { isRead: true },
        $addToSet: { readBy: userId },
      },
    );
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const result = await Message.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $set: { isRead: true },
        $addToSet: { readBy: userId },
      },
    );
    return result.modifiedCount;
  }

  async isMessageOwner(messageId: string, userId: string): Promise<boolean> {
    const message = await Message.findById(messageId);
    return message?.senderId === userId && !message?.isRevoked;
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    try {
      return await Message.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userId },
        readBy: { $ne: userId },
        deletedByUsers: { $ne: userId },
      });
    } catch (error) {
      console.error("[MessageDataService] Failed to get unread count:", error);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string): Promise<IMessage | null> {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        {
          $set: { content, editedAt: new Date() },
          $push: {
            editHistory: {
              originalContent: (await Message.findById(messageId))?.content || "",
              editedAt: new Date(),
            },
          },
        },
        { new: true },
      );
      return updated;
    } catch (error) {
      console.error("[MessageDataService] Failed to edit message:", error);
      throw error;
    }
  }

  /**
   * Thêm hoặc tăng số lượng cảm xúc (Spam logic)
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<IMessage | null> {
    try {
      // 1. Thử cập nhật nếu đã tồn tại tổ hợp userId + emoji bằng $elemMatch
      const result = await Message.updateOne(
        {
          _id: new Types.ObjectId(messageId),
          reactions: { $elemMatch: { userId: userId, emoji: emoji } },
        },
        { $inc: { "reactions.$.count": 1 } },
      );

      // 2. Nếu không tìm thấy để cập nhật, thực hiện push mới
      if (result.matchedCount === 0) {
        return await Message.findByIdAndUpdate(
          messageId,
          {
            $push: {
              reactions: { userId, emoji, count: 1 },
            },
          },
          { new: true },
        );
      }

      return await Message.findById(messageId);
    } catch (error) {
      console.error("[MessageDataService] Failed to add reaction:", error);
      throw error;
    }
  }

  /**
   * Xóa toàn bộ cảm xúc của một user trên tin nhắn đó
   */
  async clearReactions(
    messageId: string,
    userId: string,
  ): Promise<IMessage | null> {
    try {
      return await Message.findByIdAndUpdate(
        messageId,
        {
          $pull: {
            reactions: { userId: userId },
          },
        },
        { new: true },
      );
    } catch (error) {
      console.error("[MessageDataService] Failed to clear reactions:", error);
      throw error;
    }
  }
}

export default new MessageDataService();
