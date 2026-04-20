import mongoose, { Schema, Document } from "mongoose";

export interface IReminder extends Document {
  conversationId: string;
  creatorId: string;
  title: string;
  time: Date;
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "MANY_DAYS_WEEKLY";
  repeatDays?: number[]; // 0-6 (Sunday-Saturday)
  remindFor: "CREATOR" | "GROUP";
  status: "ACTIVE" | "DONE" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true },
    creatorId: { type: String, required: true },
    title: { type: String, required: true },
    time: { type: Date, required: true },
    repeat: {
      type: String,
      enum: ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "MANY_DAYS_WEEKLY"],
      default: "NONE",
    },
    repeatDays: { type: [Number], default: [] },
    remindFor: {
      type: String,
      enum: ["CREATOR", "GROUP"],
      default: "GROUP",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DONE", "CANCELLED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },
);

export default mongoose.model<IReminder>("Reminder", ReminderSchema);
