import mongoose, { Document } from 'mongoose';
import { IReaction } from './Post';
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
    duration?: number;
    allowedUsers: string[];
    blockedUsers: string[];
    createdAt: Date;
    expiresAt: Date;
}
export declare const Story: mongoose.Model<IStory, {}, {}, {}, mongoose.Document<unknown, {}, IStory, {}, mongoose.DefaultSchemaOptions> & IStory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IStory>;
export default Story;
//# sourceMappingURL=Story.d.ts.map