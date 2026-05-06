import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";

export interface Notification {
  id: string;
  type: "REPORT" | "SYSTEM" | "USER";
  title: string;
  description: string;
  timestamp: string; // ISO string for persistence compatibility
  read: boolean;
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

/**
 * Custom storage wrapper to handle dynamic keys based on logged-in adminId.
 * This satisfies the requirement: admin_noti_${adminId}
 */
const dynamicStorage = {
  getItem: (name: string): string | null => {
    const adminId = useAuthStore.getState().adminId;
    if (!adminId) return null;
    return localStorage.getItem(`${name}_${adminId}`);
  },
  setItem: (name: string, value: string): void => {
    const adminId = useAuthStore.getState().adminId;
    if (adminId) {
      localStorage.setItem(`${name}_${adminId}`, value);
    }
  },
  removeItem: (name: string): void => {
    const adminId = useAuthStore.getState().adminId;
    if (adminId) {
      localStorage.removeItem(`${name}_${adminId}`);
    }
  },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notif) => {
        const newNotif: Notification = {
          ...notif,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50), // Increased to 50 for admin
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          if (!notif || notif.read) return state;

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: "admin_noti", // Base name, dynamicStorage will append _${adminId}
      storage: createJSONStorage(() => dynamicStorage),
      partialize: (state) => ({ notifications: state.notifications }), // Only persist notifications
      onRehydrateStorage: () => (state) => {
        // Recalculate unreadCount after rehydration
        if (state) {
          state.unreadCount = state.notifications.filter(n => !n.read).length;
        }
      }
    }
  )
);
