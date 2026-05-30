import mongoose, { Document, Types } from 'mongoose';
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
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}, mongoose.DefaultSchemaOptions> & IComment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComment>;
export default Comment;
//# sourceMappingURL=Comment.d.ts.map