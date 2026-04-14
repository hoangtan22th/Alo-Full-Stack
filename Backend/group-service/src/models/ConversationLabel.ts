import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversationLabel extends Document {
  labelId: Types.ObjectId;
  conversationId: Types.ObjectId;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationLabelSchema = new Schema<IConversationLabel>(
  {
    labelId: { type: Schema.Types.ObjectId, ref: "Label", required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    userId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo mỗi hội thoại của mỗi user chỉ được gán tối đa 1 nhãn
conversationLabelSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IConversationLabel>("ConversationLabel", conversationLabelSchema);
