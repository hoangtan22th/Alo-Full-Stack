import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8888";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private attachedEvents: Set<string> = new Set();

  connect() {
    if (this.socket) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    console.log("🔌 [Socket] Connecting...");

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("🚀 [Socket] Connected ID:", this.socket?.id);
      // Khi reconnect, socket.io tự động giữ lại các listener đã gán bằng .on()
      // Nhưng vì chúng ta dùng wrapper, chúng ta cần đảm bảo wrapper đã được gán
      this.listeners.forEach((_, event) => {
        this.attachSocketWrapper(event);
      });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ [Socket] Disconnected:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, you need to reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ [Socket] Error:", error.message);
    });

    this.socket.on("FORCE_LOGOUT", () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("force_logout"));
      }
    });
  }

  private attachSocketWrapper(event: string) {
    if (!this.socket) return;

    // Chỉ gán wrapper duy nhất một lần cho mỗi event trên instance socket này
    if (this.attachedEvents.has(event)) return;

    this.socket.on(event, (data: any) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error(`Error in socket callback [${event}]:`, err);
          }
        });
      }
    });
    this.attachedEvents.add(event);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.attachedEvents.clear();
    }
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  private addListener(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    if (this.socket) {
      this.attachSocketWrapper(event);
    }
  }

  private removeListener(event: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
        if (this.socket) {
          this.socket.off(event);
          this.attachedEvents.delete(event);
        }
      }
    }
  }

  // Phương thức tương thích ngược với code cũ sử dụng .off(event)
  // Lưu ý: .off() truyền thống của socket.io sẽ gỡ sạch mọi callback của event đó
  off(event: string) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
      this.attachedEvents.delete(event);
    }
  }

  // --- Social Events ---
  onFriendRequestReceived(callback: (data: any) => void) {
    this.addListener("NEW_FRIEND_REQUEST", callback);
  }

  onFriendRequestAccepted(callback: (data: any) => void) {
    this.addListener("FRIEND_REQUEST_ACCEPTED", callback);
  }

  onFriendListUpdated(callback: (data: any) => void) {
    this.addListener("FRIEND_LIST_UPDATED", callback);
  }

  emitFriendRequestSent(data: {
    recipientId: string;
    requesterName: string;
    requesterAvatar?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_FRIEND_REQUEST_SENT", data);
    }
  }

  emitFriendRequestAccepted(data: {
    recipientId: string;
    accepterName: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_FRIEND_REQUEST_ACCEPTED", data);
    }
  }

  // --- Conversation Management ---
  onPinUpdated(callback: (data: any) => void) {
    this.addListener("CONVERSATION_PIN_UPDATED", callback);
  }

  onLabelUpdated(callback: (data: any) => void) {
    this.addListener("CONVERSATION_LABEL_UPDATED", callback);
  }

  onConversationCreated(callback: (data: any) => void) {
    this.addListener("CONVERSATION_CREATED", callback);
  }

  onConversationRemoved(callback: (data: any) => void) {
    this.addListener("CONVERSATION_REMOVED", callback);
  }

  onConversationUpdated(callback: (data: any) => void) {
    this.addListener("CONVERSATION_UPDATED", callback);
  }

  onGroupUpdated(callback: (data: any) => void) {
    this.addListener("GROUP_UPDATED", callback);
  }

  // --- Messaging ---
  joinRoom(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("joinRoom", conversationId);
    }
  }

  onMessageReceived(callback: (message: any) => void) {
    this.addListener("message-received", callback);
  }

  onMessagesRead(callback: (data: any) => void) {
    this.addListener("messages-read", callback);
  }

  onMessageReactionUpdated(callback: (data: any) => void) {
    this.addListener("message-reaction-updated", callback);
  }

  onMessageRevoked(callback: (data: any) => void) {
    this.addListener("message-revoked", callback);
  }

  onMessagePinned(callback: (data: any) => void) {
    this.addListener("message-pinned", callback);
  }

  onMessageUpdated(callback: (data: any) => void) {
    this.addListener("message-updated", callback);
  }

  // --- Typing ---
  onTyping(callback: (data: any) => void) {
    this.addListener("TYPING", callback);
  }

  onStopTyping(callback: (data: any) => void) {
    this.addListener("STOP_TYPING", callback);
  }

  emitTyping(data: { target: string; isGroup: boolean }) {
    if (this.socket?.connected) {
      this.socket.emit("TYPING", data);
    }
  }

  emitStopTyping(data: { target: string; isGroup: boolean }) {
    if (this.socket?.connected) {
      this.socket.emit("STOP_TYPING", data);
    }
  }

  // --- Call Signaling ---
  initiateCall(data: { targetRoom: string; caller: any; isVideo: boolean; inviteeIds?: string[] }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_INITIATED", data);
    }
  }

  onIncomingCall(callback: (data: any) => void) {
    this.addListener("INCOMING_CALL", callback);
  }

  cancelCall(data: { targetRoom: string; inviteeIds?: string[] }) {
    if (this.socket?.connected) {
      this.socket.emit("CANCEL_CALL", data);
    }
  }

  onCallCanceled(callback: (data: any) => void) {
    this.addListener("CALL_CANCELED", callback);
  }

  declinedCall(data: { targetRoom: string }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_DECLINED", data);
    }
  }

  onCallDeclined(callback: (data: any) => void) {
    this.addListener("CALL_DECLINED", callback);
  }

  emitCallBusy(data: { targetRoom: string }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_BUSY", data);
    }
  }

  onCallBusy(callback: (data: any) => void) {
    this.addListener("CALL_BUSY", callback);
  }
}

export const socketService = new SocketService();
