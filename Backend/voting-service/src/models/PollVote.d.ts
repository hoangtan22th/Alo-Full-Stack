import { Document, Types } from 'mongoose';
export interface IPollVote extends Document {
    pollId: Types.ObjectId;
    optionId: Types.ObjectId;
    userId: string;
    createdAt: Date;
}
export declare const PollVote: import("mongoose").Model<IPollVote, {}, {}, {}, Document<unknown, {}, IPollVote, {}, import("mongoose").DefaultSchemaOptions> & IPollVote & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPollVote>;
//# sourceMappingURL=PollVote.d.ts.map