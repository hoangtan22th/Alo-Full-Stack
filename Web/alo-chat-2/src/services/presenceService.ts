import api from "./api";

export interface PresenceInfo {
  isOnline: boolean;
  lastActiveAt: number;
}

export const presenceService = {
  getBulkPresence: async (userIds: string[]): Promise<Record<string, PresenceInfo>> => {
    try {
      if (!userIds || userIds.length === 0) return {};
      const validIds = userIds.filter(id => !!id);
      if (validIds.length === 0) return {};
      
      const response: any = await api.post("/realtime/presence/bulk", { userIds: validIds });
      // axiosClient interceptor unwraps response.data.data or response.data
      return response || {};
    } catch (error) {
      console.error("Lỗi khi tải trạng thái presence (bulk):", error);
      return {};
    }
  }
};
