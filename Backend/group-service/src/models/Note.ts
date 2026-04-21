import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  conversationId: mongoose.Types.ObjectId;
  creatorId: string;
  content: string;
  links: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    creatorId: { type: String, required: true },
    content: { type: String, required: true },
    links: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<INote>("Note", NoteSchema);

