"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = exports.CommentService = void 0;
const Comment_1 = __importDefault(require("../models/Comment"));
const Post_1 = __importDefault(require("../models/Post"));
const mongoose_1 = require("mongoose");
const rabbitmq_1 = require("../config/rabbitmq");
const s3_service_1 = require("./s3.service");
const notification_service_1 = require("./notification.service");
const post_service_1 = require("./post.service");
/**
 * Kiểm tra xem một chuỗi có phải ObjectId hợp lệ không
 */
function isValidObjectId(id) {
    return mongoose_1.Types.ObjectId.isValid(id) && new mongoose_1.Types.ObjectId(id).toString() === id;
}
class CommentService {
    /**
     * Tạo bình luận mới
     */
    async createComment(postId, userId, content, parentId, file, mentionedUserIds) {
        if (!isValidObjectId(postId)) {
            throw new Error('postId không hợp lệ');
        }
        const post = await Post_1.default.findById(postId);
        if (!post) {
            throw new Error('Bài viết không tồn tại');
        }
        let finalParentId = null;
        let parentComment = null;
        if (parentId) {
            if (!isValidObjectId(parentId)) {
                throw new Error('parentId không hợp lệ');
            }
            parentComment = await Comment_1.default.findById(parentId);
            if (!parentComment) {
                throw new Error('Bình luận cha không tồn tại');
            }
            // Giới hạn 2 cấp: Nếu bình luận cha đã là reply (có parentId),
            // thì reply mới sẽ trỏ chung về bình luận gốc (top-level comment)
            finalParentId = parentComment.parentId ? parentComment.parentId : parentComment._id;
        }
        if ((!content || content.trim() === '') && !file) {
            throw new Error('Bình luận phải có nội dung văn bản hoặc hình ảnh');
        }
        let mediaUrl = undefined;
        if (file) {
            mediaUrl = await (0, s3_service_1.uploadFileToS3)(file.buffer, file.mimetype, file.originalname, 'comments');
        }
        const comment = new Comment_1.default({
            postId: new mongoose_1.Types.ObjectId(postId),
            userId,
            content: content?.trim(),
            mediaUrl,
            parentId: finalParentId,
        });
        const savedComment = await comment.save();
        // Tăng commentCount bằng atomic operation để tránh race condition
        await Post_1.default.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
        // Publish COMMENT_ADDED to post room via RabbitMQ
        try {
            console.log(`[RabbitMQ] Publishing COMMENT_ADDED interaction for post ${postId}`);
            await (0, rabbitmq_1.publishToRealtime)('POST_INTERACTION', {
                room: `post_${postId}`,
                data: {
                    actorId: userId,
                    postId,
                    eventType: 'COMMENT_ADDED',
                    payload: savedComment,
                },
            });
        }
        catch (err) {
            console.error('[RabbitMQ] Error publishing comment added event:', err);
        }
        // Save notification inside DB & publish to RabbitMQ
        try {
            const postOwnerId = post.userId;
            if (parentId) {
                // Find parent comment to get parent comment owner ID
                if (parentComment && parentComment.userId !== userId) {
                    await notification_service_1.notificationService.createNotification(parentComment.userId, userId, 'REPLY_COMMENT', `đã phản hồi bình luận của bạn`, postId, savedComment._id.toString());
                }
            }
            else {
                if (postOwnerId !== userId) {
                    await notification_service_1.notificationService.createNotification(postOwnerId, userId, 'COMMENT_POST', `đã bình luận bài viết của bạn`, postId, savedComment._id.toString());
                }
            }
            // Gửi thông báo nhắc tên cho những người được nhắc tên (mentions) trong bình luận
            if (mentionedUserIds && mentionedUserIds.length > 0) {
                for (const tId of mentionedUserIds) {
                    const isPostOwner = tId === postOwnerId && !parentId;
                    const isParentCommentOwner = parentId && parentComment && tId === parentComment.userId;
                    if (!isPostOwner && !isParentCommentOwner) {
                        await notification_service_1.notificationService.createNotification(tId, userId, 'TAG_POST', `đã nhắc đến bạn trong một bình luận`, postId, savedComment._id.toString());
                    }
                }
            }
        }
        catch (notificationErr) {
            console.error('[Notification] Error creating comment notification:', notificationErr);
        }
        return savedComment;
    }
    /**
     * Lấy danh sách bình luận của bài viết (hỗ trợ phân trang và cấu trúc lồng nhau)
     */
    async getCommentsByPost(postId, limit = 20, skip = 0, currentUserId, authHeader) {
        if (!isValidObjectId(postId)) {
            throw new Error('postId không hợp lệ');
        }
        const postObjectId = new mongoose_1.Types.ObjectId(postId);
        // 1. Lấy danh sách bình luận gốc (parentId = null)
        const topLevelComments = await Comment_1.default.find({
            postId: postObjectId,
            parentId: null,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        if (topLevelComments.length === 0)
            return [];
        // 2. Lấy danh sách ID của các bình luận gốc để query sub-comments
        const topLevelIds = topLevelComments.map((c) => c._id);
        // 3. Lấy tất cả sub-comments (replies) có parentId nằm trong danh sách trên
        const replies = await Comment_1.default.find({
            postId: postObjectId,
            parentId: { $in: topLevelIds },
        }).sort({ createdAt: 1 });
        // 4. Group sub-comments vào bình luận cha tương ứng
        const commentsWithReplies = topLevelComments.map((comment) => {
            const commentObj = comment.toObject();
            commentObj.replies = replies
                .filter((r) => r.parentId && r.parentId.toString() === comment._id.toString())
                .map((r) => r.toObject());
            return commentObj;
        });
        // Zalo Privacy: Chỉ bạn bè chung mới nhìn thấy bình luận của nhau
        if (currentUserId) {
            try {
                const post = await Post_1.default.findById(postId);
                const postOwnerId = post?.userId;
                const myFriendIds = await post_service_1.postService.getFriendIds(currentUserId, authHeader);
                return commentsWithReplies.filter((c) => {
                    const isVisible = c.userId === currentUserId ||
                        c.userId === postOwnerId ||
                        myFriendIds.includes(c.userId);
                    if (!isVisible)
                        return false;
                    if (c.replies && Array.isArray(c.replies)) {
                        c.replies = c.replies.filter((r) => {
                            return (r.userId === currentUserId ||
                                r.userId === postOwnerId ||
                                myFriendIds.includes(r.userId));
                        });
                    }
                    return true;
                });
            }
            catch (err) {
                console.error('[Zalo Privacy Filter] Error filtering comments:', err);
                return commentsWithReplies;
            }
        }
        return commentsWithReplies;
    }
    /**
     * Xóa bình luận
     * Trả về số lượng bình luận đã xóa (bao gồm cả replies) để frontend cập nhật đúng
     */
    async deleteComment(commentId, userId) {
        if (!isValidObjectId(commentId)) {
            throw new Error('commentId không hợp lệ');
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            throw new Error('Bình luận không tồn tại');
        }
        const post = await Post_1.default.findById(comment.postId);
        if (!post) {
            throw new Error('Bài viết không tồn tại');
        }
        // Quyền xóa bình luận:
        // 1. Là tác giả của bình luận đó.
        // 2. Là tác giả của bài viết chứa bình luận đó.
        if (comment.userId !== userId && post.userId !== userId) {
            throw new Error('Bạn không có quyền xóa bình luận này');
        }
        let deletedCount = 0;
        if (comment.parentId === null) {
            // Nếu xóa bình luận gốc -> xóa cả các bình luận con
            const deleteRepliesResult = await Comment_1.default.deleteMany({ parentId: comment._id });
            deletedCount += deleteRepliesResult.deletedCount || 0;
        }
        // Xóa chính bình luận đó
        await Comment_1.default.findByIdAndDelete(commentId);
        deletedCount += 1;
        // Giảm commentCount bằng atomic operation, đảm bảo không âm
        const updatedPost = await Post_1.default.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -deletedCount } }, { new: true });
        // Đảm bảo commentCount không bị âm
        if (updatedPost && updatedPost.commentCount < 0) {
            await Post_1.default.findByIdAndUpdate(comment.postId, { $set: { commentCount: 0 } });
        }
        // Publish COMMENT_DELETED to post room via RabbitMQ
        try {
            console.log(`[RabbitMQ] Publishing COMMENT_DELETED interaction for post ${comment.postId}`);
            await (0, rabbitmq_1.publishToRealtime)('POST_INTERACTION', {
                room: `post_${comment.postId}`,
                data: {
                    actorId: userId,
                    postId: comment.postId.toString(),
                    eventType: 'COMMENT_DELETED',
                    payload: { commentId, deletedCount },
                },
            });
        }
        catch (err) {
            console.error('[RabbitMQ] Error publishing comment deleted event:', err);
        }
        return { deletedCount };
    }
    /**
     * Thả cảm xúc bình luận (React/Unreact)
     */
    async reactToComment(commentId, userId, type) {
        if (!isValidObjectId(commentId)) {
            throw new Error('commentId không hợp lệ');
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            throw new Error('Bình luận không tồn tại');
        }
        const existingIndex = comment.reactions.findIndex((r) => r.userId === userId);
        if (existingIndex >= 0) {
            const existing = comment.reactions[existingIndex];
            if (existing.type === type) {
                // Unreact: bỏ reaction khi nhấn cùng loại
                comment.reactions.splice(existingIndex, 1);
            }
            else {
                // Đổi loại reaction
                comment.reactions[existingIndex].type = type;
            }
        }
        else {
            // Thêm reaction mới
            comment.reactions.push({ userId, type });
        }
        // Đồng bộ counts
        comment.reactionCount = comment.reactions.length;
        const savedComment = await comment.save();
        // Publish COMMENT_REACTED to post room via RabbitMQ
        try {
            console.log(`[RabbitMQ] Publishing COMMENT_REACTED interaction for post ${comment.postId}`);
            await (0, rabbitmq_1.publishToRealtime)('POST_INTERACTION', {
                room: `post_${comment.postId}`,
                data: {
                    actorId: userId,
                    postId: comment.postId.toString(),
                    eventType: 'COMMENT_REACTED',
                    payload: { commentId, type },
                },
            });
        }
        catch (err) {
            console.error('[RabbitMQ] Error publishing comment reacted event:', err);
        }
        return savedComment;
    }
}
exports.CommentService = CommentService;
exports.commentService = new CommentService();
//# sourceMappingURL=comment.service.js.map