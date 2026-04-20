"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Poll = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const pollSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
// Tự động đóng poll khi hết hạn: Có thể dùng TTL index nếu không cần trigger logic phức tạp.
// Tuy nhiên ở đây cta sẽ dùng nodejob (BullMQ) để đảm bảo khi đóng có thể bắn sự kiện.
exports.Poll = mongoose_1.default.model('Poll', pollSchema);
