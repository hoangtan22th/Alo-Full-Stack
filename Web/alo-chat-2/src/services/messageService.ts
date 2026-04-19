import api from "./api";

export interface MessageDTO {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  type: "text" | "image" | "file" | "system";
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
  isRead: boolean;
  isRevoked?: boolean;
  reactions?: any[];
  revokedAt?: string;
  isPinned?: boolean; // Thêm trường này để nhận biết tin nhắn ghim
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  type?: "text" | "image" | "file";
  content: string;
  senderName?: string;
  metadata?: Record<string, any>;
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
  };
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
  // Ghim hoặc bỏ ghim tin nhắn, trả về MessageDTO mới nhất nếu backend trả về
  pinMessage: async (
    messageId: string,
    pin: boolean = true,
  ): Promise<MessageDTO | null> => {
    try {
      let raw;
      if (pin) {
        raw = await api.patch(`/messages/${messageId}/pin`);
      } else {
        raw = await api.patch(`/messages/${messageId}/unpin`);
      }
      // Nếu backend trả về message mới nhất
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi (bỏ)ghim tin nhắn:", error);
      return null;
    }
  },
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
        senderName: payload.senderName,
        metadata: payload.metadata || {},
        replyTo: payload.replyTo,
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
    replyTo?: any,
    senderName?: string,
    onProgress?: (percent: number) => void,
  ): Promise<MessageDTO | null> => {
    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("file", file);
      if (senderName) {
        formData.append("senderName", senderName);
      }
      if (replyTo) {
        formData.append("replyTo", JSON.stringify(replyTo));
      }
      const raw = await api.post<any, any>(`/messages/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percent);
          }
        },
      });
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi upload file:", error);
      return null;
    }
  },

  // Upload nhiều ảnh và tạo album
  uploadImages: async (
    conversationId: string,
    files: File[],
    widths: number[],
    heights: number[],
    replyTo?: any,
    senderName?: string,
    onProgress?: (percent: number) => void,
  ): Promise<MessageDTO | null> => {
    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      files.forEach((file) => formData.append("files", file));
      formData.append("widths", JSON.stringify(widths));
      formData.append("heights", JSON.stringify(heights));
      if (senderName) {
        formData.append("senderName", senderName);
      }
      if (replyTo) {
        formData.append("replyTo", JSON.stringify(replyTo));
      }
      const raw = await api.post<any, any>(`/messages/upload/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percent);
          }
        },
      });
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi upload album ảnh:", error);
      return null;
    }
  },

  // Thu hồi 1 ảnh trong album
  revokeImageInGroup: async (messageId: string, index: number): Promise<boolean> => {
    try {
      await api.patch<any, any>(`/messages/${messageId}/images/${index}/revoke`);
      return true;
    } catch (error) {
      console.error("Lỗi thu hồi ảnh trong album:", error);
      return false;
    }
  },

  // Xóa 1 ảnh trong album chỉ ở phía tôi
  deleteImageInGroupForMe: async (messageId: string, index: number): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/messages/${messageId}/images/${index}/me`);
      return true;
    } catch (error) {
      console.error("Lỗi xóa ảnh trong album phía tôi:", error);
      return false;
    }
  },

  // Thu hồi tin nhắn (cho tất cả mọi người)
  revokeMessage: async (messageId: string): Promise<boolean> => {
    try {
      await api.patch<any, any>(`/messages/${messageId}/revoke`);
      return true;
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
      return false;
    }
  },

  // Xóa tin nhắn chỉ ở phía tôi
  deleteMessageForMe: async (messageId: string): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/messages/${messageId}/me`);
      return true;
    } catch (error) {
      console.error("Lỗi xóa tin nhắn phía tôi:", error);
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
  // Đánh dấu đã đọc tất cả tin trong conversation
  markAsRead: async (conversationId: string): Promise<boolean> => {
    try {
      await api.patch(`/messages/${conversationId}/read`);
      return true;
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
      return false;
    }
  },

  async reactToMessage(messageId: string, emoji: string): Promise<boolean> {
    try {
      await api.post(`/messages/${messageId}/reactions`, { emoji });
      return true;
    } catch (error) {
      console.error("Lỗi reactToMessage:", error);
      return false;
    }
  },

  async clearReactions(messageId: string): Promise<boolean> {
    try {
      await api.delete(`/messages/${messageId}/reactions`);
      return true;
    } catch (error) {
      console.error("Lỗi clearReactions:", error);
      return false;
    }
  },
};
