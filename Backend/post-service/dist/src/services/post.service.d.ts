import { IPost, ReactionType } from '../models/Post';
export declare class PostService {
    /**
     * Lấy danh sách ID bạn bè từ contact-service
     */
    getFriendIds(userId: string, authHeader?: string): Promise<string[]>;
    /**
     * Kiểm tra xem 2 user có phải bạn bè không
     */
    isFriend(userId: string, targetUserId: string, authHeader?: string): Promise<boolean>;
    /**
     * Tạo bài viết mới
     */
    createPost(userId: string, content?: string, files?: Express.Multer.File[], privacy?: string, tags?: string[], allowedUsers?: string[], blockedUsers?: string[], authHeader?: string, backgroundTemplate?: string): Promise<IPost>;
    /**
     * Chỉnh sửa bài viết
     */
    editPost(postId: string, userId: string, content?: string, privacy?: string, files?: Express.Multer.File[], keepMediaUrls?: string[], // Danh sách các media cũ muốn giữ lại
    tags?: string[], allowedUsers?: string[], blockedUsers?: string[]): Promise<IPost>;
    /**
     * Xóa bài viết
     */
    deletePost(postId: string, userId: string, authHeader?: string): Promise<void>;
    /**
     * Lấy chi tiết bài viết
     */
    getPostDetails(postId: string, currentUserId: string, authHeader?: string): Promise<IPost>;
    /**
     * Thả cảm xúc bài viết (React/Unreact)
     * - Nếu chưa react: thêm reaction mới
     * - Nếu đã react cùng loại: bỏ reaction (unreact)
     * - Nếu đã react khác loại: đổi sang loại mới
     */
    reactToPost(postId: string, userId: string, type: ReactionType): Promise<IPost>;
    /**
     * Toggle Like (backward compatible — gọi reactToPost với type = LIKE)
     */
    toggleLikePost(postId: string, userId: string): Promise<IPost>;
    /**
     * Lấy Newsfeed trang chủ (Bài viết của bản thân & bạn bè)
     */
    getHomeFeed(userId: string, limit?: number, skip?: number, authHeader?: string): Promise<IPost[]>;
    /**
     * Lấy Timeline Trang cá nhân (Bài đăng của một user cụ thể)
     */
    getUserTimeline(targetUserId: string, currentUserId: string, limit?: number, skip?: number, authHeader?: string): Promise<IPost[]>;
}
export declare const postService: PostService;
//# sourceMappingURL=post.service.d.ts.map