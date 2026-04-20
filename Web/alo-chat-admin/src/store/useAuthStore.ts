import { create } from "zustand";

interface AuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminEmail: string | null;
  adminName: string | null;
  checkAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAdmin: false,
  isSuperAdmin: false,
  adminEmail: null,
  adminName: null,

  checkAuth: () => {
    if (typeof window === "undefined") return;

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const token = getCookie("admin_token");
    if (!token) {
      set({
        isAdmin: false,
        isSuperAdmin: false,
        adminEmail: null,
        adminName: null,
      });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const roles = payload.roles || payload.authorities || [];
      const isSuperAdmin =
        roles.includes("ROLE_SUPER_ADMIN") || roles === "ROLE_SUPER_ADMIN";
      const isAdmin =
        isSuperAdmin || roles.includes("ROLE_ADMIN") || roles === "ROLE_ADMIN";

      const adminEmail = payload.email || payload.sub || "Admin";
      const adminName =
        payload.fullName || payload.name || adminEmail.split("@")[0];

      set({ isAdmin, isSuperAdmin, adminEmail, adminName });
    } catch (e) {
      set({
        isAdmin: false,
        isSuperAdmin: false,
        adminEmail: null,
        adminName: null,
      });
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      document.cookie = "admin_token=; Max-Age=0; path=/";
      set({
        isAdmin: false,
        isSuperAdmin: false,
        adminEmail: null,
        adminName: null,
      });
      window.location.href = "/login";
    }
  },
}));
