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
      let data = await api.get<any, any>(`/users/${id}`);
      // Nếu API không bọc trong ApiResponse mà trả thẳng object (UserDto), interceptor sẽ trả về toàn bộ Axios Response.
      if (data && data.data) {
        data = data.data;
      }
      return data;
    } catch (error) {
      console.error("Lỗi khi tải thông tin user:", error);
      return null;
    }
  },
};
