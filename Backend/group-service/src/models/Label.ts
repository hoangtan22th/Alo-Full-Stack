import mongoose, { Schema, Document } from "mongoose";

export interface ILabel extends Document {
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<ILabel>(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#6b7280" },
    userId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILabel>("Label", labelSchema);
