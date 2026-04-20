import mongoose, { Document, Types } from 'mongoose';
export interface IPollOption {
    _id?: Types.ObjectId;
    text: string;
    addedBy: string;
    createdAt?: Date;
}
export interface IPoll extends Document {
    conversationId: string;
    creatorId: string;
    question: string;
    options: IPollOption[];
    settings: {
        allowMultipleAnswers: boolean;
        allowAddOptions: boolean;
        hideResultsUntilVoted: boolean;
        hideVoters: boolean;
        pinToTop?: boolean;
    };
    status: 'OPEN' | 'CLOSED';
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Poll: mongoose.Model<IPoll, {}, {}, {}, mongoose.Document<unknown, {}, IPoll, {}, mongoose.DefaultSchemaOptions> & IPoll & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPoll>;
//# sourceMappingURL=Poll.d.ts.map