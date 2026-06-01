import { Request, Response, NextFunction } from 'express';
export declare class StoryController {
    /**
     * Đăng Story mới
     */
    createStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy Story Feed (của bản thân + bạn bè)
     */
    getStoryFeed(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy stories của một user cụ thể
     */
    getUserStories(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Đánh dấu đã xem Story
     */
    viewStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy danh sách người xem Story
     */
    getStoryViewers(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Xóa Story
     */
    deleteStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Thả cảm xúc Story
     */
    reactToStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy danh sách story đã lưu trữ của bản thân
     */
    getArchivedStories(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Đăng lại một story từ kho lưu trữ
     */
    repostStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Xóa vĩnh viễn Story (xóa khỏi DB + S3, không thể khôi phục)
     */
    permanentDeleteStory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Lấy chi tiết một story cụ thể
     */
    getStoryDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const storyController: StoryController;
//# sourceMappingURL=story.controller.d.ts.map