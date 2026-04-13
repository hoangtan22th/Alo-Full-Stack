// Message Interface
export interface Message {
  _id?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  isDeleted: boolean; // Thu hồi cho tất cả
  deletedByUsers?: string[]; // Xóa chỉ ở phía tôi
  createdAt?: string;
  updatedAt?: string;
}

// Conversation Interface (Group)
export interface Conversation {
  _id: string;
  name: string;
  avatar?: string;
  description?: string;
  members: Array<{
    userId: string;
    name: string;
    avatar?: string;
    role: 'LEADER' | 'DEPUTY' | 'MEMBER';
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Socket Events
export interface SocketEventPayload {
  'join-room': { conversationId: string };
  'send-message': Omit<Message, '_id' | 'createdAt' | 'updatedAt'>;
  'receive-message': Message;
  'message-read': { messageId: string; userId: string };
  'message-deleted': { messageId: string; deletedFor?: string[] };
  'user-typing': { conversationId: string; userId: string; isTyping: boolean };
  'user-joined': { conversationId: string; userId: string };
  'user-left': { conversationId: string; userId: string };
}
