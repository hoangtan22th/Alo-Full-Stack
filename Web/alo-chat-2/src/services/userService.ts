import api from "./api";

export interface UserProfileDTO {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  avatar: string;
  coverImage: string;
  gender: string; // "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY"
  dateOfBirth?: string;
  isOnline?: boolean;
  isBanned?: boolean;
  bio?: string;
  timezone?: string;
  locale?: string;
}

export const userService = {
  // Lấy thông tin user theo ID (xem hồ sơ người khác)
  getUserById: async (id: string): Promise<UserProfileDTO | null> => {
    try {
      const data = await api.get<any, any>(`/users/${id}`);
      return data;
    } catch (error) {
      console.error("Lỗi khi tải thông tin user:", error);
      return null;
    }
  },

  // Lấy hồ sơ cá nhân của user đang đăng nhập
  getMyProfile: async (): Promise<UserProfileDTO | null> => {
    try {
      const data = await api.get<any, any>(`/users/me`);
      return data;
    } catch (error) {
      console.error("Lỗi khi tải hồ sơ cá nhân:", error);
      return null;
    }
  },

  // Cập nhật thông tin text (fullName, gender, phoneNumber, bio...)
  updateMyProfile: async (payload: {
    fullName?: string;
    gender?: number;
    phoneNumber?: string;
    bio?: string;
    dateOfBirth?: string;
  }): Promise<UserProfileDTO | null> => {
    try {
      const data = await api.put<any, any>(`/users/me`, payload);
      return data;
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ:", error);
      return null;
    }
  },

  // Upload avatar mới
  updateMyAvatar: async (file: File): Promise<UserProfileDTO | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await api.post<any, any>(`/users/me/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      console.error("Lỗi khi cập nhật avatar:", error);
      return null;
    }
  },

  // Upload cover mới
  updateMyCover: async (file: File): Promise<UserProfileDTO | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await api.post<any, any>(`/users/me/cover`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      console.error("Lỗi khi cập nhật ảnh bìa:", error);
      return null;
    }
  },
};
