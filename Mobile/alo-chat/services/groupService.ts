import api from "./api";

export const groupService = {
  createGroup: async (name: string, userIds: string[], imageUri?: string) => {
    try {
      if (imageUri) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("userIds", JSON.stringify(userIds));

        const filename = imageUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("avatarFile", {
          uri: imageUri,
          name: filename,
          type,
        } as any);

        const data = await api.post<any, any>(`/groups`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return data;
      }

      const data = await api.post<any, any>(`/groups`, {
        name,
        userIds,
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

  getGroupById: async (groupId: string) => {
    try {
      const data = await api.get<any, any>(`/groups/${groupId}`);
      return data;
    } catch (error) {
      console.error("Lỗi lấy thông tin nhóm:", error);
      throw error;
    }
  },

  addMember: async (groupId: string, newUserId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/${groupId}/members`, { newUserId });
      return data;
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  removeMember: async (groupId: string, userId: string) => {
    try {
      const data = await api.delete<any, any>(`/groups/${groupId}/members/${userId}`);
      return data;
    } catch (error) {
      console.error("Lỗi xoá thành viên:", error);
      throw error;
    }
  },

  updateRole: async (groupId: string, userId: string, newRole: string) => {
    try {
      const data = await api.put<any, any>(`/groups/${groupId}/members/${userId}/role`, { newRole });
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật quyền:", error);
      throw error;
    }
  },

  assignLeader: async (groupId: string, newLeaderId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/assign-leader`, { groupId, newLeaderId });
      return data;
    } catch (error) {
      console.error("Lỗi chuyển nhóm trưởng:", error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      const data = await api.delete<any, any>(`/groups/${groupId}`);
      return data;
    } catch (error) {
      console.error("Lỗi giải tán nhóm:", error);
      throw error;
    }
  },

  requestJoinGroup: async (groupId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/${groupId}/join-requests`);
      return data;
    } catch (error) {
      console.error("Lỗi yêu cầu tham gia nhóm:", error);
      throw error;
    }
  },

  getJoinRequests: async (groupId: string) => {
    try {
      const data = await api.get<any, any>(`/groups/${groupId}/join-requests`);
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu tham gia:", error);
      throw error;
    }
  },

  approveJoinRequest: async (groupId: string, userId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/${groupId}/join-requests/${userId}/approve`);
      return data;
    } catch (error) {
      console.error("Lỗi duyệt yêu cầu:", error);
      throw error;
    }
  },

  rejectJoinRequest: async (groupId: string, userId: string) => {
    try {
      const data = await api.delete<any, any>(`/groups/${groupId}/join-requests/${userId}/reject`);
      return data;
    } catch (error) {
      console.error("Lỗi từ chối yêu cầu:", error);
      throw error;
    }
  },

  updateApprovalSetting: async (groupId: string, isApprovalRequired: boolean) => {
    try {
      const data = await api.put<any, any>(`/groups/${groupId}/approval-setting`, { isApprovalRequired });
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình duyệt:", error);
      throw error;
    }
  },
};
