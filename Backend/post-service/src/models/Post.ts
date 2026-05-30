import mongoose, { Document, Schema, Types } from 'mongoose';

// ============ Enums & Types ============

export type ReactionType = 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';
export type PrivacyType = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE' | 'CUSTOM';

export interface IReaction {
  userId: string;
  type: ReactionType;
}

export interface IMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  fileName: string;
}

export interface IPost extends Document {
  userId: string;
  content?: string;
  media: IMedia[];
  privacy: PrivacyType;
  allowedUsers: string[];   // Whitelist khi privacy = CUSTOM
  blockedUsers: string[];   // Blacklist khi privacy = CUSTOM
  reactions: IReaction[];
  reactionCount: number;
  commentCount: number;
  tags: string[];           // Danh sách userId được gắn thẻ
  backgroundTemplate?: string; // Loại hình nền gradient tâm trạng Zalo
  // Backward compatibility
  likes: string[];
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
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

const postSchema = new Schema<IPost>(
  {
    userId: { type: String, required: true, index: true },
    content: { type: String, maxlength: 2000 },
    backgroundTemplate: { type: String, default: null }, // Mẫu hình nền
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
        fileName: { type: String, required: true },
      },
    ],
    privacy: {
      type: String,
      enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'CUSTOM'],
      default: 'FRIENDS_ONLY',
      index: true,
    },
    allowedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    reactionCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    // Backward compatibility — giữ lại để các client cũ không bị lỗi
    likes: { type: [String], default: [] },
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ============ Indexes ============

postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ 'reactions.userId': 1 });
postSchema.index({ tags: 1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
export default Post;
