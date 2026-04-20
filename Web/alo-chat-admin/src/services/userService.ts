import { axiosClient } from "@/lib/axiosClient";

const API_URL = "/users"; // Map qua gateway route của user-service: /api/v1/admin/management/users

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatar?: string;
  isOnline: boolean;
  isBanned: boolean;
  lastActive: string;
  createdAt: string;
  gender?: string;
  dateOfBirth?: string;
  bio?: string;
}

export interface PaginatedUsers {
  content: User[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export const userService = {
  getAllUsers: async (query?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedUsers> => {
    try {
      const response = await axiosClient.get(API_URL, { params: query });
      return (
        response.data?.data || {
          content: [],
          totalPages: 0,
          totalElements: 0,
          number: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  banUser: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error("Error banning user:", error);
      throw error;
    }
  },

  updateUser: async (id: string, data: any): Promise<User> => {
    try {
      const response = await axiosClient.put(`${API_URL}/${id}`, data);
      return response.data?.data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
};
