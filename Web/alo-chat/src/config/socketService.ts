// src/config/socketService.ts
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

export let socket: Socket | null = null;

export const connectSocket = () => {
  const token = useAuthStore.getState().token;
  if (!token) return;

  // Nếu đã kết nối rồi thì không tạo mới
  if (socket?.connected) return;

  socket = io("http://localhost:8888", {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => console.log("Socket connected:", socket?.id));
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
