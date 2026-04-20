interface UserPresence {
  userId: string;
  socketId: string;
  conversationIds: Set<string>;
  isOnline: boolean;
}

interface TypingStatus {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

/**
 * Service to manage user presence (online/offline, typing status)
 * Uses in-memory storage. Can be replaced with Redis for distributed systems.
 */
export class PresenceService {
  private userPresences: Map<string, UserPresence> = new Map();
  private typingStatuses: Map<string, Map<string, boolean>> = new Map(); // conversationId -> (userId -> isTyping)

  /**
   * Set user online
   */
  setOnline(userId: string, socketId: string): void {
    const presence = this.userPresences.get(userId) || {
      userId,
      socketId,
      conversationIds: new Set(),
      isOnline: false,
    };

    presence.socketId = socketId;
    presence.isOnline = true;
    this.userPresences.set(userId, presence);

    console.log(`[PresenceService] User online: ${userId}`);
  }

  /**
   * Join conversation
   */
  joinConversation(userId: string, conversationId: string): void {
    const presence = this.userPresences.get(userId);
    if (presence) {
      presence.conversationIds.add(conversationId);
      console.log(`[PresenceService] User joined conversation: ${userId} -> ${conversationId}`);
    }
  }

  /**
   * Leave conversation
   */
  leaveConversation(userId: string, conversationId: string): void {
    const presence = this.userPresences.get(userId);
    if (presence) {
      presence.conversationIds.delete(conversationId);
    }

    // Clear typing status
    const convTyping = this.typingStatuses.get(conversationId);
    if (convTyping) {
      convTyping.delete(userId);
    }

    console.log(`[PresenceService] User left conversation: ${userId} -> ${conversationId}`);
  }

  /**
   * Get online users in a conversation
   */
  getOnlineUsers(conversationId: string): string[] {
    const onlineUsers: string[] = [];

    this.userPresences.forEach((presence) => {
      if (presence.isOnline && presence.conversationIds.has(conversationId)) {
        onlineUsers.push(presence.userId);
      }
    });

    return onlineUsers;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const presence = this.userPresences.get(userId);
    return presence?.isOnline || false;
  }





  /**
   * Get user presence info
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresences.get(userId);
  }

  /**
   * Clear all presence data (for cleanup)
   */
  clearAll(): void {
    this.userPresences.clear();
    this.typingStatuses.clear();
  }
}

export default new PresenceService();
