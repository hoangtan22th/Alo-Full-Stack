import api from "./api";

export const groupService = {
  createGroup: async (
    name: string,
    userIds: string[],
    groupAvatar?: string,
  ) => {
    try {
      const data = await api.post<any, any>(`/groups`, {
        name,
        userIds,
        groupAvatar,
      });
      return data;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  getMyGroups: async () => {
    try {
      const data = await api.get<any, any>(`/groups/me`);
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
      return [];
    }
  },
};
