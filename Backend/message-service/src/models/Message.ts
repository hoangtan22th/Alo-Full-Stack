import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: string; // User ID from auth-service
  type: string; // 'text', 'image', 'file', etc.
  content: string;
  metadata?: Record<string, any>; // For attachments, links, etc.
  isRead: boolean;
  readBy?: string[]; // Array of user IDs who read this message
  revokedAt?: Date; // Soft delete
  editedAt?: Date;
  isRevoked: boolean; 
  deletedByUsers: string[];
  editHistory?: Array<{
    originalContent: string;
    editedAt: Date;
  }>;
  reactions: Array<{
    userId: string;
    emoji: string;
    count: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'emoji', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: {
      type: [String],
      default: [],
    },
    // BẮT BUỘC PHẢI THÊM VÀO ĐÂY:
    isRevoked: {
      type: Boolean,
      default: false,
    },
    deletedByUsers: {
      type: [String],
      default: [],
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editHistory: {
      type: [
        {
          originalContent: String,
          editedAt: Date,
        },
      ],
      default: [],
    },
    reactions: {
      type: [
        {
          userId: String,
          emoji: String,
          count: { type: Number, default: 1 },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Indexes for better query performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: 1 });

// Methods
messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Message = model<IMessage>('Message', messageSchema);
