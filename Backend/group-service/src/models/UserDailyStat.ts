import mongoose, { Schema, Document } from "mongoose";

export interface IUserDailyStat extends Document {
  userId: string;
  date: Date;
  messagesSent: number;
  groupsJoined: number;
  totalCallMinutes: number;
  newFriendsAdded: number;
  topChatPartnerId: string | null;
  mostActiveHour: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const userDailyStatSchema = new Schema<IUserDailyStat>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true }, // Should represent the start of the day (00:00:00.000)
    messagesSent: { type: Number, default: 0 },
    groupsJoined: { type: Number, default: 0 },
    totalCallMinutes: { type: Number, default: 0 },
    newFriendsAdded: { type: Number, default: 0 },
    topChatPartnerId: { type: String, default: null },
    mostActiveHour: { type: Number, min: 0, max: 23, default: null },
  },
  {
    timestamps: true,
  }
);

// Crucial: Compound unique index to prevent duplicate records per user per day if the job runs multiple times
userDailyStatSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IUserDailyStat>("UserDailyStat", userDailyStatSchema);
