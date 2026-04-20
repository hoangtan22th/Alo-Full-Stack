// src/models/PinnedConversation.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPinnedConversation extends Document {
  userId: string;
  conversationId: Types.ObjectId;
  createdAt: Date;
}

const pinnedConversationSchema = new Schema<IPinnedConversation>(
  {
    userId: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Mỗi user chỉ ghim một cuộc hội thoại tối đa 1 lần
pinnedConversationSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export default mongoose.model<IPinnedConversation>("PinnedConversation", pinnedConversationSchema);
