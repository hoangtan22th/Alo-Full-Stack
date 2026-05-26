import { Schema, model, Document } from "mongoose";

export interface IBroadcastCampaign extends Document {
  title: string;
  content: string;
  senderId: string;
  targetCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

const broadcastCampaignSchema = new Schema<IBroadcastCampaign>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    targetCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
    },
  },
  {
    timestamps: true,
  }
);

export const BroadcastCampaign = model<IBroadcastCampaign>("BroadcastCampaign", broadcastCampaignSchema);
