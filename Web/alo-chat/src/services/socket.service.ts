import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:8888";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("🚀 [Socket] Connected to Gateway");
    });

    this.socket.on("disconnect", () => {
      console.log("❌ [Socket] Disconnected from Gateway");
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ [Socket] Connection Error:", error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Tham gia vào phòng chat của cuộc hội thoại
  joinRoom(conversationId: string) {
    if (this.socket) {
      this.socket.emit("join-room", { conversationId });
      // Lưu ý: Realtime-service thường dùng prefix room_ cho group
      console.log(`📡 [Socket] Joining room: room_${conversationId}`);
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
  onStopTyping(callback: (data: { actorId: string; roomId: string }) => void) {
    this.socket?.on("STOP_TYPING", callback);
  }

  // Lắng nghe trạng thái Online
  onUserOnline(callback: (data: { userId: string; status: string }) => void) {
    this.socket?.on("USER_ONLINE", callback);
  }

  // Lắng nghe trạng thái Offline
  onUserOffline(callback: (data: { userId: string; status: string; last_active: number }) => void) {
    this.socket?.on("USER_OFFLINE", callback);
  }

  // Lắng nghe sự kiện đối phương đã đọc tin nhắn
  onMessagesRead(callback: (data: { conversationId: string; userId: string; readAt: string }) => void) {
    this.socket?.on("messages-read", callback);
  }

  // Hủy lắng nghe một sự kiện
  off(event: string) {
    this.socket?.off(event);
  }
}

export default new SocketService();
