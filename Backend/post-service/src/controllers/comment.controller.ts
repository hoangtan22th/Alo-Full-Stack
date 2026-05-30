import { Request, Response, NextFunction } from 'express';
import { commentService } from '../services/comment.service';
import { ReactionType } from '../models/Post';

/**
 * Trích xuất userId từ header x-user-id
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' ? userId : null;
}

export class CommentController {
  /**
   * Tạo bình luận mới (hoặc phản hồi)
   */
  public async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const file = req.file as Express.Multer.File;

      let parsedMentionedUserIds: string[] = [];
      if (mentionedUserIds) {
        try {
          parsedMentionedUserIds = typeof mentionedUserIds === 'string' ? JSON.parse(mentionedUserIds) : mentionedUserIds;
        } catch (e) {
          // Bỏ qua lỗi parse
        }
      }

      const comment = await commentService.createComment(postId as string, userId, content, parentId, file, parsedMentionedUserIds);
      res.status(201).json({ status: 201, data: comment });
    } catch (error: any) {
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
  public async getCommentsByPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { postId } = req.params;
      if (!postId) {
        res.status(400).json({ status: 400, message: 'Thiếu postId' });
        return;
      }

      const currentUserId = getUserIdFromHeader(req) || undefined;
      const authHeader = req.headers.authorization;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const comments = await commentService.getCommentsByPost(postId as string, limit, skip, currentUserId, authHeader);
      res.status(200).json({ status: 200, data: comments });
    } catch (error: any) {
      console.error('[CommentController] Error fetching comments:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400 : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Xóa bình luận — trả về deletedCount để frontend cập nhật commentCount chính xác
   */
  public async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const result = await commentService.deleteComment(commentId as string, userId);
      res.status(200).json({
        status: 200,
        message: 'Xóa bình luận thành công',
        data: { deletedCount: result.deletedCount },
      });
    } catch (error: any) {
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
  public async reactToComment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const validTypes: ReactionType[] = ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
      if (!type || !validTypes.includes(type)) {
        res.status(400).json({ status: 400, message: `type phải là một trong: ${validTypes.join(', ')}` });
        return;
      }

      const comment = await commentService.reactToComment(commentId as string, userId, type);
      res.status(200).json({ status: 200, data: comment });
    } catch (error: any) {
      console.error('[CommentController] Error reacting to comment:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }
}

export const commentController = new CommentController();
