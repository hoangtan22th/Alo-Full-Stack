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
  type: "text" | "image" | "file" | "system" | "poll";
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    pollId?: string;
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
  type?: "text" | "image" | "file" | "poll" | "system";
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
  console.log("[MessageService] Extracting history from:", JSON.stringify(raw).substring(0, 200));

  let target = raw;

  // 1. Nếu raw là Axios Response (có .data)
  if (target?.data && !Array.isArray(target.data)) {
    // Nếu trong data lại có .data (Gateway wrapping { status, data: { ... } })
    if (target.data.data && !Array.isArray(target.data.data)) {
      target = target.data.data;
    } else {
      target = target.data;
    }
  }

  // 2. Nếu target vẫn có .data (Double wrapping)
  if (target?.data && !Array.isArray(target.data) && target.data.messages) {
    target = target.data;
  }

  // 3. Kiểm tra xem target có phải là object chứa messages không
  if (target && Array.isArray(target.messages)) {
    return {
      conversationId: target.conversationId || "",
      messages: target.messages,
      count: target.count || target.messages.length,
      limit: target.limit || 50,
      skip: target.skip || 0,
      hasMore: target.hasMore ?? target.messages.length >= 50,
    };
  }

  // 4. Fallback: Nếu target là một mảng trực tiếp
  const messagesArray = Array.isArray(target) ? target : Array.isArray(raw) ? raw : [];
  if (messagesArray.length > 0 || Array.isArray(target)) {
    return {
      conversationId: "",
      messages: messagesArray,
      count: messagesArray.length,
      limit: 50,
      skip: 0,
      hasMore: messagesArray.length >= 50,
    };
  }

  // 5. Fallback cuối cùng: rỗng
  return {
    conversationId: "",
    messages: [],
    count: 0,
    limit: 50,
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

  // Upload files thuần túy lên S3 (không tạo tin nhắn)
  uploadRawFiles: async (
    files: any[],
    onProgress?: (percent: number) => void,
  ): Promise<string[]> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        const name = file.name || file.fileName || `file_${Date.now()}`;
        const type = file.mimeType || file.type || "application/octet-stream";
        formData.append("files", {
          uri: file.uri,
          name,
          type,
        } as any);
      });

      const raw = await api.post<any, any>(`/messages/upload/raw`, formData, {
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

      // API trả về { status: 'success', data: [url1, url2, ...] }
      return raw.data || raw || [];
    } catch (error) {
      console.error("Lỗi upload files thuần túy:", error);
      return [];
    }
  },
};

