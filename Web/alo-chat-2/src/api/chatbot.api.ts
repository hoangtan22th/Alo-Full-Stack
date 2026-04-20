import axiosClient from "@/services/api"; 

export const chatbotApi = {
  getSummary: async (roomId: string, userId: string, context?: string) => {
    try {
      const response = await axiosClient.post("/chatbot/ask", {
        message: "Tóm tắt đoạn chat này", 
        roomId: roomId,
        userId: userId,
        context: context 
      });
      return { data: response.data || response, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: error.response?.data?.message || "AI đang bận, thử lại sau nhé!" 
      };
    }
  },

  // Gửi tin nhắn chat thông thường cho Bot
  ask: async (message: string, userId: string, roomId: string = "GLOBAL") => {
    try {
      const response = await axiosClient.post("/chatbot/ask", {
        message,
        userId,
        roomId
      });
      return { data: response.data || response, error: null };
    } catch (error: any) {
      return { data: null, error: error.response?.data?.message || "Lỗi kết nối AI" };
    }
  },

  // Lấy lịch sử chat với Bot
  getHistory: async (userId: string) => {
    try {
      const response = await axiosClient.get(`/chatbot/history/${userId}`);
      return { data: response.data || response, error: null };
    } catch (error: any) {
      return { data: [], error: "Không thể tải lịch sử chat" };
    }
  }
};