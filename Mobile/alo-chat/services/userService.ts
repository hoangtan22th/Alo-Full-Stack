import api from "./api";

export interface UserProfileDTO {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatar: string;
  coverImage: string;
  gender: number;
  dateOfBirth: string;
  isOnline: boolean;
  isBanned: boolean;
}

export const userService = {
  getUserById: async (id: string): Promise<UserProfileDTO | null> => {
    try {
      const response = await api.get<any, any>(`/users/${id}`);
      // Interceptor should have already returned response.data.data
      // But if it didn't for some reason, we handle it
      if (response && response.status === 200 && response.data) {
        return response.data as UserProfileDTO;
      }
      return response as UserProfileDTO;
    } catch (error) {
      console.error("Lỗi khi tải thông tin user:", error);
      return null;
    }
  },

  searchByPhone: async (phone: string): Promise<UserProfileDTO[]> => {
    try {
      const res = await api.get<any, any>(`/users/search`, {
        params: { phoneNumber: phone },
      });
      // Backend returns ApiResponse { data: PageResponse { content: UserDto[] } }
      const data = res?.data?.data ? res.data.data : res?.data ? res.data : res;
      if (data?.content) return data.content;
      if (Array.isArray(data)) return data;
      return [];
    } catch (error) {
      console.error("Lỗi khi tìm kiếm user theo số điện thoại:", error);
      return [];
    }
  },
};
