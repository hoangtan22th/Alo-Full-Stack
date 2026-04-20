import { axiosClient } from "@/lib/axiosClient";
import { useAuthStore } from "@/store/useAuthStore";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";

export const authService = {
  login: async (email: string, password: string) => {
    try {
      // axiosClient accepts full URLs and overrides baseURL automatically
      const response = await axiosClient.post(`${GATEWAY_URL}/api/v1/admin/auth/login`, {
        email,
        password,
      });

      const token = response.data?.data?.accessToken;
      if (!token) {
        throw new Error("Invalid credentials or unauthorized role");
      }
      return token;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Login failed"
      );
    }
  },

  logout: async () => {
    try {
      // axiosClient automatically extracts the token from cookies and injects it into headers
      await axiosClient.post(
        `${GATEWAY_URL}/api/v1/auth/logout`,
        {},
        {
          withCredentials: true, // forward refreshToken cookie to backend for blacklisting
        }
      );
    } catch (error) {
      console.error("Backend logout failed:", error);
    } finally {
      // Safe redirect and client state cleanup from out global store
      useAuthStore.getState().logout();
    }
  },
};
