import mongoose, { Document, Schema } from 'mongoose';
import { IReaction, ReactionType } from './Post';

// ============ Types ============

export interface IStoryViewer {
  userId: string;
  viewedAt: Date;
}

export interface IStoryMusic {
  title: string;
  artist: string;
  url: string;
  lyrics?: string;
}

export interface IStory extends Document {
  userId: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  caption?: string;
  music?: IStoryMusic;
  viewers: IStoryViewer[];
  viewCount: number;
  reactions: IReaction[];
  reactionCount: number;
  privacy: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE' | 'CUSTOM';
  isArchived?: boolean;
  duration?: number; // Thời lượng xem story (ms)
  allowedUsers: string[];
  blockedUsers: string[];
  createdAt: Date;
  expiresAt: Date;
}

// ============ Schema ============

const reactionSchema = new Schema<IReaction>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
      required: true,
    },
  },
  { _id: false }
);

const storySchema = new Schema<IStory>(
  {
    userId: { type: String, required: true, index: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
    caption: { type: String, maxlength: 500 },
    music: {
      title: { type: String },
      artist: { type: String },
      url: { type: String },
      lyrics: { type: String },
    },
    viewers: [
      {
        userId: { type: String, required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    viewCount: { type: Number, default: 0 },
    reactions: { type: [reactionSchema], default: [] },
    reactionCount: { type: Number, default: 0 },
    privacy: {
      type: String,
      enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'CUSTOM'],
      default: 'FRIENDS_ONLY',
    },
    isArchived: { type: Boolean, default: false },
    duration: { type: Number, default: 5000 }, // Mặc định 5s (5000ms)
    allowedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // Index thường để query nhanh, lưu giữ Story vĩnh viễn
    },
  },
  { timestamps: true }
);

// ============ Indexes ============

storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ createdAt: -1 });

// ============ Pre-save: tự động set expiresAt = createdAt + 24 giờ ============

storySchema.pre('save', function () {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
});

export const Story = mongoose.model<IStory>('Story', storySchema);
export default Story;
