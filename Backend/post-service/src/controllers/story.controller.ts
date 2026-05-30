import { Request, Response, NextFunction } from 'express';
import { storyService } from '../services/story.service';

/**
 * Trích xuất userId từ header x-user-id
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' ? userId : null;
}

export class StoryController {
  /**
   * Đăng Story mới
   */
  public async createStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const file = req.file as Express.Multer.File;
      if (!file) {
        res.status(400).json({ status: 400, message: 'Cần upload ảnh hoặc video cho Story' });
        return;
      }

      // Fix encoding tiếng Việt
      try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) { /* bỏ qua */ }

      const { caption, privacy, music, allowedUsers, blockedUsers, duration } = req.body;

      let parsedMusic: any;
      if (music) {
        try {
          parsedMusic = typeof music === 'string' ? JSON.parse(music) : music;
        } catch (e) { /* bỏ qua */ }
      }

      let parsedAllowedUsers: string[] = [];
      if (allowedUsers) {
        try {
          parsedAllowedUsers = typeof allowedUsers === 'string' ? JSON.parse(allowedUsers) : allowedUsers;
        } catch (e) { /* bỏ qua */ }
      }

      let parsedBlockedUsers: string[] = [];
      if (blockedUsers) {
        try {
          parsedBlockedUsers = typeof blockedUsers === 'string' ? JSON.parse(blockedUsers) : blockedUsers;
        } catch (e) { /* bỏ qua */ }
      }

      const parsedDuration = duration ? Number(duration) : 5000;

      const authHeader = req.headers.authorization;
      const story = await storyService.createStory(
        userId, file, caption, privacy, parsedMusic, parsedAllowedUsers, parsedBlockedUsers, authHeader, parsedDuration
      );

      res.status(201).json({ status: 201, data: story });
    } catch (error: any) {
      console.error('[StoryController] Error creating story:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy Story Feed (của bản thân + bạn bè)
   */
  public async getStoryFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const authHeader = req.headers.authorization;
      const feed = await storyService.getStoryFeed(userId, authHeader);
      res.status(200).json({ status: 200, data: feed });
    } catch (error: any) {
      console.error('[StoryController] Error fetching story feed:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy stories của một user cụ thể
   */
  public async getUserStories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { targetUserId } = req.params;
      if (!targetUserId) {
        res.status(400).json({ status: 400, message: 'Thiếu targetUserId' });
        return;
      }

      const stories = await storyService.getUserStories(targetUserId as string);
      res.status(200).json({ status: 200, data: stories });
    } catch (error: any) {
      console.error('[StoryController] Error fetching user stories:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Đánh dấu đã xem Story
   */
  public async viewStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const story = await storyService.viewStory(storyId as string, userId);
      res.status(200).json({ status: 200, data: story });
    } catch (error: any) {
      console.error('[StoryController] Error viewing story:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy danh sách người xem Story
   */
  public async getStoryViewers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const viewers = await storyService.getStoryViewers(storyId as string, userId);
      res.status(200).json({ status: 200, data: viewers });
    } catch (error: any) {
      console.error('[StoryController] Error fetching story viewers:', error);
      const statusCode = error.message.includes('không có quyền') ? 403 : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Xóa Story
   */
  public async deleteStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const authHeader = req.headers.authorization;
      await storyService.deleteStory(storyId as string, userId, authHeader);
      res.status(200).json({ status: 200, message: 'Xóa story thành công' });
    } catch (error: any) {
      console.error('[StoryController] Error deleting story:', error);
      const statusCode = error.message.includes('không có quyền') ? 403
        : error.message.includes('không tồn tại') ? 404
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Thả cảm xúc Story
   */
  public async reactToStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      const { type } = req.body;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const validTypes = ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
      if (!type || !validTypes.includes(type)) {
        res.status(400).json({ status: 400, message: `type phải là một trong: ${validTypes.join(', ')}` });
        return;
      }

      const story = await storyService.reactToStory(storyId as string, userId, type);
      res.status(200).json({ status: 200, data: story });
    } catch (error: any) {
      console.error('[StoryController] Error reacting to story:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy danh sách story đã lưu trữ của bản thân
   */
  public async getArchivedStories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const stories = await storyService.getArchivedStories(userId);
      res.status(200).json({ status: 200, data: stories });
    } catch (error: any) {
      console.error('[StoryController] Error fetching archived stories:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Đăng lại một story từ kho lưu trữ
   */
  public async repostStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const authHeader = req.headers.authorization;
      const story = await storyService.repostStory(storyId as string, userId, authHeader);
      res.status(200).json({ status: 200, data: story, message: 'Đăng lại story thành công' });
    } catch (error: any) {
      console.error('[StoryController] Error reposting story:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Xóa vĩnh viễn Story (xóa khỏi DB + S3, không thể khôi phục)
   */
  public async permanentDeleteStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      await storyService.permanentDeleteStory(storyId as string, userId);
      res.status(200).json({ status: 200, message: 'Đã xóa vĩnh viễn story' });
    } catch (error: any) {
      console.error('[StoryController] Error permanently deleting story:', error);
      const statusCode = error.message.includes('không có quyền') ? 403
        : error.message.includes('không tồn tại') ? 404
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Lấy chi tiết một story cụ thể
   */
  public async getStoryDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { storyId } = req.params;
      if (!storyId) {
        res.status(400).json({ status: 400, message: 'Thiếu storyId' });
        return;
      }

      const story = await storyService.getStoryDetails(storyId as string);
      res.status(200).json({ status: 200, data: story });
    } catch (error: any) {
      console.error('[StoryController] Error getting story details:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }
}

export const storyController = new StoryController();
