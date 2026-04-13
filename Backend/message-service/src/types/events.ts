/**
 * Event type definitions for RabbitMQ messaging
 */

export interface MessageEvent {
  _id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PresenceEvent {
  userId: string;
  conversationId: string;
  status: 'online' | 'offline' | 'typing' | 'stopped-typing';
  timestamp: Date;
  socketId?: string;
}

export interface TypingEvent {
  userId: string;
  conversationId: string;
  userName?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface UserPresenceChange {
  userId: string;
  conversationId: string;
  status: 'joined' | 'left';
  userName?: string;
  timestamp: Date;
}

export interface MessageReadEvent {
  messageId: string;
  messageIds?: string[];
  conversationId: string;
  userId: string;
  timestamp: Date;
}
