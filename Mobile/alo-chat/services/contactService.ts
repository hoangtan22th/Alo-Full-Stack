import api from "./api";

export interface FriendRequestDTO {
  recipientId: string;
  greetingMessage?: string;
}

export interface FriendshipResponseDTO {
  id: string;
  requesterId: string;
  recipientId: string;
  status: string;
  greetingMessage?: string;
  requesterName?: string;
  requesterAvatar?: string;
}

export interface SearchFriendResponseDTO {
  id: string;
  phone: string;
  fullName: string;
  avatar?: string;
  friendshipStatus?: string;
}

export const contactService = {
  // Tìm kiếm bạn bằng số điện thoại
  searchUserByPhone: async (
    phone: string,
  ): Promise<SearchFriendResponseDTO | null> => {
    try {
      // do api interceptor đã xử lý lấy data bên trong (ApiResponse.data)
      const data = await api.get<any, any>(`/contacts/search`, {
        params: { phone },
      });
      return data;
    } catch (error) {
      console.error("Lỗi khi tìm bạn:", error);
      return null;
    }
  },

  // Gửi lời mời kết bạn
  sendFriendRequest: async (
    recipientId: string,
    greetingMessage: string = "",
  ): Promise<FriendshipResponseDTO | null> => {
    try {
      const data = await api.post<any, any>(`/contacts/request`, {
        recipientId,
        greetingMessage,
      });
      return data;
    } catch (error) {
      console.error("Lỗi khi gửi lời mời kết bạn:", error);
      return null;
    }
  },

  // Danh sách lời mời chờ xác nhận
  getPendingRequests: async (): Promise<FriendshipResponseDTO[]> => {
    try {
      const data = await api.get<any, any>(`/contacts/pending`);
      return data || [];
    } catch (error) {
      console.error("Lỗi khi tải danh sách lời mời:", error);
      return [];
    }
  },

  // Lấy danh sách bạn bè
  getFriendsList: async (): Promise<FriendshipResponseDTO[]> => {
    try {
      const data = await api.get<any, any>(`/contacts/friends`);
      return data || [];
    } catch (error) {
      console.error("Lỗi khi tải danh sách bạn bè:", error);
      return [];
    }
  },

  // Chấp nhận lời mời
  acceptRequest: async (
    friendshipId: string,
  ): Promise<FriendshipResponseDTO | null> => {
    try {
      const data = await api.put<any, any>(`/contacts/${friendshipId}/accept`);
      return data;
    } catch (error) {
      console.error("Lỗi khi chấp nhận lời mời:", error);
      return null;
    }
  },

  // Từ chối lời mời
  declineRequest: async (friendshipId: string): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/contacts/${friendshipId}/decline`);
      return true;
    } catch (error) {
      console.error("Lỗi khi từ chối lời mời:", error);
      return false;
    }
  },

  // Thu hồi lời mời
  revokeRequest: async (recipientId: string): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/contacts/request/revoke/${recipientId}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi thu hồi lời mời:", error);
      return false;
    }
  },

  // Xóa bạn
  removeFriend: async (friendId: string): Promise<boolean> => {
    try {
      await api.delete<any, any>(`/contacts/friend/${friendId}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa bạn bè:", error);
      return false;
    }
  },
};
