"use client";

import { useEffect } from "react";
import { socketService } from "../../services/socketService";
import { useSocketStore } from "../../store/useSocketStore";

export function SocketManager() {
  const setOnlineUser = useSocketStore((state) => state.setOnlineUser);
  const setIsConnected = useSocketStore((state) => state.setIsConnected);

  useEffect(() => {
    // Sync connection state dynamically if needed
    const interval = setInterval(() => {
      setIsConnected(socketService.connected);
    }, 2000);

    const handleUserOnline = (data: { userId: string; status: string }) => {
      if (data.status === "online") {
        setOnlineUser(data.userId, "online");
      }
    };

    const handleUserOffline = (data: {
      userId: string;
      status: string;
      last_active: number;
    }) => {
      if (data.status === "offline") {
        setOnlineUser(data.userId, "offline", data.last_active);
      }
    };

    const handleUserStatusResult = (data: {
      userId: string;
      status: string;
      last_active?: number;
    }) => {
      setOnlineUser(
        data.userId,
        data.status as "online" | "offline",
        data.last_active,
      );
    };

    socketService.onUserOnline(handleUserOnline as any);
    socketService.onUserOffline(handleUserOffline as any);
    socketService.onUserStatusResult(handleUserStatusResult as any);

    return () => {
      clearInterval(interval);
      socketService.off("USER_ONLINE");
      socketService.off("USER_OFFLINE");
      socketService.off("USER_STATUS_RESULT");
    };
  }, [setOnlineUser, setIsConnected]);

  return null;
}
