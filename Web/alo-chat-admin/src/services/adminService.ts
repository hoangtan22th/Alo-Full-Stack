import { axiosClient } from "@/lib/axiosClient";

const API_URL = "/admins";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export const adminService = {
  getAllAdmins: async (): Promise<AdminUser[]> => {
    try {
      const response = await axiosClient.get(API_URL);
      return response.data?.data || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch admins");
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
      throw new Error(error.response?.data?.message || "Failed to create admin");
    }
  },

  deleteAdmin: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_URL}/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to delete admin");
    }
  },
};
