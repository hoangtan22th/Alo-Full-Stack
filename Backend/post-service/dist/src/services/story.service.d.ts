import { IStory } from '../models/Story';
import { ReactionType } from '../models/Post';
/**
 * Story Service — Quản lý Khoảnh khắc (Story 24h)
 */
export declare class StoryService {
    /**
     * Tạo Story mới
     */
    createStory(userId: string, file: Express.Multer.File, caption?: string, privacy?: string, music?: {
        title: string;
        artist: string;
        url: string;
        lyrics?: string;
    }, allowedUsers?: string[], blockedUsers?: string[], authHeader?: string, duration?: number): Promise<IStory>;
    /**
     * Lấy danh sách story feed (story của bản thân + bạn bè, chưa hết hạn)
     * Trả về theo nhóm user, mỗi nhóm chứa danh sách stories
     */
    getStoryFeed(userId: string, authHeader?: string): Promise<{
        userId: string;
        stories: IStory[];
    }[]>;
    /**
     * Lấy danh sách stories của một user cụ thể
     */
    getUserStories(userId: string): Promise<IStory[]>;
    /**
     * Đánh dấu đã xem story
     */
    viewStory(storyId: string, viewerId: string): Promise<IStory>;
    /**
     * Thả cảm xúc Story
     */
    reactToStory(storyId: string, userId: string, type: ReactionType): Promise<IStory>;
    /**
     * Lấy danh sách người xem story (chỉ chủ story mới được phép)
     */
    getStoryViewers(storyId: string, requesterId: string): Promise<{
        userId: string;
        viewedAt: Date;
    }[]>;
    /**
     * Xóa story (chỉ chủ sở hữu)
     */
    deleteStory(storyId: string, userId: string, authHeader?: string): Promise<void>;
    /**
     * Lấy danh sách story đã lưu trữ của bản thân
     */
    getArchivedStories(userId: string): Promise<IStory[]>;
    /**
     * Xóa vĩnh viễn story khỏi database + S3 (không thể khôi phục)
     */
    permanentDeleteStory(storyId: string, userId: string): Promise<void>;
    /**
     * Đăng lại một story từ kho lưu trữ
     */
    repostStory(storyId: string, userId: string, authHeader?: string): Promise<IStory>;
}
export declare const storyService: StoryService;
//# sourceMappingURL=story.service.d.ts.map