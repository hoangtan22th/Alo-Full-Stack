import api from "./api";

export interface MessageDTO {
  _id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "image" | "file" | "system";
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
  isRead: boolean;
  isRevoked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  type?: "text" | "image" | "file";
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Chuẩn hóa response từ getMessageHistory.
 *
 * Backend message-service trả về:
 *   { conversationId, messages: [...], count, limit, skip }
 *
 * API interceptor (api.ts) unwrap nếu response.data.data tồn tại:
 *   - nếu KHÔNG có ".data" → interceptor trả về nguyên Axios Response object
 *   - nếu CÓ ".data" → interceptor trả về response.data.data
 *
 * Đây là helper để lấy đúng mảng messages bất kể format.
 */
function extractMessages(raw: any): MessageDTO[] {
  // Case 1: interceptor đã unwrap → raw = { conversationId, messages, count }
  if (raw && Array.isArray(raw.messages)) return raw.messages;
  // Case 2: interceptor KHÔNG unwrap → raw = Axios Response, raw.data = { conversationId, messages, count }
  if (raw?.data && Array.isArray(raw.data.messages)) return raw.data.messages;
  // Case 3: gateway thêm thêm wrapper
  if (raw?.data?.data && Array.isArray(raw.data.data.messages))
    return raw.data.data.messages;
  return [];
}

/**
 * Chuẩn hóa response từ sendMessage.
 *
 * Backend trả về: { status: 'success', data: messageEvent }
 * API interceptor sẽ unwrap thành messageEvent vì có .data key.
 * Nhưng cần kiểm tra thêm trường hợp intercept bị bỏ qua.
 */
function extractSentMessage(raw: any): MessageDTO | null {
  // interceptor đã unwrap → raw = messageEvent trực tiếp (có _id)
  if (raw && raw._id) return raw;
  // có thêm wrapper
  if (raw?.data?._id) return raw.data;
  return null;
}

export const messageService = {
  // Lấy lịch sử tin nhắn của một cuộc hội thoại
  getMessageHistory: async (
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<MessageDTO[]> => {
    try {
      const raw = await api.get<any, any>(`/messages/${conversationId}`, {
        params: { limit, skip },
      });
      return extractMessages(raw);
    } catch (error) {
      console.error("Lỗi lấy lịch sử tin nhắn:", error);
      return [];
    }
  },

  // Gửi tin nhắn văn bản
  sendMessage: async (
    payload: SendMessagePayload,
  ): Promise<MessageDTO | null> => {
    try {
      const raw = await api.post<any, any>(`/messages`, {
        conversationId: payload.conversationId,
        type: payload.type || "text",
        content: payload.content,
        metadata: payload.metadata || {},
      });
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      return null;
    }
  },

  // Upload file và tạo tin nhắn
  uploadFile: async (
    conversationId: string,
    file: File,
  ): Promise<MessageDTO | null> => {
    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("file", file);
      const raw = await api.post<any, any>(`/messages/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi upload file:", error);
      return null;
    }
  },

  // Xoá/thu hồi tin nhắn
  deleteMessage: async (messageId: string): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/messages/${messageId}`);
      return true;
    } catch (error) {
      console.error("Lỗi xoá tin nhắn:", error);
      return false;
    }
  },

  // Sửa tin nhắn
  editMessage: async (
    messageId: string,
    content: string,
  ): Promise<MessageDTO | null> => {
    try {
      const raw = await api.patch<any, any>(`/messages/${messageId}`, {
        content,
      });
      return extractSentMessage(raw) ?? raw;
    } catch (error) {
      console.error("Lỗi sửa tin nhắn:", error);
      return null;
    }
  },

  // Đánh dấu đã đọc tất cả tin trong conversation
  markAsRead: async (conversationId: string): Promise<boolean> => {
    try {
      await api.patch<any, any>(`/messages/${conversationId}/read`, {});
      return true;
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
      return false;
    }
  },
};
