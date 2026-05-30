import { Request, Response, NextFunction } from 'express';
export declare class PostController {
    /**
     * Tạo bài viết mới
     */
    createPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Chỉnh sửa bài viết
     */
    editPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Xóa bài viết
     */
    deletePost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy chi tiết bài viết
     */
    getPostDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Thả biểu cảm bài viết (React)
     * Body: { type: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' }
     */
    reactToPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Like / Unlike bài viết (Backward compatible)
     */
    toggleLikePost(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy Home Newsfeed (bài đăng của bản thân và bạn bè)
     */
    getHomeFeed(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy Timeline cá nhân của một user cụ thể
     */
    getUserTimeline(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy Spotify Access Token qua Client Credentials Flow
     */
    getSpotifyToken(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const postController: PostController;
//# sourceMappingURL=post.controller.d.ts.map