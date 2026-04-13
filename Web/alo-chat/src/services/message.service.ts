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