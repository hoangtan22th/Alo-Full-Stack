"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { toast } from "sonner";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:3000";

export function useAdminSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAdmin } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!isAdmin) return;

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const token = getCookie("admin_token");
    if (!token) return;

    // Initialize socket
    const socket = io(REALTIME_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to Admin Realtime");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
      setIsConnected(false);
    });

    socket.on("NEW_REPORT", (payload) => {
      console.log("[Socket.IO] New Report Received:", payload);
      
      // Add to store
      addNotification({
        type: "REPORT",
        title: "Báo cáo vi phạm mới",
        description: `Đối tượng: ${payload.targetName} | Lý do: ${payload.reason}`,
        link: "/reports",
      });

      toast.error("Báo cáo vi phạm mới!", {
        description: `Đối tượng: ${payload.targetName} | Lý do: ${payload.reason}`,
        action: {
          label: "Xem ngay",
          onClick: () => (window.location.href = "/reports"),
        },
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAdmin, addNotification]);

  return { isConnected };
}
