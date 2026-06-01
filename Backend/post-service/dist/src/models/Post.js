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
exports.Post = void 0;
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
const postSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
// ============ Indexes ============
postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ 'reactions.userId': 1 });
postSchema.index({ tags: 1 });
exports.Post = mongoose_1.default.model('Post', postSchema);
exports.default = exports.Post;
//# sourceMappingURL=Post.js.map