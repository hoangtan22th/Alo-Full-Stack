import api from "./api";

// Kiểu cho gửi file/ảnh từ mobile
export interface SendFileMessagePayload {
  conversationId: string;
  file: any; // DocumentPicker hoặc ImagePicker asset
  isImage?: boolean;
  senderName?: string;
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
  };
}

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
  isPinned?: boolean;
  reactions?: any[];
  createdAt: string;
  updatedAt?: string;
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
  };
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

export interface MessageHistoryResponse {
  conversationId: string;
  messages: MessageDTO[];
  count: number;
  limit: number;
  skip: number;
  hasMore?: boolean;
}

/**
 * Chuẩn hóa response từ getMessageHistory.
 */
function extractHistory(raw: any): MessageHistoryResponse {
  // Case 1: interceptor đã unwrap
  if (raw && Array.isArray(raw.messages)) return raw;
  // Case 2: interceptor KHÔNG unwrap
  if (raw?.data && Array.isArray(raw.data.messages)) return raw.data;
  // Case 3: gateway wrapper
  if (raw?.data?.data && Array.isArray(raw.data.data.messages))
    return raw.data.data.messages;

  return {
    conversationId: "",
    messages: [],
    count: 0,
    limit: 0,
    skip: 0,
    hasMore: false,
  };
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
  getMessageHistory: async (
    conversationId: string,
    limit = 50,
    skip = 0,
    type?: string,
  ): Promise<MessageHistoryResponse> => {
    try {
      const raw = await api.get<any, any>(`/messages/${conversationId}`, {
        params: { limit, skip, type },
      });
      return extractHistory(raw);
    } catch (error) {
      console.error("Lỗi lấy lịch sử tin nhắn:", error);
      return {
        conversationId,
        messages: [],
        count: 0,
        limit,
        skip,
        hasMore: false,
      };
    }
  },

  /**
   * Bỏ ghim một tin nhắn (PATCH /messages/:messageId/unpin)
   */
  async unpinMessage(messageId: string): Promise<boolean> {
    try {
      await api.patch(`/messages/${messageId}/unpin`);
      return true;
    } catch (error) {
      console.error("Lỗi bỏ ghim tin nhắn:", error);
      return false;
    }
  },

  /**
   * Ghim một tin nhắn (PATCH /messages/:messageId/pin)
   */
  async pinMessage(messageId: string): Promise<boolean> {
    try {
      await api.patch(`/messages/${messageId}/pin`);
      return true;
    } catch (error) {
      console.error("Lỗi ghim tin nhắn:", error);
      return false;
    }
  },
  /**
   * Lấy tất cả tin nhắn đã ghim của hội thoại
   */
  async getPinnedMessages(conversationId: string): Promise<MessageDTO[]> {
    try {
      const raw = await api.get<any, any>(`/messages/${conversationId}/pinned`);
      // Backend trả về { status: 'success', data: IMessage[] }
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw)) return raw;
      return [];
    } catch (error) {
      console.error("Lỗi lấy danh sách tin nhắn ghim:", error);
      return [];
    }
  },

  /**
   * Tìm kiếm tin nhắn (GET /messages/:conversationId/search)
   */
  async searchMessages(
    conversationId: string,
    query: string,
    limit: number = 50,
  ): Promise<MessageDTO[]> {
    try {
      const raw = await api.get<any, any>(
        `/messages/${conversationId}/search`,
        {
          params: { query, limit },
        },
      );
      // Backend trả về { status: 'success', data: IMessage[] }
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw)) return raw;
      return [];
    } catch (error) {
      console.error("Lỗi tìm kiếm tin nhắn:", error);
      return [];
    }
  },

  /**
   * Gửi file hoặc ảnh từ React Native (DocumentPicker/ImagePicker)
   * file: asset từ DocumentPicker hoặc ImagePicker
   * isImage: true nếu là ảnh
   */
  async sendFileMessage({
    conversationId,
    file,
    isImage,
    senderName,
    replyTo,
  }: SendFileMessagePayload): Promise<MessageDTO | null> {
    try {
      // Chuẩn hóa file cho FormData
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      if (senderName) formData.append("senderName", senderName);
      if (replyTo) formData.append("replyTo", JSON.stringify(replyTo));
      // Xử lý file từ DocumentPicker hoặc ImagePicker
      if (file) {
        // Expo DocumentPicker: { uri, name, mimeType }
        // Expo ImagePicker: { uri, fileName, type }
        const name = file.name || file.fileName || `file_${Date.now()}`;
        const type =
          file.mimeType ||
          file.type ||
          (isImage ? "image/jpeg" : "application/octet-stream");
        formData.append("file", {
          uri: file.uri,
          name,
          type,
        } as any);
      }
      const raw = await api.post<any, any>(`/messages/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return extractSentMessage(raw);
    } catch (error) {
      console.error("Lỗi gửi file/ảnh:", error);
      return null;
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
      await api.patch<any, any>(`/messages/${messageId}/revoke`);
      return true;
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
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
