import mongoose, { Document, Schema, Types } from 'mongoose';
import { IReaction } from './Post';

export interface IComment extends Document {
  postId: Types.ObjectId;
  userId: string;
  content?: string;
  mediaUrl?: string;
  parentId: Types.ObjectId | null;
  reactions: IReaction[];
  reactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: String, required: true },
    content: { type: String, maxlength: 1000 },
    mediaUrl: { type: String, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    reactions: {
      type: [
        {
          userId: { type: String, required: true },
          type: {
            type: String,
            enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
            required: true,
          },
        },
      ],
      default: [],
    },
    reactionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ 'reactions.userId': 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
export default Comment;
