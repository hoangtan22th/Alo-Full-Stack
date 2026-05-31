import { create } from "zustand";
import api from "../services/api";

interface NotificationState {
  friendRequestCount: number;
  groupInviteCount: number;

  setFriendRequestCount: (count: number) => void;
  setGroupInviteCount: (count: number) => void;
  
  incrementFriendRequestCount: () => void;
  decrementFriendRequestCount: () => void;
  
  incrementGroupInviteCount: () => void;
  decrementGroupInviteCount: () => void;

  fetchInitialCounts: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  friendRequestCount: 0,
  groupInviteCount: 0,

  setFriendRequestCount: (count) => set({ friendRequestCount: count }),
  setGroupInviteCount: (count) => set({ groupInviteCount: count }),

  incrementFriendRequestCount: () =>
    set((state) => ({ friendRequestCount: state.friendRequestCount + 1 })),
  decrementFriendRequestCount: () =>
    set((state) => ({ friendRequestCount: Math.max(0, state.friendRequestCount - 1) })),

  incrementGroupInviteCount: () =>
    set((state) => ({ groupInviteCount: state.groupInviteCount + 1 })),
  decrementGroupInviteCount: () =>
    set((state) => ({ groupInviteCount: Math.max(0, state.groupInviteCount - 1) })),

  fetchInitialCounts: async () => {
    try {
      // Gọi API lấy danh sách lời mời kết bạn
      const friendRes: any = await api.get("/contacts/pending");
      const friendData = friendRes.data?.data || friendRes.data || friendRes || [];
      const fCount = Array.isArray(friendData) ? friendData.length : 0;

      // Gọi API lấy danh sách lời mời vào nhóm
      const groupRes: any = await api.get("/groups/invitations/me");
      const groupData = groupRes.data?.data || groupRes.data || groupRes || [];
      const gCount = Array.isArray(groupData) ? groupData.length : 0;

      set({ friendRequestCount: fCount, groupInviteCount: gCount });
    } catch (error) {
      console.error("Failed to fetch initial notification counts", error);
    }
  },
}));
