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

export const messageService = {
  // Lấy lịch sử tin nhắn của một cuộc hội thoại
  getMessageHistory: async (
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<{ messages: MessageDTO[]; count: number } | null> => {
    try {
      const data = await api.get<any, any>(`/messages/${conversationId}`, {
        params: { limit, skip },
      });
      return data;
    } catch (error) {
      console.error("Lỗi lấy lịch sử tin nhắn:", error);
      return null;
    }
  },

  // Gửi tin nhắn văn bản
  sendMessage: async (
    payload: SendMessagePayload,
  ): Promise<MessageDTO | null> => {
    try {
      const data = await api.post<any, any>(`/messages`, {
        conversationId: payload.conversationId,
        type: payload.type || "text",
        content: payload.content,
        metadata: payload.metadata || {},
      });
      // API trả về { status, data: messageEvent }
      return data?.data ?? data;
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
      const data = await api.post<any, any>(`/messages/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.data ?? data;
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
      const data = await api.patch<any, any>(`/messages/${messageId}`, {
        content,
      });
      return data;
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
