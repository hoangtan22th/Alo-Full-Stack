import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPollOption {
  _id?: Types.ObjectId;
  text: string;
  addedBy: string; // userId
  createdAt?: Date;
}

export interface IPoll extends Document {
  conversationId: string; // ID của group chat
  creatorId: string; // User ID tạo
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

const pollSchema = new Schema<IPoll>(
  {
    conversationId: { type: String, required: true, index: true },
    creatorId: { type: String, required: true },
    question: { type: String, required: true, maxlength: 200 },
    options: [
      {
        text: { type: String, required: true },
        addedBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      allowMultipleAnswers: { type: Boolean, default: false },
      allowAddOptions: { type: Boolean, default: false },
      hideResultsUntilVoted: { type: Boolean, default: false },
      hideVoters: { type: Boolean, default: false },
      pinToTop: { type: Boolean, default: false }, // tuỳ chọn
    },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Tự động đóng poll khi hết hạn: Có thể dùng TTL index nếu không cần trigger logic phức tạp.
// Tuy nhiên ở đây cta sẽ dùng nodejob (BullMQ) để đảm bảo khi đóng có thể bắn sự kiện.

export const Poll = mongoose.model<IPoll>('Poll', pollSchema);
