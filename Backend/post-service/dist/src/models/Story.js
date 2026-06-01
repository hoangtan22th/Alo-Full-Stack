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
exports.Story = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============ Schema ============
const reactionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    type: {
        type: String,
        enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
        required: true,
    },
}, { _id: false });
const storySchema = new mongoose_1.Schema({
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
}, { timestamps: true });
// ============ Indexes ============
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ createdAt: -1 });
// ============ Pre-save: tự động set expiresAt = createdAt + 24 giờ ============
storySchema.pre('save', function () {
    if (this.isNew && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
});
exports.Story = mongoose_1.default.model('Story', storySchema);
exports.default = exports.Story;
//# sourceMappingURL=Story.js.map