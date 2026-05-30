import { IComment } from '../models/Comment';
import { ReactionType } from '../models/Post';
export declare class CommentService {
    /**
     * Tạo bình luận mới
     */
    createComment(postId: string, userId: string, content?: string, parentId?: string, file?: Express.Multer.File, mentionedUserIds?: string[]): Promise<IComment>;
    /**
     * Lấy danh sách bình luận của bài viết (hỗ trợ phân trang và cấu trúc lồng nhau)
     */
    getCommentsByPost(postId: string, limit?: number, skip?: number, currentUserId?: string, authHeader?: string): Promise<any[]>;
    /**
     * Xóa bình luận
     * Trả về số lượng bình luận đã xóa (bao gồm cả replies) để frontend cập nhật đúng
     */
    deleteComment(commentId: string, userId: string): Promise<{
        deletedCount: number;
    }>;
    /**
     * Thả cảm xúc bình luận (React/Unreact)
     */
    reactToComment(commentId: string, userId: string, type: ReactionType): Promise<IComment>;
}
export declare const commentService: CommentService;
//# sourceMappingURL=comment.service.d.ts.map