import mongoose, { Document, Types } from 'mongoose';
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
    allowedUsers: string[];
    blockedUsers: string[];
    reactions: IReaction[];
    reactionCount: number;
    commentCount: number;
    tags: string[];
    backgroundTemplate?: string;
    likes: string[];
    likeCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Post: mongoose.Model<IPost, {}, {}, {}, mongoose.Document<unknown, {}, IPost, {}, mongoose.DefaultSchemaOptions> & IPost & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPost>;
export default Post;
//# sourceMappingURL=Post.d.ts.map