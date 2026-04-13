import { Message, IMessage } from '../models/Message';
import { Types } from 'mongoose';

export class MessageDataService {
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
        isDeleted: false,    // Thu hồi
        deletedByUsers: [],    // Xóa 1 phía
      });

      await message.save();
      console.log(`[MessageDataService] Message created: ${message._id}`);
      return message;
    } catch (error) {
      console.error('[MessageDataService] Failed to create message:', error);
      throw error;
    }
  }

  /**
   * Thu hồi tin nhắn (Cho tất cả mọi người)
   */
  async revokeMessage(messageId: string): Promise<void> {
    try {
      // Bỏ từ khóa 'function' đi vì đang ở trong Class
      await Message.findByIdAndUpdate(
        messageId,
        { 
          $set: { isDeleted: true },
          deletedAt: new Date() 
        }
      );
      console.log(`[MessageDataService] Message revoked for everyone: ${messageId}`);
    } catch (error) {
      console.error('[MessageDataService] Failed to revoke message:', error);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn chỉ ở phía tôi
   */
  async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
    try {
      await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deletedByUsers: userId } }
      );
      console.log(`[MessageDataService] Message hidden for user ${userId}`);
    } catch (error) {
      console.error('[MessageDataService] Failed to delete message for me:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử tin nhắn (Có lọc những tin đã xóa 1 phía)
   */
  async getMessageHistory(
    conversationId: string,
    userId: string, // Phải truyền userId vào để lọc
    limit: number = 50,
    skip: number = 0
  ): Promise<IMessage[]> {
    try {
      const messages = await Message.find({
        conversationId: new Types.ObjectId(conversationId),
        deletedByUsers: { $ne: userId } // LỌC: Không lấy tin mà user này đã xóa
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      // Reverse và xử lý hiển thị tin đã thu hồi
      return messages.reverse().map((msg: any) => {
        if (msg.isDeleted) {
          msg.content = "Tin nhắn đã được thu hồi";
        }
        return msg;
      });
    } catch (error) {
      console.error('[MessageDataService] Failed to get message history:', error);
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
      }
    );
  }

  async isMessageOwner(messageId: string, userId: string): Promise<boolean> {
    const message = await Message.findById(messageId);
    return message?.senderId === userId && !message?.isDeleted;
  }
}

export default new MessageDataService();