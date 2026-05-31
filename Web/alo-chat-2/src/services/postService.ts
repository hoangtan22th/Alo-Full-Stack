import api from "./api";

// ============ Types ============

export type ReactionType = 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface IMedia {
  url: string;
  type: "IMAGE" | "VIDEO";
  fileName: string;
}

export interface IReaction {
  userId: string;
  type: ReactionType;
}

export interface IPost {
  _id: string;
  userId: string;
  content?: string;
  media: IMedia[];
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE" | "CUSTOM";
  reactions: IReaction[];
  reactionCount: number;
  tags: string[];
  allowedUsers: string[];
  blockedUsers: string[];
  backgroundTemplate?: string; // Mood status background template
  // Backward compatible
  likes: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IComment {
  _id: string;
  postId: string;
  userId: string;
  content?: string;
  mediaUrl?: string; // Image inside comment
  parentId: string | null;
  reactions?: IReaction[];
  reactionCount?: number;
  createdAt: string;
  updatedAt: string;
  replies?: IComment[];
}

export interface IStoryViewer {
  userId: string;
  viewedAt: string;
}

export interface IStory {
  _id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  music?: {
    title: string;
    artist: string;
    url: string;
    lyrics?: string;
  };
  viewers: IStoryViewer[];
  viewCount: number;
  reactions?: IReaction[];
  reactionCount?: number;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE" | "CUSTOM";
  duration?: number; // Thời lượng xem (ms)
  createdAt: string;
  expiresAt: string;
}

export interface IStoryGroup {
  userId: string;
  stories: IStory[];
}

// ============ Emoji map cho Reactions ============

export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  HEART: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: 'Thích',
  HEART: 'Yêu thích',
  HAHA: 'Haha',
  WOW: 'Wow',
  SAD: 'Buồn',
  ANGRY: 'Phẫn nộ',
};

export interface INotification {
  _id: string;
  recipientId: string;
  senderId: string;
  type: 'LIKE_POST' | 'REACT_POST' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'TAG_POST' | 'NEW_POST';
  postId?: string;
  commentId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ============ Post Service ============

export const postService = {
  getHomeFeed: async (limit: number = 10, skip: number = 0): Promise<IPost[]> => {
    try {
      const data = await api.get<any, any>(`/posts/feed`, {
        params: { limit, skip },
      });
      return data || [];
    } catch (error) {
      console.error("Lỗi getHomeFeed:", error);
      return [];
    }
  },

  getUserTimeline: async (userId: string, limit: number = 10, skip: number = 0): Promise<IPost[]> => {
    try {
      const data = await api.get<any, any>(`/posts/user/${userId}`, {
        params: { limit, skip },
      });
      return data || [];
    } catch (error) {
      console.error("Lỗi getUserTimeline:", error);
      return [];
    }
  },

  getPostDetails: async (postId: string): Promise<IPost | null> => {
    try {
      const data = await api.get<any, any>(`/posts/${postId}`);
      return data || null;
    } catch (error) {
      console.error("Lỗi getPostDetails:", error);
      return null;
    }
  },

  /**
   * Tạo bài viết mới
   * - Hỗ trợ upload progress callback cho video
   * - Timeout tăng lên 120s cho video upload
   */
  createPost: async (
    content: string,
    files: File[],
    privacy: string = "FRIENDS_ONLY",
    onUploadProgress?: (progress: number) => void,
    tags?: string[],
    backgroundTemplate?: string,
  ): Promise<IPost | null> => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("privacy", privacy);

      if (tags && tags.length > 0) {
        formData.append("tags", JSON.stringify(tags));
      }

      if (backgroundTemplate) {
        formData.append("backgroundTemplate", backgroundTemplate);
      }

      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      const hasVideo = files.some((f) => f.type.startsWith("video/"));

      const data = await api.post<any, any>(`/posts`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // Tăng timeout cho video upload (120s thay vì 60s mặc định)
        timeout: hasVideo ? 120000 : 60000,
        ...(onUploadProgress && {
          onUploadProgress: (progressEvent: any) => {
            const total = progressEvent.total || 1;
            const progress = Math.round((progressEvent.loaded * 100) / total);
            onUploadProgress(progress);
          },
        }),
      });
      return data || null;
    } catch (error) {
      console.error("Lỗi createPost:", error);
      return null;
    }
  },

  editPost: async (
    postId: string,
    content: string,
    privacy: string,
    files: File[],
    keepMediaUrls: string[],
    tags?: string[]
  ): Promise<IPost | null> => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("privacy", privacy);
      formData.append("keepMediaUrls", JSON.stringify(keepMediaUrls));

      if (tags) {
        formData.append("tags", JSON.stringify(tags));
      }

      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      const hasVideo = files.some((f) => f.type.startsWith("video/"));

      const data = await api.put<any, any>(`/posts/${postId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: hasVideo ? 120000 : 60000,
      });
      return data || null;
    } catch (error) {
      console.error("Lỗi editPost:", error);
      return null;
    }
  },

  deletePost: async (postId: string): Promise<boolean> => {
    try {
      await api.delete(`/posts/${postId}`);
      return true;
    } catch (error) {
      console.error("Lỗi deletePost:", error);
      return false;
    }
  },

  /**
   * Thả biểu cảm bài viết (React)
   */
  reactToPost: async (postId: string, type: ReactionType): Promise<IPost | null> => {
    try {
      const data = await api.post<any, any>(`/posts/${postId}/react`, { type });
      return data || null;
    } catch (error) {
      console.error("Lỗi reactToPost:", error);
      return null;
    }
  },

  /**
   * Toggle Like (backward compatible)
   */
  toggleLikePost: async (postId: string): Promise<IPost | null> => {
    try {
      const data = await api.post<any, any>(`/posts/${postId}/like`);
      return data || null;
    } catch (error) {
      console.error("Lỗi toggleLikePost:", error);
      return null;
    }
  },

  getComments: async (postId: string, limit: number = 20, skip: number = 0): Promise<IComment[]> => {
    try {
      const data = await api.get<any, any>(`/posts/${postId}/comments`, {
        params: { limit, skip },
      });
      return data || [];
    } catch (error) {
      console.error("Lỗi getComments:", error);
      return [];
    }
  },

  createComment: async (postId: string, content?: string, parentId?: string, file?: File): Promise<IComment | null> => {
    try {
      const formData = new FormData();
      if (content) formData.append("content", content);
      if (parentId) formData.append("parentId", parentId);
      if (file) formData.append("file", file);

      const data = await api.post<any, any>(`/posts/${postId}/comments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data || null;
    } catch (error) {
      console.error("Lỗi createComment:", error);
      return null;
    }
  },

  /**
   * Xóa bình luận — trả về { success, deletedCount }
   * deletedCount cho biết số lượng comments đã xóa (bao gồm replies)
   */
  deleteComment: async (commentId: string): Promise<{ success: boolean; deletedCount: number }> => {
    try {
      const response = await api.delete<any, any>(`/posts/comments/${commentId}`);
      // Backend trả về: { status: 200, message: '...', data: { deletedCount: N } }
      const deletedCount = response?.deletedCount || response?.data?.deletedCount || 1;
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Lỗi deleteComment:", error);
      return { success: false, deletedCount: 0 };
    }
  },

  /**
   * Thả cảm xúc bình luận (React)
   */
  reactToComment: async (commentId: string, type: ReactionType): Promise<IComment | null> => {
    try {
      const data = await api.post<any, any>(`/posts/comments/${commentId}/react`, { type });
      return data || null;
    } catch (error) {
      console.error("Lỗi reactToComment:", error);
      return null;
    }
  },

  // ============ Notification API ============

  getNotifications: async (limit: number = 20, skip: number = 0): Promise<INotification[]> => {
    try {
      const data = await api.get<any, any>(`/notifications`, {
        params: { limit, skip },
      });
      return data || [];
    } catch (error) {
      console.error("Lỗi getNotifications:", error);
      return [];
    }
  },

  getUnreadNotificationsCount: async (): Promise<number> => {
    try {
      const data = await api.get<any, any>(`/notifications/unread-count`);
      return data?.unreadCount || 0;
    } catch (error) {
      console.error("Lỗi getUnreadNotificationsCount:", error);
      return 0;
    }
  },

  markAllNotificationsAsRead: async (): Promise<boolean> => {
    try {
      await api.put(`/notifications/read-all`);
      return true;
    } catch (error) {
      console.error("Lỗi markAllNotificationsAsRead:", error);
      return false;
    }
  },

  markNotificationAsRead: async (notificationId: string): Promise<boolean> => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error("Lỗi markNotificationAsRead:", error);
      return false;
    }
  },
  getSpotifyToken: async (): Promise<string | null> => {
    try {
      const data = await api.get<any, any>(`/posts/spotify/token`);
      return data?.accessToken || null;
    } catch (error) {
      console.error("Lỗi getSpotifyToken:", error);
      return null;
    }
  },

  // ============ Story API ============

  /**
   * Đăng Story mới
   */
  createStory: async (
    file: File,
    caption?: string,
    privacy: string = "FRIENDS_ONLY",
    onUploadProgress?: (progress: number) => void,
    music?: { title: string; artist: string; url: string; lyrics?: string },
    duration?: number
  ): Promise<IStory | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption) formData.append("caption", caption);
      formData.append("privacy", privacy);
      if (duration) formData.append("duration", String(duration));
      if (music) {
        formData.append("music", JSON.stringify(music));
      }

      const isVideo = file.type.startsWith("video/");

      const data = await api.post<any, any>(`/stories`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: isVideo ? 120000 : 60000,
        ...(onUploadProgress && {
          onUploadProgress: (progressEvent: any) => {
            const total = progressEvent.total || 1;
            const progress = Math.round((progressEvent.loaded * 100) / total);
            onUploadProgress(progress);
          },
        }),
      });
      return data || null;
    } catch (error) {
      console.error("Lỗi createStory:", error);
      return null;
    }
  },

  /**
   * Lấy Story Feed (nhóm theo user)
   */
  getStoryFeed: async (): Promise<IStoryGroup[]> => {
    try {
      const data = await api.get<any, any>(`/stories/feed`);
      return data || [];
    } catch (error) {
      console.error("Lỗi getStoryFeed:", error);
      return [];
    }
  },

  /**
   * Lấy danh sách story đã lưu trữ
   */
  getArchivedStories: async (): Promise<IStory[]> => {
    try {
      const data = await api.get<any, any>(`/stories/archive`);
      return data || [];
    } catch (error) {
      console.error("Lỗi getArchivedStories:", error);
      return [];
    }
  },

  /**
   * Đăng lại story từ kho lưu trữ
   */
  repostStory: async (storyId: string): Promise<IStory | null> => {
    try {
      const data = await api.post<any, any>(`/stories/${storyId}/repost`);
      return data || null;
    } catch (error) {
      console.error("Lỗi repostStory:", error);
      return null;
    }
  },

  /**
   * Đánh dấu đã xem Story
   */
  viewStory: async (storyId: string): Promise<IStory | null> => {
    try {
      const data = await api.post<any, any>(`/stories/${storyId}/view`);
      return data || null;
    } catch (error) {
      console.error("Lỗi viewStory:", error);
      return null;
    }
  },

  /**
   * Thả cảm xúc Story
   */
  reactToStory: async (storyId: string, type: ReactionType): Promise<IStory | null> => {
    try {
      const data = await api.post<any, any>(`/stories/${storyId}/react`, { type });
      return data || null;
    } catch (error) {
      console.error("Lỗi reactToStory:", error);
      return null;
    }
  },

  /**
   * Lấy chi tiết một Story cụ thể
   */
  getStoryDetails: async (storyId: string): Promise<IStory | null> => {
    try {
      const data = await api.get<any, any>(`/stories/${storyId}`);
      return data || null;
    } catch (error) {
      console.error("Lỗi getStoryDetails:", error);
      return null;
    }
  },

  /**
   * Xóa Story
   */
  deleteStory: async (storyId: string): Promise<boolean> => {
    try {
      await api.delete(`/stories/${storyId}`);
      return true;
    } catch (error) {
      console.error("Lỗi deleteStory:", error);
      return false;
    }
  },

  /**
   * Xóa vĩnh viễn Story (khỏi DB + S3, không thể khôi phục)
   */
  deleteStoryPermanently: async (storyId: string): Promise<boolean> => {
    try {
      await api.delete(`/stories/${storyId}/permanent`);
      return true;
    } catch (error) {
      console.error("Lỗi deleteStoryPermanently:", error);
      return false;
    }
  },

  /**
   * Lấy stories của một user cụ thể
   */
  getUserStories: async (targetUserId: string): Promise<IStory[]> => {
    try {
      const data = await api.get<any, any>(`/stories/user/${targetUserId}`);
      return data || [];
    } catch (error) {
      console.error("Lỗi getUserStories:", error);
      return [];
    }
  },
};

export default postService;
