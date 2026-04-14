import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8888";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
        
    console.log(
      "🔌 [Socket] Attempting to connect with token:",
      token ? `${token.substring(0, 10)}...` : "NONE",
    );

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🚀 [Socket] Connected to Gateway");
      // Re-attach all buffered listeners upon reconnection
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb);
        });
      });
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

  private addListener(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // If already connected, attach immediately
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
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
    this.addListener("message-received", callback);
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
    this.addListener("TYPING", callback);
  }

  // Lắng nghe sự kiện dừng gõ từ người khác
  onStopTyping(
    callback: (data: { actorId: string; roomId: string }) => void,
  ) {
    this.addListener("STOP_TYPING", callback);
  }

  // Lắng nghe trạng thái Online
  onUserOnline(
    callback: (data: { userId: string; status: string }) => void,
  ) {
    this.addListener("USER_ONLINE", callback);
  }

  // Lắng nghe trạng thái Offline
  onUserOffline(
    callback: (data: {
      userId: string;
      status: string;
      last_active: number;
    }) => void,
  ) {
    this.addListener("USER_OFFLINE", callback);
  }

  // Lắng nghe sự kiện đối phương đã đọc tin nhắn
  onMessagesRead(
    callback: (data: {
      conversationId: string;
      userId: string;
      readAt: string;
    }) => void,
  ) {
    this.addListener("messages-read", callback);
  }

  // Lắng nghe sự kiện cập nhật cảm xúc
  onMessageReactionUpdated(
    callback: (data: { messageId: string; reactions: any[] }) => void,
  ) {
    this.addListener("message-reaction-updated", callback);
  }

  // Realtime Sync cho Ghim và Phân loại
  onPinUpdated(callback: (data: { conversationId: string; isPinned: boolean }) => void) {
    this.addListener("CONVERSATION_PIN_UPDATED", callback);
  }

  onLabelUpdated(callback: (data: { conversationId: string; label: any }) => void) {
    this.addListener("CONVERSATION_LABEL_UPDATED", callback);
  }

  // Lắng nghe sự kiện hội thoại mới được tạo
  onConversationCreated(callback: (newConvo: any) => void) {
    this.addListener("CONVERSATION_CREATED", callback);
  }

  onConversationRemoved(callback: (data: { conversationId: string }) => void) {
    this.addListener("CONVERSATION_REMOVED", callback);
  }

  onConversationUpdated(callback: (data: any) => void) {
    this.addListener("CONVERSATION_UPDATED", callback);
  }

  // Lắng nghe sự kiện thu hồi tin nhắn
  onMessageRevoked(callback: (data: { messageId: string, revokedAt?: string }) => void) {
    this.addListener("message-revoked", callback);
  }

  // Hủy lắng nghe một sự kiện
  off(event: string) {
    this.listeners.delete(event);
    this.socket?.off(event);
  }
}

// Singleton — dùng chung toàn app
export const socketService = new SocketService();
