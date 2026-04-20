import axiosClient from "@/services/api"; 

export const chatbotApi = {
  getSummary: async (roomId: string, userId: string) => {
    try {
      const response = await axiosClient.post("/chatbot/ask", {
        message: "Tóm tắt đoạn chat này", 
        roomId: roomId,
        userId: userId
      });
      return { data: response.data || response, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: error.response?.data?.message || "Hệ thống AI đang bận, thử lại sau nhé!" 
      };
    }
  }
};