import { io, Socket } from "socket.io-client";

const getSocketUrl = () => {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8888`;
  }
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
    "http://localhost:8888"
  );
};
const SOCKET_URL = getSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private attachedEvents: Set<string> = new Set();
  private activePostRooms: Set<string> = new Set();

  connect() {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    if (this.socket) {
      // Nếu token thay đổi, cập nhật token mới và kết nối lại
      if (this.socket.auth && (this.socket.auth as any).token !== token) {
        console.log("🔄 [Socket] Token changed, reconnecting with new token...");
        this.socket.auth = { token };
        this.socket.disconnect().connect();
      } else if (!this.socket.connected) {
        console.log("🔌 [Socket] Already initialized but disconnected, connecting...");
        this.socket.connect();
      }
      return;
    }

    console.log("🔌 [Socket] Connecting for the first time...");

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

      // Auto re-join active post rooms
      this.activePostRooms.forEach((postId) => {
        console.log(`[Socket] Auto re-joining post room post_${postId}`);
        this.socket?.emit("joinPost", postId);
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

    this.socket.on("FORCE_LOGOUT", (data) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("force_logout", { detail: data }));
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

  /**
   * Safe method to remove a specific listener callback for an event.
   */
  public removeListener(event: string, callback: (data: any) => void) {
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

  /**
   * Generic subscription helper. Returns an unregister function.
   */
  private subscribe(event: string, callback: (data: any) => void): () => void {
    this.addListener(event, callback);
    return () => this.removeListener(event, callback);
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
    return this.subscribe("NEW_FRIEND_REQUEST", callback);
  }

  onFriendRequestAccepted(callback: (data: any) => void) {
    return this.subscribe("FRIEND_REQUEST_ACCEPTED", callback);
  }

  onFriendListUpdated(callback: (data: any) => void) {
    return this.subscribe("FRIEND_LIST_UPDATED", callback);
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
    return this.subscribe("CONVERSATION_PIN_UPDATED", callback);
  }

  onLabelUpdated(callback: (data: any) => void) {
    return this.subscribe("CONVERSATION_LABEL_UPDATED", callback);
  }

  onConversationCreated(callback: (data: any) => void) {
    return this.subscribe("CONVERSATION_CREATED", callback);
  }

  onConversationRemoved(callback: (data: any) => void) {
    return this.subscribe("CONVERSATION_REMOVED", callback);
  }

  onConversationUpdated(callback: (data: any) => void) {
    return this.subscribe("CONVERSATION_UPDATED", callback);
  }

  onGroupUpdated(callback: (data: any) => void) {
    return this.subscribe("GROUP_UPDATED", callback);
  }

  onNewJoinRequest(callback: (data: any) => void) {
    return this.subscribe("NEW_JOIN_REQUEST", callback);
  }

  onJoinRequestApproved(callback: (data: any) => void) {
    return this.subscribe("JOIN_REQUEST_APPROVED", callback);
  }

  onJoinRequestRejected(callback: (data: any) => void) {
    return this.subscribe("JOIN_REQUEST_REJECTED", callback);
  }

  onNewInvitation(callback: (data: any) => void) {
    return this.subscribe("NEW_INVITATION", callback);
  }

  onAddedToGroup(callback: (data: any) => void) {
    return this.subscribe("ADDED_TO_GROUP", callback);
  }

  onInvitationAccepted(callback: (data: any) => void) {
    return this.subscribe("INVITATION_ACCEPTED", callback);
  }

  onGroupBanned(callback: (data: any) => void) {
    return this.subscribe("GROUP_BANNED", callback);
  }

  onGroupDisbanded(callback: (data: any) => void) {
    return this.subscribe("GROUP_DISBANDED", callback);
  }

  // --- Messaging ---
  joinRoom(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("joinRoom", conversationId);
    }
  }

  onMessageReceived(callback: (message: any) => void) {
    return this.subscribe("message-received", callback);
  }

  onMessagesRead(callback: (data: any) => void) {
    return this.subscribe("messages-read", callback);
  }

  onMessageReactionUpdated(callback: (data: any) => void) {
    return this.subscribe("message-reaction-updated", callback);
  }

  onMessageRevoked(callback: (data: any) => void) {
    return this.subscribe("message-revoked", callback);
  }

  onMessagePinned(callback: (data: any) => void) {
    return this.subscribe("message-pinned", callback);
  }

  onMessageUpdated(callback: (data: any) => void) {
    return this.subscribe("message-updated", callback);
  }

  onPollUpdated(callback: (data: any) => void) {
    return this.subscribe("POLL_UPDATED", callback);
  }

  // --- Typing ---
  onTyping(callback: (data: any) => void) {
    return this.subscribe("TYPING", callback);
  }

  onStopTyping(callback: (data: any) => void) {
    return this.subscribe("STOP_TYPING", callback);
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
  initiateCall(data: {
    targetRoom: string;
    caller: any;
    isVideo: boolean;
    inviteeIds?: string[];
    isGroup?: boolean;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_INITIATED", data);
    }
  }

  onIncomingCall(callback: (data: any) => void) {
    return this.subscribe("INCOMING_CALL", callback);
  }

  cancelCall(data: { targetRoom: string; inviteeIds?: string[] }) {
    if (this.socket?.connected) {
      this.socket.emit("CANCEL_CALL", data);
    }
  }

  onCallCanceled(callback: (data: any) => void) {
    return this.subscribe("CALL_CANCELED", callback);
  }

  declinedCall(data: { targetRoom: string }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_DECLINED", data);
    }
  }

  onCallDeclined(callback: (data: any) => void) {
    return this.subscribe("CALL_DECLINED", callback);
  }

  emitCallBusy(data: { targetRoom: string }) {
    if (this.socket?.connected) {
      this.socket.emit("CALL_BUSY", data);
    }
  }

  onCallBusy(callback: (data: any) => void) {
    return this.subscribe("CALL_BUSY", callback);
  }

  // --- User Status ---
  onUserOnline(callback: (data: any) => void) {
    return this.subscribe("USER_ONLINE", callback);
  }

  onUserOffline(callback: (data: any) => void) {
    return this.subscribe("USER_OFFLINE", callback);
  }

  onUserStatusResult(callback: (data: any) => void) {
    return this.subscribe("USER_STATUS_RESULT", callback);
  }

  onReminderDue(
    callback: (data: { title: string; conversationId: string }) => void,
  ) {
    return this.subscribe("REMINDER_DUE", callback);
  }

  // --- Social Post & Story Real-time ---
  joinPost(postId: string) {
    this.activePostRooms.add(postId);
    if (this.socket?.connected) {
      this.socket.emit("joinPost", postId);
    }
  }

  leavePost(postId: string) {
    this.activePostRooms.delete(postId);
    if (this.socket?.connected) {
      this.socket.emit("leavePost", postId);
    }
  }

  emitPostInteraction(postId: string, eventType: string, payload: any) {
    if (this.socket?.connected) {
      this.socket.emit("postInteraction", { postId, eventType, payload });
    }
  }

  onPostInteraction(callback: (data: { actorId: string; postId: string; eventType: string; payload: any }) => void) {
    return this.subscribe("POST_INTERACTION", callback);
  }

  emitNewPost(friendIds: string[], post: any) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_NEW_POST", { friendIds, post });
    }
  }

  onNewPostReceived(callback: (post: any) => void) {
    return this.subscribe("NEW_POST_RECEIVED", callback);
  }

  emitPostDeleted(friendIds: string[], postId: string) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_POST_DELETED", { friendIds, postId });
    }
  }

  onPostDeletedReceived(callback: (data: { postId: string }) => void) {
    return this.subscribe("POST_DELETED_RECEIVED", callback);
  }

  emitNewStory(friendIds: string[], story: any) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_NEW_STORY", { friendIds, story });
    }
  }

  onNewStoryReceived(callback: (story: any) => void) {
    return this.subscribe("NEW_STORY_RECEIVED", callback);
  }

  emitStoryDeleted(friendIds: string[], storyId: string) {
    if (this.socket?.connected) {
      this.socket.emit("EMIT_STORY_DELETED", { friendIds, storyId });
    }
  }

  onStoryDeletedReceived(callback: (data: { storyId: string }) => void) {
    return this.subscribe("STORY_DELETED_RECEIVED", callback);
  }

  onNewNotification(callback: (notification: any) => void) {
    return this.subscribe("NEW_NOTIFICATION", callback);
  }

  onStoryViewed(callback: (data: { storyId: string; viewerId: string; viewers: any[]; viewCount: number }) => void) {
    return this.subscribe("STORY_VIEWED", callback);
  }

  onStoryReacted(callback: (data: { storyId: string; reactions: any[]; reactionCount: number }) => void) {
    return this.subscribe("STORY_REACTED", callback);
  }
}

export const socketService = new SocketService();
