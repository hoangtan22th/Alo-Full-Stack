import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  fullName: string;
  avatar: string;
  email: string;
  phoneNumber: string;
  gender: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (accessToken: string, refreshToken: string, userId: string) => void;
  setUser: (user: User) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  fetchProfile: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, refreshToken, userId) => {
        // Đồng bộ với localStorage để axios dễ lấy
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({ accessToken, refreshToken, userId, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      updateTokens: (accessToken, refreshToken) => {
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        }));
      },

      fetchProfile: async () => {
        try {
          const { default: api } = await import("../services/api");
          const res = await api.get("/auth/me");
          // API interceptor đã unwrap response.data.data,
          // nên res có thể là user object trực tiếp, hoặc vẫn là { data: user }
          const userData = (res as any)?.id || (res as any)?._id
            ? res  // res đã là user object
            : (res as any)?.data?.data || (res as any)?.data || res;
          if (userData && ((userData as any).id || (userData as any)._id)) {
            set((state) => ({
              ...state,
              user: userData as User,
              userId: (userData as any).id || (userData as any)._id,
            }));
          }
        } catch (error) {
          console.error("Failed to fetch profile", error);
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          user: null,
          isAuthenticated: false,
        });

        // Dọn dẹp token trong local storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      },
    }),
    {
      name: "auth-storage", // Tên key lưu state vào localStorage
    },
  ),
);
