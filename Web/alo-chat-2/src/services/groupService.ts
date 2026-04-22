import api from "./api";

export const groupService = {
  updateGroup: async (groupId: string, name?: string, avatarFile?: File) => {
    try {
      const formData = new FormData();
      if (name) {
        formData.append("name", name);
      }
      if (avatarFile) {
        formData.append("avatarFile", avatarFile);
      }
      return await api.put<any, any>(`/groups/${groupId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      console.error("Lỗi cập nhật nhóm:", error);
      throw error;
    }
  },

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

  getMyGroups: async (type?: string) => {
    try {
      const data = await api.get<any, any>(`/groups/me`, {
        params: type ? { type } : undefined,
      });
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh sách cuộc trò chuyện:", error);
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

  getGroupInfoForLink: async (groupId: string) => {
    try {
      const data = await api.get<any, any>(`/groups/${groupId}/link-info`);
      return data;
    } catch (error) {
      console.error("Lỗi lấy thông tin nhóm cho link:", error);
      throw error;
    }
  },

  addMember: async (groupId: string, newUserId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/${groupId}/members`, {
        newUserId,
      });
      return data;
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  removeMember: async (
    groupId: string,
    userId: string,
    options?: {
      isSilent?: boolean;
      isBanned?: boolean;
      preventReinvite?: boolean;
    },
  ) => {
    try {
      const data = await api.delete<any, any>(
        `/groups/${groupId}/members/${userId}`,
        { data: options }, // axios delete with body needs { data: ... }
      );
      return data;
    } catch (error) {
      console.error("Lỗi xoá thành viên:", error);
      throw error;
    }
  },

  updateRole: async (groupId: string, userId: string, newRole: string) => {
    try {
      const data = await api.put<any, any>(
        `/groups/${groupId}/members/${userId}/role`,
        { newRole },
      );
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật quyền:", error);
      throw error;
    }
  },

  assignLeader: async (groupId: string, newLeaderId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/assign-leader`, {
        groupId,
        newLeaderId,
      });
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

  requestJoinGroup: async (groupId: string, answer?: string) => {
    try {
      const data = await api.post<any, any>(
        `/groups/${groupId}/join-requests`,
        {
          answer,
        },
      );
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
      const data = await api.post<any, any>(
        `/groups/${groupId}/join-requests/${userId}/approve`,
      );
      return data;
    } catch (error) {
      console.error("Lỗi duyệt yêu cầu:", error);
      throw error;
    }
  },

  rejectJoinRequest: async (groupId: string, userId: string) => {
    try {
      const data = await api.delete<any, any>(
        `/groups/${groupId}/join-requests/${userId}/reject`,
      );
      return data;
    } catch (error) {
      console.error("Lỗi từ chối yêu cầu:", error);
      throw error;
    }
  },

  updateApprovalSetting: async (
    groupId: string,
    isApprovalRequired: boolean,
  ) => {
    try {
      const data = await api.put<any, any>(
        `/groups/${groupId}/approval-setting`,
        { isApprovalRequired },
      );
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình duyệt:", error);
      throw error;
    }
  },

  updateLinkSetting: async (groupId: string, isLinkEnabled: boolean) => {
    try {
      const data = await api.put<any, any>(`/groups/${groupId}/link-setting`, {
        isLinkEnabled,
      });
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình link:", error);
      throw error;
    }
  },

  updateHistorySetting: async (groupId: string, isHistoryVisible: boolean) => {
    try {
      const data = await api.put<any, any>(
        `/groups/${groupId}/history-setting`,
        { isHistoryVisible },
      );
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình lịch sử:", error);
      throw error;
    }
  },

  // Lấy hoặc tạo cuộc hội thoại 1-1
  createDirectConversation: async (targetUserId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/direct`, { targetUserId });
      return data;
    } catch (error) {
      console.error("Lỗi tạo cuộc hội thoại 1-1:", error);
      throw error;
    }
  },

  // --- Quản lý Nhãn (Labels) ---
  getLabels: async () => {
    try {
      return await api.get<any, any>(`/groups/labels`);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhãn:", error);
      throw error;
    }
  },

  createLabel: async (name: string, color: string) => {
    try {
      return await api.post<any, any>(`/groups/labels`, { name, color });
    } catch (error) {
      console.error("Lỗi tạo nhãn mới:", error);
      throw error;
    }
  },

  updateLabel: async (id: string, name: string, color: string) => {
    try {
      return await api.put<any, any>(`/groups/labels/${id}`, { name, color });
    } catch (error) {
      console.error("Lỗi cập nhật nhãn:", error);
      throw error;
    }
  },

  deleteLabel: async (id: string) => {
    try {
      return await api.delete<any, any>(`/groups/labels/${id}`);
    } catch (error) {
      console.error("Lỗi xóa nhãn:", error);
      throw error;
    }
  },

  // Gán nhãn cho cuộc hội thoại
  assignLabel: async (conversationId: string, labelId: string | null) => {
    try {
      return await api.post<any, any>(
        `/groups/conversations/${conversationId}/label`,
        { labelId },
      );
    } catch (error) {
      console.error("Lỗi gán nhãn cho hội thoại:", error);
      throw error;
    }
  },

  // Lấy tất cả các gán nhãn của user
  getConversationLabels: async () => {
    try {
      return await api.get<any, any>(`/groups/conversations/labels`);
    } catch (error) {
      console.error("Lỗi lấy danh sách hội thoại đã gán nhãn:", error);
      throw error;
    }
  },

  // --- Ghim cuộc hội thoại ---
  togglePinConversation: async (conversationId: string) => {
    try {
      return await api.post<any, any>(
        `/groups/conversations/${conversationId}/pin`,
      );
    } catch (error) {
      console.error("Lỗi ghim/bỏ ghim hội thoại:", error);
      throw error;
    }
  },

  getPinnedConversations: async () => {
    try {
      return await api.get<any, any>(`/groups/conversations/pinned`);
    } catch (error) {
      console.error("Lỗi lấy danh sách hội thoại đã ghim:", error);
      throw error;
    }
  },

  clearConversation: async (groupId: string) => {
    try {
      const data = await api.post<any, any>(`/groups/${groupId}/clear`);
      return data;
    } catch (error) {
      console.error("Lỗi xoá lịch sử trò chuyện:", error);
      throw error;
    }
  },

  updateConversationFolder: async (
    groupId: string,
    folder: "priority" | "other" | "stranger",
  ) => {
    try {
      const data = await api.put<any, any>(`/groups/${groupId}/folder`, {
        folder,
      });
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật danh mục:", error);
      throw error;
    }
  },

  inviteToGroup: async (groupId: string, targetUserId: string) => {
    try {
      return await api.post<any, any>(`/groups/${groupId}/invitations`, {
        targetUserId,
      });
    } catch (error) {
      console.error("Lỗi mời vào nhóm:", error);
      throw error;
    }
  },

  getMyInvitations: async () => {
    try {
      return await api.get<any, any>(`/groups/invitations/me`);
    } catch (error) {
      console.error("Lỗi lấy danh sách lời mời:", error);
      throw error;
    }
  },

  acceptInvitation: async (groupId: string) => {
    try {
      return await api.post<any, any>(`/groups/${groupId}/invitations/accept`);
    } catch (error) {
      console.error("Lỗi chấp nhận lời mời:", error);
      throw error;
    }
  },

  declineInvitation: async (groupId: string) => {
    try {
      return await api.post<any, any>(`/groups/${groupId}/invitations/decline`);
    } catch (error) {
      console.error("Lỗi từ chối lời mời:", error);
      throw error;
    }
  },

  getMySentInvitations: async () => {
    try {
      return await api.get<any, any>(`/groups/invitations/sent`);
    } catch (error) {
      console.error("Lỗi lấy danh sách lời mời đã gửi:", error);
      throw error;
    }
  },

  getMySentJoinRequests: async () => {
    try {
      return await api.get<any, any>(`/groups/join-requests/me`);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu tham gia:", error);
      throw error;
    }
  },

  updateGroupSettings: async (
    groupId: string,
    settings: {
      isHighlightEnabled?: boolean;
      membershipQuestion?: string;
      isQuestionEnabled?: boolean;
      permissions?: {
        editGroupInfo?: "EVERYONE" | "ADMIN";
        createNotes?: "EVERYONE" | "ADMIN";
        createPolls?: "EVERYONE" | "ADMIN";
        pinMessages?: "EVERYONE" | "ADMIN";
        sendMessage?: "EVERYONE" | "ADMIN";
        createReminders?: "EVERYONE" | "ADMIN";
      };
    },
  ) => {
    try {
      const data = await api.put<any, any>(
        `/groups/${groupId}/settings`,
        settings,
      );
      return data;
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình nhóm:", error);
      throw error;
    }
  },

  getBlockedMembers: async (groupId: string) => {
    try {
      return await api.get<any, any>(`/groups/${groupId}/blocked`);
    } catch (error) {
      console.error("Lỗi lấy danh sách thành viên bị chặn:", error);
      throw error;
    }
  },

  unblockMember: async (groupId: string, userId: string) => {
    try {
      return await api.delete<any, any>(`/groups/${groupId}/members/${userId}/unblock`);
    } catch (error) {
      console.error("Lỗi gỡ chặn thành viên:", error);
      throw error;
    }
  },
};
