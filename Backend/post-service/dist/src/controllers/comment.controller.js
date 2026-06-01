"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentController = exports.CommentController = void 0;
const comment_service_1 = require("../services/comment.service");
/**
 * Trích xuất userId từ header x-user-id
 */
function getUserIdFromHeader(req) {
    const userId = req.headers['x-user-id'];
    return typeof userId === 'string' ? userId : null;
}
class CommentController {
    /**
     * Tạo bình luận mới (hoặc phản hồi)
     */
    async createComment(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const { postId } = req.params;
            if (!postId) {
                res.status(400).json({ status: 400, message: 'Thiếu postId' });
                return;
            }
            const { content, parentId, mentionedUserIds } = req.body;
            const file = req.file;
            let parsedMentionedUserIds = [];
            if (mentionedUserIds) {
                try {
                    parsedMentionedUserIds = typeof mentionedUserIds === 'string' ? JSON.parse(mentionedUserIds) : mentionedUserIds;
                }
                catch (e) {
                    // Bỏ qua lỗi parse
                }
            }
            const comment = await comment_service_1.commentService.createComment(postId, userId, content, parentId, file, parsedMentionedUserIds);
            res.status(201).json({ status: 201, data: comment });
        }
        catch (error) {
            console.error('[CommentController] Error creating comment:', error);
            const statusCode = error.message.includes('không hợp lệ') ? 400
                : error.message.includes('không tồn tại') ? 404
                    : 400;
            res.status(statusCode).json({ status: statusCode, message: error.message });
        }
    }
    /**
     * Lấy danh sách bình luận của một bài viết (hỗ trợ phân trang và cấu trúc lồng)
     */
    async getCommentsByPost(req, res, next) {
        try {
            const { postId } = req.params;
            if (!postId) {
                res.status(400).json({ status: 400, message: 'Thiếu postId' });
                return;
            }
            const currentUserId = getUserIdFromHeader(req) || undefined;
            const authHeader = req.headers.authorization;
            const limit = parseInt(req.query.limit) || 20;
            const skip = parseInt(req.query.skip) || 0;
            const comments = await comment_service_1.commentService.getCommentsByPost(postId, limit, skip, currentUserId, authHeader);
            res.status(200).json({ status: 200, data: comments });
        }
        catch (error) {
            console.error('[CommentController] Error fetching comments:', error);
            const statusCode = error.message.includes('không hợp lệ') ? 400 : 400;
            res.status(statusCode).json({ status: statusCode, message: error.message });
        }
    }
    /**
     * Xóa bình luận — trả về deletedCount để frontend cập nhật commentCount chính xác
     */
    async deleteComment(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const { commentId } = req.params;
            if (!commentId) {
                res.status(400).json({ status: 400, message: 'Thiếu commentId' });
                return;
            }
            const result = await comment_service_1.commentService.deleteComment(commentId, userId);
            res.status(200).json({
                status: 200,
                message: 'Xóa bình luận thành công',
                data: { deletedCount: result.deletedCount },
            });
        }
        catch (error) {
            console.error('[CommentController] Error deleting comment:', error);
            const statusCode = error.message.includes('không hợp lệ') ? 400
                : error.message.includes('không tồn tại') ? 404
                    : error.message.includes('không có quyền') ? 403
                        : 400;
            res.status(statusCode).json({ status: statusCode, message: error.message });
        }
    }
    /**
     * Thả biểu cảm bình luận (React)
     * Body: { type: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' }
     */
    async reactToComment(req, res, next) {
        try {
            const userId = getUserIdFromHeader(req);
            if (!userId) {
                res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
                return;
            }
            const { commentId } = req.params;
            if (!commentId) {
                res.status(400).json({ status: 400, message: 'Thiếu commentId' });
                return;
            }
            const { type } = req.body;
            const validTypes = ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
            if (!type || !validTypes.includes(type)) {
                res.status(400).json({ status: 400, message: `type phải là một trong: ${validTypes.join(', ')}` });
                return;
            }
            const comment = await comment_service_1.commentService.reactToComment(commentId, userId, type);
            res.status(200).json({ status: 200, data: comment });
        }
        catch (error) {
            console.error('[CommentController] Error reacting to comment:', error);
            const statusCode = error.message.includes('không hợp lệ') ? 400
                : error.message.includes('không tồn tại') ? 404
                    : 400;
            res.status(statusCode).json({ status: statusCode, message: error.message });
        }
    }
}
exports.CommentController = CommentController;
exports.commentController = new CommentController();
//# sourceMappingURL=comment.controller.js.map