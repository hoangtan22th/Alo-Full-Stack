import axiosClient from "@/config/axiosClient";

export interface MessageHistoryResponse {
  conversationId: string;
  messages: any[];
  count: number;
  limit: number;
  skip: number;
}

/**
 * Lấy lịch sử tin nhắn từ Message Service
 * @param conversationId ID của cuộc hội thoại
 * @param limit Số lượng tin nhắn muốn lấy
 * @param skip Vị trí bỏ qua (cho phân trang)
 */
export const getMessageHistory = async (conversationId: string, limit: number = 50, skip: number = 0): Promise<MessageHistoryResponse> => {
  try {
    const response = await axiosClient.get(`/messages/${conversationId}`, {
      params: { limit, skip }
    });

    return response; 
  } catch (error) {
    console.error("Error fetching message history:", error);
    throw error;
  }
};

/**
 * Gửi tin nhắn mới qua REST API
 */
export const sendMessage = async (data: {
  conversationId: string;
  content: string;
  type?: string;
  metadata?: any;
}): Promise<any> => {
  try {
    const response = await axiosClient.post('/messages', data);
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Upload tệp tin và gửi tin nhắn
 * @param formData FormData chứa file và conversationId
 * @param onProgress Callback thông báo tiến trình upload (0-100)
 */
export const uploadFile = async (
  formData: FormData, 
  onProgress?: (percent: number) => void
): Promise<any> => {
  try {
    const response = await axiosClient.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Đánh dấu đã xem toàn bộ tin nhắn trong hội thoại
 */
export const markMessagesAsRead = async (conversationId: string): Promise<any> => {
  try {
    const response = await axiosClient.patch(`/messages/${conversationId}/read`);
    return response;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

/**
 * Thả cảm xúc hoặc spam emoji
 */
export const reactToMessage = async (messageId: string, emoji: string): Promise<any> => {
  try {
    const response = await axiosClient.post(`/messages/${messageId}/reactions`, { emoji });
    return response;
  } catch (error) {
    console.error("Error reacting to message:", error);
    throw error;
  }
};

/**
 * Xóa sạch cảm xúc của mình trên tin nhắn
 */
export const clearReactions = async (messageId: string): Promise<any> => {
  try {
    const response = await axiosClient.delete(`/messages/${messageId}/reactions`);
    return response;
  } catch (error) {
    console.error("Error clearing reactions:", error);
    throw error;
  }
};