import { create } from "zustand";

export type OnlineUser = {
  status: "online" | "offline";
  last_active?: number;
};

interface SocketState {
  isConnected: boolean;
  onlineUsers: Record<string, OnlineUser>;

  setIsConnected: (connected: boolean) => void;
  setOnlineUser: (
    userId: string,
    status: "online" | "offline",
    last_active?: number,
  ) => void;
  setOnlineUsers: (users: Record<string, OnlineUser>) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  onlineUsers: {},

  setIsConnected: (connected) => set({ isConnected: connected }),
  setOnlineUser: (userId, status, last_active) =>
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: { status, last_active },
      },
    })),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
