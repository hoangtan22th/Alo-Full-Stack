// src/models/Conversation.ts
import mongoose, { Schema, Document, Types } from "mongoose";

// 1. Định nghĩa Interface cho thành viên (Sub-document)
export interface IMember {
  userId: string;
  role: "LEADER" | "DEPUTY" | "MEMBER";
  joinedAt: Date;
}

// 2. Định nghĩa Interface cho Cuộc trò chuyện (Document chính)
// Kế thừa Document của mongoose để có sẵn các hàm như .save(), ._id
export interface IConversation extends Document {
  name: string;
  groupAvatar: string;
  isGroup: boolean;
  lastMessage?: Types.ObjectId; // Dấu ? nghĩa là không bắt buộc (optional)
  members: IMember[];
  mutedBy: string[];
  hiddenBy: string[];
  joinRequests: { userId: string; requestedAt: Date }[];
  isBanned: boolean;
  isApprovalRequired: boolean;
  isLinkEnabled: boolean; // Add isLinkEnabled field
  // Các trường do timestamps tự sinh ra:
  createdAt: Date;
  updatedAt: Date;
}

// 3. Khởi tạo Schema và nhúng Interface vào <IConversation>
const conversationSchema = new Schema<IConversation>(
  {
    name: { type: String, required: true },
    groupAvatar: { type: String, default: "" },
    isGroup: { type: Boolean, default: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },

    // Danh sách thành viên
    members: [
      {
        userId: { type: String, required: true },
        role: {
          type: String,
          enum: ["LEADER", "DEPUTY", "MEMBER"],
          default: "MEMBER",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    mutedBy: [{ type: String }],
    hiddenBy: [{ type: String }],
    joinRequests: [
      {
        userId: { type: String, required: true },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    isApprovalRequired: { type: Boolean, default: false },
    isLinkEnabled: { type: Boolean, default: false }, // Add isLinkEnabled schema logic
    isBanned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// 4. Export Model chuẩn TypeScript
export default mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);
