import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8888";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🚀 [Socket] Connected to Gateway");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ [Socket] Disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ [Socket] Connection Error:", error.message);
    });

    // Lắng nghe lệnh đá thiết bị từ hệ thống phòng khi dùng nhiều máy
    this.socket.on("FORCE_LOGOUT", (data) => {
      console.warn("⚠️ Received FORCE_LOGOUT from server:", data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("force_logout"));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  // Tham gia vào phòng chat của cuộc hội thoại
  joinRoom(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("join-room", { conversationId });
      console.log(`📡 [Socket] Joining room: ${conversationId}`);
    }
  }

  // Rời phòng chat
  leaveRoom(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("leave-room", { conversationId });
    }
  }

  // Lắng nghe tin nhắn mới
  onMessageReceived(callback: (message: any) => void) {
    this.socket?.on("message-received", callback);
  }

  // Gửi sự kiện đang gõ
  emitTyping(target: string, isGroup: boolean = true) {
    this.socket?.emit("TYPING", { target, isGroup });
  }

  // Gửi sự kiện dừng gõ
  emitStopTyping(target: string, isGroup: boolean = true) {
    this.socket?.emit("STOP_TYPING", { target, isGroup });
  }

  // Lắng nghe sự kiện đang gõ từ người khác
  onTyping(callback: (data: { actorId: string; roomId: string }) => void) {
    this.socket?.on("TYPING", callback);
  }

  // Lắng nghe sự kiện dừng gõ từ người khác
  onStopTyping(
    callback: (data: { actorId: string; roomId: string }) => void,
  ) {
    this.socket?.on("STOP_TYPING", callback);
  }

  // Lắng nghe trạng thái Online
  onUserOnline(
    callback: (data: { userId: string; status: string }) => void,
  ) {
    this.socket?.on("USER_ONLINE", callback);
  }

  // Lắng nghe trạng thái Offline
  onUserOffline(
    callback: (data: {
      userId: string;
      status: string;
      last_active: number;
    }) => void,
  ) {
    this.socket?.on("USER_OFFLINE", callback);
  }

  // Lắng nghe sự kiện đối phương đã đọc tin nhắn
  onMessagesRead(
    callback: (data: {
      conversationId: string;
      userId: string;
      readAt: string;
    }) => void,
  ) {
    this.socket?.on("messages-read", callback);
  }

  // Lắng nghe sự kiện cập nhật cảm xúc
  onMessageReactionUpdated(
    callback: (data: { messageId: string; reactions: any[] }) => void,
  ) {
    this.socket?.on("message-reaction-updated", callback);
  }

  // Hủy lắng nghe một sự kiện
  off(event: string) {
    this.socket?.off(event);
  }
}

// Singleton — dùng chung toàn app
export const socketService = new SocketService();
