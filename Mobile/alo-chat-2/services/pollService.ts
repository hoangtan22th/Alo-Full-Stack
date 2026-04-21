import api from "./api";

export interface PollOptionDTO {
  _id?: string;
  text: string;
  addedBy?: string;
  createdAt?: string;
}

export interface PollSettingsDTO {
  allowMultipleAnswers: boolean;
  allowAddOptions: boolean;
  hideResultsUntilVoted: boolean;
  hideVoters: boolean;
  pinToTop: boolean;
}

export interface PollDTO {
  _id: string;
  conversationId: string;
  creatorId: string;
  question: string;
  options: PollOptionDTO[];
  settings: PollSettingsDTO;
  expiresAt: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export interface PollResultDTO {
  optionId: string;
  count: number;
  voters: Array<{
    userId: string;
    votedAt: string;
  }>;
}

export interface CreatePollPayload {
  conversationId: string;
  question: string;
  options: string[]; // List of option texts
  settings: PollSettingsDTO;
  expiresAt?: string | null; // ISO string
}

export const pollService = {
  createPoll: async (payload: CreatePollPayload): Promise<PollDTO | null> => {
    try {
      const response = await api.post("/polls", payload);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi tạo bình chọn:", error);
      return null;
    }
  },

  getPollDetails: async (pollId: string): Promise<PollDTO | null> => {
    try {
      const response = await api.get(`/polls/${pollId}`);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết bình chọn:", error);
      return null;
    }
  },

  votePoll: async (pollId: string, optionIds: string[]): Promise<boolean> => {
    try {
      await api.post(`/polls/${pollId}/vote`, { optionIds });
      return true;
    } catch (error) {
      console.error("Lỗi khi vote bình chọn:", error);
      return false;
    }
  },

  addPollOption: async (pollId: string, text: string): Promise<PollOptionDTO | null> => {
    try {
      const response = await api.post(`/polls/${pollId}/options`, { text });
      return response as any;
    } catch (error) {
      console.error("Lỗi khi thêm lựa chọn bình chọn:", error);
      return null;
    }
  },

  closePoll: async (pollId: string): Promise<boolean> => {
    try {
      await api.put(`/polls/${pollId}/close`);
      return true;
    } catch (error) {
      console.error("Lỗi khi đóng bình chọn:", error);
      return false;
    }
  },

  getPollResults: async (pollId: string): Promise<PollResultDTO[]> => {
    try {
      const response: any = await api.get(`/polls/${pollId}/results`);
      // Backend returns { _id, question, status, totalVotes, results: [...] }
      // Or in case of hidden results: { _id, hidden, message }
      return response.results || [];
    } catch (error) {
      console.error("Lỗi khi lấy kết quả bình chọn:", error);
      return [];
    }
  },

  getPollsByConversation: async (
    conversationId: string,
  ): Promise<PollDTO[]> => {
    try {
      const response = await api.get(`/polls/conversation/${conversationId}`);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bình chọn:", error);
      return [];
    }
  },
};
