import Post, { IPost, IMedia, ReactionType } from '../models/Post';
import Comment from '../models/Comment';
import { uploadFileToS3, deleteFileFromS3 } from './s3.service';
import axios from 'axios';
import { Types } from 'mongoose';
import { publishToRealtime } from '../config/rabbitmq';
import { notificationService } from './notification.service';

/**
 * Kiểm tra xem một chuỗi có phải ObjectId hợp lệ không
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

export class PostService {
  /**
   * Lấy danh sách ID bạn bè từ contact-service
   */
  public async getFriendIds(userId: string, authHeader?: string): Promise<string[]> {
    try {
      const contactServiceUrl = process.env.CONTACT_SERVICE_URL || 'http://127.0.0.1:8888/api/v1/contacts';
      const headers: any = {
        'X-User-Id': userId,
      };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
      const response = await axios.get(`${contactServiceUrl}/friends`, {
        headers,
        timeout: 10000, // 10s timeout cho inter-service call
      });

      if (response.data && (response.data.status === 200 || response.data.status === 'SUCCESS') && Array.isArray(response.data.data)) {
        return response.data.data.map((f: any) => {
          return f.requesterId === userId ? f.recipientId : f.requesterId;
        });
      }
      return [];
    } catch (error) {
      console.error('[PostService] Error fetching friends list:', error);
      return [];
    }
  }

  /**
   * Kiểm tra xem 2 user có phải bạn bè không
   */
  public async isFriend(userId: string, targetUserId: string, authHeader?: string): Promise<boolean> {
    if (userId === targetUserId) return true;
    const friends = await this.getFriendIds(userId, authHeader);
    return friends.includes(targetUserId);
  }

  /**
   * Tạo bài viết mới
   */
  public async createPost(
    userId: string,
    content?: string,
    files?: Express.Multer.File[],
    privacy: string = 'FRIENDS_ONLY',
    tags?: string[],
    allowedUsers?: string[],
    blockedUsers?: string[],
    authHeader?: string,
    backgroundTemplate?: string
  ): Promise<IPost> {
    // Validate: phải có content hoặc files
    if ((!content || content.trim() === '') && (!files || files.length === 0)) {
      throw new Error('Bài viết phải có nội dung hoặc hình ảnh/video');
    }

    const mediaList: IMedia[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const type = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const url = await uploadFileToS3(file.buffer, file.mimetype, file.originalname, 'posts');
        mediaList.push({
          url,
          type,
          fileName: file.originalname,
        });
      }
    }

    const post = new Post({
      userId,
      content: content?.trim(),
      media: mediaList,
      privacy,
      tags: tags || [],
      allowedUsers: allowedUsers || [],
      blockedUsers: blockedUsers || [],
      backgroundTemplate: backgroundTemplate || undefined,
    });

    const savedPost = await post.save();

    // Publish NEW_POST_RECEIVED to all friends via RabbitMQ if NOT PRIVATE
    try {
      if (privacy !== 'PRIVATE') {
        const friendIds = await this.getFriendIds(userId, authHeader);
        const taggedIds = new Set(savedPost.tags || []);
        console.log(`[RabbitMQ] Publishing NEW_POST_RECEIVED for new post ${savedPost._id} to ${friendIds.length} friends`);
        
        for (const friendId of friendIds) {
          await publishToRealtime('NEW_POST_RECEIVED', {
            target: friendId,
            data: savedPost,
          });

          if (!taggedIds.has(friendId)) {
            // Tạo thông báo NEW_POST lưu vào DB và gửi real-time
            await notificationService.createNotification(
              friendId,
              userId,
              'NEW_POST',
              `đã đăng một bài viết mới`,
              savedPost._id.toString()
            );
          }
        }

        // Gửi thông báo TAG_POST cho những người được gắn thẻ
        if (savedPost.tags && savedPost.tags.length > 0) {
          for (const taggedId of savedPost.tags) {
            await notificationService.createNotification(
              taggedId,
              userId,
              'TAG_POST',
              `đã gắn thẻ bạn trong một bài viết`,
              savedPost._id.toString()
            );
          }
        }
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing new post event:', err);
    }

    return savedPost;
  }

  /**
   * Chỉnh sửa bài viết
   */
  public async editPost(
    postId: string,
    userId: string,
    content?: string,
    privacy?: string,
    files?: Express.Multer.File[],
    keepMediaUrls?: string[], // Danh sách các media cũ muốn giữ lại
    tags?: string[],
    allowedUsers?: string[],
    blockedUsers?: string[]
  ): Promise<IPost> {
    if (!isValidObjectId(postId)) {
      throw new Error('postId không hợp lệ');
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    if (post.userId !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa bài viết này');
    }

    // Cập nhật nội dung và quyền riêng tư nếu có
    if (content !== undefined) post.content = content.trim();
    if (privacy !== undefined) post.privacy = privacy as any;
    if (tags !== undefined) post.tags = tags;
    if (allowedUsers !== undefined) post.allowedUsers = allowedUsers;
    if (blockedUsers !== undefined) post.blockedUsers = blockedUsers;

    // Xử lý media
    const urlsToKeep = keepMediaUrls || [];
    const mediaToDelete = post.media.filter((m) => !urlsToKeep.includes(m.url));

    // Xóa các file cũ không muốn giữ khỏi S3 (song song để tăng tốc)
    await Promise.allSettled(
      mediaToDelete.map((m) => deleteFileFromS3(m.url))
    );

    // Giữ lại các media được chỉ định
    let updatedMedia = post.media.filter((m) => urlsToKeep.includes(m.url));

    // Upload các file mới lên S3
    if (files && files.length > 0) {
      for (const file of files) {
        const type = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const url = await uploadFileToS3(file.buffer, file.mimetype, file.originalname, 'posts');
        updatedMedia.push({
          url,
          type,
          fileName: file.originalname,
        });
      }
    }

    post.media = updatedMedia;
    return await post.save();
  }

  /**
   * Xóa bài viết
   */
  public async deletePost(postId: string, userId: string, authHeader?: string): Promise<void> {
    if (!isValidObjectId(postId)) {
      throw new Error('postId không hợp lệ');
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    if (post.userId !== userId) {
      throw new Error('Bạn không có quyền xóa bài viết này');
    }

    // Xóa tất cả các file media trên S3 (song song)
    await Promise.allSettled(
      post.media.map((m) => deleteFileFromS3(m.url))
    );

    // Xóa các bình luận liên quan
    await Comment.deleteMany({ postId: new Types.ObjectId(postId) });

    // Xóa bài đăng
    await Post.findByIdAndDelete(postId);

    // Publish POST_DELETED_RECEIVED to all friends via RabbitMQ
    try {
      const friendIds = await this.getFriendIds(userId, authHeader);
      console.log(`[RabbitMQ] Publishing POST_DELETED_RECEIVED for deleted post ${postId} to ${friendIds.length} friends`);
      for (const friendId of friendIds) {
        await publishToRealtime('POST_DELETED_RECEIVED', {
          target: friendId,
          data: { postId },
        });
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing delete post event:', err);
    }
  }

  /**
   * Lấy chi tiết bài viết
   */
  public async getPostDetails(postId: string, currentUserId: string, authHeader?: string): Promise<IPost> {
    if (!isValidObjectId(postId)) {
      throw new Error('postId không hợp lệ');
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    // Kiểm tra quyền xem bài viết dựa trên privacy
    if (post.userId !== currentUserId) {
      if (post.privacy === 'PRIVATE') {
        throw new Error('Bài viết này ở chế độ riêng tư');
      }
      if (post.privacy === 'FRIENDS_ONLY') {
        const isFriend = await this.isFriend(currentUserId, post.userId, authHeader);
        if (!isFriend) {
          throw new Error('Bài viết này chỉ dành cho bạn bè');
        }
      }
      if (post.privacy === 'CUSTOM') {
        // CUSTOM: kiểm tra allowedUsers (whitelist) và blockedUsers (blacklist)
        if (post.blockedUsers.includes(currentUserId)) {
          throw new Error('Bạn không có quyền xem bài viết này');
        }
        if (post.allowedUsers.length > 0 && !post.allowedUsers.includes(currentUserId)) {
          throw new Error('Bài viết này chỉ dành cho những người được chỉ định');
        }
      }
    }

    return post;
  }

  /**
   * Thả cảm xúc bài viết (React/Unreact)
   * - Nếu chưa react: thêm reaction mới
   * - Nếu đã react cùng loại: bỏ reaction (unreact)
   * - Nếu đã react khác loại: đổi sang loại mới
   */
  public async reactToPost(postId: string, userId: string, type: ReactionType): Promise<IPost> {
    if (!isValidObjectId(postId)) {
      throw new Error('postId không hợp lệ');
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    const existingIndex = post.reactions.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      const existing = post.reactions[existingIndex]!;
      if (existing.type === type) {
        // Unreact: bỏ reaction khi nhấn cùng loại
        post.reactions.splice(existingIndex, 1);
      } else {
        // Đổi loại reaction
        post.reactions[existingIndex]!.type = type;
      }
    } else {
      // Thêm reaction mới
      post.reactions.push({ userId, type });
    }

    // Đồng bộ counts
    post.reactionCount = post.reactions.length;

    // Backward compatibility: đồng bộ likes[] và likeCount
    post.likes = post.reactions.map((r) => r.userId);
    post.likeCount = post.reactions.length;

    const savedPost = await post.save();

    // Publish POST_REACTED to the post room via RabbitMQ
    try {
      console.log(`[RabbitMQ] Publishing POST_REACTED interaction for post ${postId}`);
      await publishToRealtime('POST_INTERACTION', {
        room: `post_${postId}`,
        data: {
          actorId: userId,
          postId,
          eventType: 'POST_REACTED',
          payload: savedPost,
        },
      });
    } catch (err) {
      console.error('[RabbitMQ] Error publishing post reaction event:', err);
    }

    // Save notification for reaction
    try {
      if (savedPost.userId !== userId) {
        await notificationService.createNotification(
          savedPost.userId,
          userId,
          'REACT_POST',
          `đã bày tỏ cảm xúc về bài viết của bạn`,
          postId
        );
      }
    } catch (notifErr) {
      console.error('[Notification] Error creating reaction notification:', notifErr);
    }

    return savedPost;
  }

  /**
   * Toggle Like (backward compatible — gọi reactToPost với type = LIKE)
   */
  public async toggleLikePost(postId: string, userId: string): Promise<IPost> {
    return this.reactToPost(postId, userId, 'LIKE');
  }

  /**
   * Lấy Newsfeed trang chủ (Bài viết của bản thân & bạn bè)
   */
  public async getHomeFeed(userId: string, limit: number = 10, skip: number = 0, authHeader?: string): Promise<IPost[]> {
    const friendIds = await this.getFriendIds(userId, authHeader);

    // Truy vấn bài viết:
    // 1. Nếu là bài viết của chính mình -> Lấy hết (PUBLIC, FRIENDS_ONLY, PRIVATE, CUSTOM)
    // 2. Nếu là của bạn bè -> Chỉ lấy PUBLIC và FRIENDS_ONLY, hoặc CUSTOM nếu userId nằm trong allowedUsers
    const query: any = {
      $or: [
        { userId: userId },
        {
          userId: { $in: friendIds },
          privacy: { $in: ['PUBLIC', 'FRIENDS_ONLY'] },
        },
        {
          userId: { $in: friendIds },
          privacy: 'CUSTOM',
          allowedUsers: userId,
          blockedUsers: { $ne: userId },
        },
      ]
    };

    return await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  /**
   * Lấy Timeline Trang cá nhân (Bài đăng của một user cụ thể)
   */
  public async getUserTimeline(
    targetUserId: string,
    currentUserId: string,
    limit: number = 10,
    skip: number = 0,
    authHeader?: string
  ): Promise<IPost[]> {
    if (currentUserId === targetUserId) {
      // Xem trang cá nhân của chính mình -> Lấy hết
      return await Post.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    const isFriend = await this.isFriend(currentUserId, targetUserId, authHeader);

    const query: any = {
      userId: targetUserId,
      $or: [
        { privacy: 'PUBLIC' },
        ...(isFriend ? [{ privacy: 'FRIENDS_ONLY' }] : []),
        {
          privacy: 'CUSTOM',
          allowedUsers: currentUserId,
          blockedUsers: { $ne: currentUserId },
        },
      ],
    };

    return await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}

export const postService = new PostService();
