import { axiosClient } from "@/lib/axiosClient";

const API_URL = "/admins";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface PaginatedAdmins {
  content: AdminUser[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export const adminService = {
  getAllAdmins: async (query?: {
    search?: string;
    roleFilter?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedAdmins> => {
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
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch admins",
      );
    }
  },

  createAdmin: async (
    adminData: Omit<AdminUser, "id" | "createdAt" | "role"> & {
      role: string;
      password: string;
    },
  ): Promise<AdminUser> => {
    try {
      const response = await axiosClient.post(API_URL, adminData);
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data; // Throw the whole backend ApiResponse
      }
      throw new Error("Failed to create admin");
    }
  },

  deleteAdmin: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_URL}/${id}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete admin",
      );
    }
  },

  updateAdmin: async (
    id: string,
    updateData: { name: string; role: string; password?: string },
  ): Promise<any> => {
    try {
      const response = await axiosClient.put(`${API_URL}/${id}`, updateData);
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data; // Throw the whole backend ApiResponse
      }
      throw new Error("Failed to update admin");
    }
  },
};
