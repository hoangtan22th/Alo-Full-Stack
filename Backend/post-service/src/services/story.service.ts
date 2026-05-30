import Story, { IStory } from '../models/Story';
import { uploadFileToS3, deleteFileFromS3 } from './s3.service';
import { postService } from './post.service';
import { publishToRealtime } from '../config/rabbitmq';
import { ReactionType } from '../models/Post';

/**
 * Story Service — Quản lý Khoảnh khắc (Story 24h)
 */
export class StoryService {
  /**
   * Tạo Story mới
   */
  public async createStory(
    userId: string,
    file: Express.Multer.File,
    caption?: string,
    privacy: string = 'FRIENDS_ONLY',
    music?: { title: string; artist: string; url: string; lyrics?: string },
    allowedUsers?: string[],
    blockedUsers?: string[],
    authHeader?: string,
    duration?: number
  ): Promise<IStory> {
    if (!file) {
      throw new Error('Story phải có ảnh hoặc video');
    }

    const mediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    const mediaUrl = await uploadFileToS3(file.buffer, file.mimetype, file.originalname, 'stories');

    const story = new Story({
      userId,
      mediaUrl,
      mediaType,
      caption: caption?.trim(),
      music: music || undefined,
      privacy,
      allowedUsers: allowedUsers || [],
      blockedUsers: blockedUsers || [],
      duration: duration || 5000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 giờ sau
    });

    const savedStory = await story.save();

    // Publish NEW_STORY_RECEIVED to friends via RabbitMQ
    try {
      const friendIds = await postService.getFriendIds(userId, authHeader);
      console.log(`[RabbitMQ] Publishing NEW_STORY_RECEIVED for story ${savedStory._id} to ${friendIds.length} friends`);
      for (const friendId of friendIds) {
        await publishToRealtime('NEW_STORY_RECEIVED', {
          target: friendId,
          data: savedStory,
        });
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing new story event:', err);
    }

    return savedStory;
  }

  /**
   * Lấy danh sách story feed (story của bản thân + bạn bè, chưa hết hạn)
   * Trả về theo nhóm user, mỗi nhóm chứa danh sách stories
   */
  public async getStoryFeed(userId: string, authHeader?: string): Promise<{ userId: string; stories: IStory[] }[]> {
    const friendIds = await postService.getFriendIds(userId, authHeader);

    const now = new Date();

    // Lấy stories chưa hết hạn của bản thân và bạn bè
    const allUserIds = [userId, ...friendIds];

    const stories = await Story.find({
      userId: { $in: allUserIds },
      expiresAt: { $gt: now },
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(200); // Giới hạn tối đa

    // Lọc theo privacy
    const filteredStories = stories.filter((story) => {
      // Story của chính mình — luôn hiển thị
      if (story.userId === userId) return true;

      if (story.privacy === 'PUBLIC') return true;
      if (story.privacy === 'FRIENDS_ONLY') {
        // Đã là bạn bè (nằm trong allUserIds)
        return true;
      }
      if (story.privacy === 'PRIVATE') {
        return false;
      }
      if (story.privacy === 'CUSTOM') {
        if (story.blockedUsers.includes(userId)) return false;
        if (story.allowedUsers.length > 0) return story.allowedUsers.includes(userId);
        return true;
      }
      return false;
    });

    // Group stories theo userId
    const groupedMap = new Map<string, IStory[]>();

    // Đặt story của bản thân lên đầu
    groupedMap.set(userId, []);

    for (const story of filteredStories) {
      if (!groupedMap.has(story.userId)) {
        groupedMap.set(story.userId, []);
      }
      groupedMap.get(story.userId)!.push(story);
    }

    // Chuyển sang mảng, bỏ những user không có story
    const result: { userId: string; stories: IStory[] }[] = [];
    for (const [uid, userStories] of groupedMap) {
      if (userStories.length > 0) {
        result.push({ userId: uid, stories: userStories });
      }
    }

    return result;
  }

  /**
   * Lấy danh sách stories của một user cụ thể
   */
  public async getUserStories(userId: string): Promise<IStory[]> {
    return await Story.find({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  /**
   * Đánh dấu đã xem story
   */
  public async viewStory(storyId: string, viewerId: string): Promise<IStory> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại hoặc đã hết hạn');
    }

    // Không tính lượt xem cho chính chủ sở hữu Story
    if (story.userId.toString().toLowerCase() === viewerId.toString().toLowerCase()) {
      return story;
    }

    // Tự động dọn dẹp các lượt xem trùng lặp trong database (nếu có sẵn)
    const uniqueViewers = [];
    const seen = new Set();
    for (const v of story.viewers) {
      if (v && v.userId) {
        const uid = v.userId.toString().toLowerCase();
        if (!seen.has(uid)) {
          seen.add(uid);
          uniqueViewers.push(v);
        }
      }
    }
    story.viewers = uniqueViewers;

    // Kiểm tra xem đã xem chưa
    const alreadyViewed = story.viewers.some(
      (v) => v.userId.toString().toLowerCase() === viewerId.toString().toLowerCase()
    );

    if (!alreadyViewed) {
      story.viewers.push({ userId: viewerId, viewedAt: new Date() });
      story.viewCount = story.viewers.length;
      await story.save();

      // Publish STORY_VIEWED via RabbitMQ to:
      // 1. Story Owner (so they see the viewer list update in real-time)
      // 2. Viewer themselves (to confirm viewed status sync across tabs)
      try {
        const targets = Array.from(new Set([story.userId, viewerId]));
        for (const targetId of targets) {
          await publishToRealtime('STORY_VIEWED', {
            target: targetId,
            data: {
              storyId,
              viewerId,
              viewers: story.viewers,
              viewCount: story.viewCount,
            },
          });
        }
      } catch (err) {
        console.error('[RabbitMQ] Error publishing story viewed event:', err);
      }
    }

    return story;
  }

  /**
   * Thả cảm xúc Story
   */
  public async reactToStory(storyId: string, userId: string, type: ReactionType): Promise<IStory> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại hoặc đã hết hạn');
    }

    // Additive mode: mỗi lần nhấn thêm 1 reaction mới, không giới hạn, không thu hồi
    story.reactions.push({ userId, type });

    story.reactionCount = story.reactions.length;
    story.markModified('reactions'); // Báo Mongoose lưu mảng reactions này
    const savedStory = await story.save();

    // Publish STORY_REACTED to owner + friends via RabbitMQ
    try {
      const friendIds = await postService.getFriendIds(story.userId);
      const targets = Array.from(new Set([story.userId, ...friendIds]));
      for (const targetId of targets) {
        await publishToRealtime('STORY_REACTED', {
          target: targetId,
          data: {
            storyId,
            reactions: savedStory.reactions,
            reactionCount: savedStory.reactionCount,
          },
        });
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing story reaction event:', err);
    }

    return savedStory;
  }

  /**
   * Lấy danh sách người xem story (chỉ chủ story mới được phép)
   */
  public async getStoryViewers(storyId: string, requesterId: string): Promise<{ userId: string; viewedAt: Date }[]> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại hoặc đã hết hạn');
    }

    if (story.userId !== requesterId) {
      throw new Error('Bạn không có quyền xem danh sách người xem');
    }

    return story.viewers;
  }

  /**
   * Xóa story (chỉ chủ sở hữu)
   */
  public async deleteStory(storyId: string, userId: string, authHeader?: string): Promise<void> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại');
    }

    if (story.userId !== userId) {
      throw new Error('Bạn không có quyền lưu trữ story này');
    }

    // Soft delete: đặt trạng thái lưu trữ là true
    story.isArchived = true;
    await story.save();

    // Publish STORY_DELETED_RECEIVED to owner and friends via RabbitMQ so it disappears from feed immediately
    try {
      const friendIds = await postService.getFriendIds(userId, authHeader);
      const targets = Array.from(new Set([userId, ...friendIds]));
      console.log(`[RabbitMQ] Publishing STORY_DELETED_RECEIVED for story ${storyId} to owner and ${friendIds.length} friends`);
      for (const targetId of targets) {
        await publishToRealtime('STORY_DELETED_RECEIVED', {
          target: targetId,
          data: { storyId },
        });
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing delete story event:', err);
    }
  }

  /**
   * Lấy danh sách story đã lưu trữ của bản thân
   */
  public async getArchivedStories(userId: string): Promise<IStory[]> {
    return await Story.find({
      userId,
      isArchived: true,
    }).sort({ updatedAt: -1 });
  }

  /**
   * Xóa vĩnh viễn story khỏi database + S3 (không thể khôi phục)
   */
  public async permanentDeleteStory(storyId: string, userId: string): Promise<void> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại');
    }

    if (story.userId !== userId) {
      throw new Error('Bạn không có quyền xóa story này');
    }

    // Xóa file media trên S3
    try {
      await deleteFileFromS3(story.mediaUrl);
    } catch (err) {
      console.error('[S3] Error deleting story media:', err);
    }

    // Xóa document khỏi MongoDB
    await Story.findByIdAndDelete(storyId);
  }

  /**
   * Đăng lại một story từ kho lưu trữ
   */
  public async repostStory(storyId: string, userId: string, authHeader?: string): Promise<IStory> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại');
    }

    if (story.userId !== userId) {
      throw new Error('Bạn không có quyền đăng lại story này');
    }

    story.isArchived = false;
    story.createdAt = new Date();
    story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // gia hạn thêm 24 tiếng
    
    const savedStory = await story.save();

    // Publish NEW_STORY_RECEIVED to friends via RabbitMQ
    try {
      const friendIds = await postService.getFriendIds(userId, authHeader);
      console.log(`[RabbitMQ] Publishing NEW_STORY_RECEIVED for reposted story ${savedStory._id} to ${friendIds.length} friends`);
      for (const friendId of friendIds) {
        await publishToRealtime('NEW_STORY_RECEIVED', {
          target: friendId,
          data: savedStory,
        });
      }
    } catch (err) {
      console.error('[RabbitMQ] Error publishing new story event:', err);
    }

    return savedStory;
  }

  /**
   * Lấy chi tiết một story cụ thể
   */
  public async getStoryDetails(storyId: string): Promise<IStory> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story không tồn tại hoặc đã hết hạn');
    }
    return story;
  }
}

export const storyService = new StoryService();
