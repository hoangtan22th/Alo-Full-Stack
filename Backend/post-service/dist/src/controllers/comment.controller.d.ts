import { Request, Response, NextFunction } from 'express';
export declare class CommentController {
    /**
     * Tạo bình luận mới (hoặc phản hồi)
     */
    createComment(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy danh sách bình luận của một bài viết (hỗ trợ phân trang và cấu trúc lồng)
     */
    getCommentsByPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Xóa bình luận — trả về deletedCount để frontend cập nhật commentCount chính xác
     */
    deleteComment(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Thả biểu cảm bình luận (React)
     * Body: { type: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' }
     */
    reactToComment(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const commentController: CommentController;
//# sourceMappingURL=comment.controller.d.ts.map