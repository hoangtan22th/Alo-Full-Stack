import { Request, Response, NextFunction } from 'express';
import { postService } from '../services/post.service';
import { ReactionType } from '../models/Post';
import axios from 'axios';

/**
 * Trích xuất userId từ header x-user-id (do API Gateway đính kèm)
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' ? userId : null;
}

export class PostController {
  /**
   * Tạo bài viết mới
   */
  public async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { content, privacy, tags, allowedUsers, blockedUsers, backgroundTemplate } = req.body;
      const files = req.files as Express.Multer.File[];

      // Fix encoding tiếng Việt cho tên file nếu có
      if (files && files.length > 0) {
        files.forEach((file) => {
          try {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch (e) {
            // Bỏ qua lỗi nếu không encode được
          }
        });
      }

      // Parse tags nếu là chuỗi JSON
      let parsedTags: string[] = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          // Bỏ qua lỗi parse
        }
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

      const authHeader = req.headers.authorization;
      const post = await postService.createPost(userId, content, files, privacy, parsedTags, parsedAllowedUsers, parsedBlockedUsers, authHeader, backgroundTemplate);
      res.status(201).json({ status: 201, data: post });
    } catch (error: any) {
      console.error('[PostController] Error creating post:', error);

      // Xử lý lỗi Multer (file quá lớn, sai loại file)
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ status: 413, message: 'File quá lớn. Giới hạn tối đa 100MB mỗi file.' });
        return;
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ status: 400, message: 'Quá nhiều file. Tối đa 10 file mỗi bài viết.' });
        return;
      }

      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Chỉnh sửa bài viết
   */
  public async editPost(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { content, privacy, keepMediaUrls, tags, allowedUsers, blockedUsers } = req.body;
      const files = req.files as Express.Multer.File[];

      // Phân tích danh sách media muốn giữ lại
      let parsedKeepMediaUrls: string[] = [];
      if (keepMediaUrls) {
        try {
          parsedKeepMediaUrls = typeof keepMediaUrls === 'string' ? JSON.parse(keepMediaUrls) : keepMediaUrls;
        } catch (e) {
          res.status(400).json({ status: 400, message: 'keepMediaUrls phải là JSON array hợp lệ' });
          return;
        }
      }

      let parsedTags: string[] | undefined;
      if (tags !== undefined) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) { /* bỏ qua */ }
      }

      let parsedAllowedUsers: string[] | undefined;
      if (allowedUsers !== undefined) {
        try {
          parsedAllowedUsers = typeof allowedUsers === 'string' ? JSON.parse(allowedUsers) : allowedUsers;
        } catch (e) { /* bỏ qua */ }
      }

      let parsedBlockedUsers: string[] | undefined;
      if (blockedUsers !== undefined) {
        try {
          parsedBlockedUsers = typeof blockedUsers === 'string' ? JSON.parse(blockedUsers) : blockedUsers;
        } catch (e) { /* bỏ qua */ }
      }

      // Fix encoding tiếng Việt cho các file mới
      if (files && files.length > 0) {
        files.forEach((file) => {
          try {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch (e) {
            // Bỏ qua
          }
        });
      }

      const updatedPost = await postService.editPost(
        postId as string, userId, content, privacy, files,
        parsedKeepMediaUrls, parsedTags, parsedAllowedUsers, parsedBlockedUsers
      );
      res.status(200).json({ status: 200, data: updatedPost });
    } catch (error: any) {
      console.error('[PostController] Error editing post:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : error.message.includes('không có quyền') ? 403
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Xóa bài viết
   */
  public async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const authHeader = req.headers.authorization;
      await postService.deletePost(postId as string, userId, authHeader);
      res.status(200).json({ status: 200, message: 'Xóa bài viết thành công' });
    } catch (error: any) {
      console.error('[PostController] Error deleting post:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : error.message.includes('không có quyền') ? 403
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Lấy chi tiết bài viết
   */
  public async getPostDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const authHeader = req.headers.authorization;
      const post = await postService.getPostDetails(postId as string, userId, authHeader);
      res.status(200).json({ status: 200, data: post });
    } catch (error: any) {
      console.error('[PostController] Error fetching post details:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : error.message.includes('riêng tư') || error.message.includes('bạn bè') ? 403
        : 404;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Thả biểu cảm bài viết (React)
   * Body: { type: 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' }
   */
  public async reactToPost(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { type } = req.body;
      const validTypes: ReactionType[] = ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
      if (!type || !validTypes.includes(type)) {
        res.status(400).json({ status: 400, message: `type phải là một trong: ${validTypes.join(', ')}` });
        return;
      }

      const post = await postService.reactToPost(postId as string, userId, type);
      res.status(200).json({ status: 200, data: post });
    } catch (error: any) {
      console.error('[PostController] Error reacting to post:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Like / Unlike bài viết (Backward compatible)
   */
  public async toggleLikePost(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const post = await postService.toggleLikePost(postId as string, userId);
      res.status(200).json({ status: 200, data: post });
    } catch (error: any) {
      console.error('[PostController] Error toggling like:', error);
      const statusCode = error.message.includes('không hợp lệ') ? 400
        : error.message.includes('không tồn tại') ? 404
        : 400;
      res.status(statusCode).json({ status: statusCode, message: error.message });
    }
  }

  /**
   * Lấy Home Newsfeed (bài đăng của bản thân và bạn bè)
   */
  public async getHomeFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const skip = parseInt(req.query.skip as string) || 0;

      const authHeader = req.headers.authorization;
      const posts = await postService.getHomeFeed(userId, limit, skip, authHeader);
      res.status(200).json({ status: 200, data: posts });
    } catch (error: any) {
      console.error('[PostController] Error fetching home feed:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy Timeline cá nhân của một user cụ thể
   */
  public async getUserTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = getUserIdFromHeader(req);
      if (!currentUserId) {
        res.status(401).json({ status: 401, message: 'Unauthorized - missing x-user-id' });
        return;
      }

      const { userId: targetUserId } = req.params;
      if (!targetUserId) {
        res.status(400).json({ status: 400, message: 'Thiếu target userId' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const skip = parseInt(req.query.skip as string) || 0;

      const authHeader = req.headers.authorization;
      const posts = await postService.getUserTimeline(targetUserId as string, currentUserId, limit, skip, authHeader);
      res.status(200).json({ status: 200, data: posts });
    } catch (error: any) {
      console.error('[PostController] Error fetching user timeline:', error);
      res.status(400).json({ status: 400, message: error.message });
    }
  }

  /**
   * Lấy Spotify Access Token qua Client Credentials Flow
   */
  public async getSpotifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '05553adcf3fb4f15ba98db51941d4cc3';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '87a935be066d48bda91f25164ad0b2ca';
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials', 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
          }
        }
      );
      res.status(200).json({ status: 200, data: { accessToken: response.data.access_token } });
    } catch (error: any) {
      console.error('[PostController] Error retrieving Spotify token:', error?.response?.data || error.message);
      res.status(500).json({ status: 500, message: 'Failed to retrieve Spotify Token' });
    }
  }
}

export const postController = new PostController();
