import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      // Khi gọi hàm này, Zustand vừa update state, vừa tự động lưu vào localStorage
      setToken: (token) => set({ token, isAuthenticated: true }),
      // Xóa state và xóa luôn dưới localStorage
      logout: () => set({ token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // Tên key lưu dưới Application -> LocalStorage
    }
  )
);