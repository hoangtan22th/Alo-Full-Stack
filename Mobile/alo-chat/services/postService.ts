import api from "./api";

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

export interface IMedia {
  url: string;
  type: "IMAGE" | "VIDEO";
  fileName: string;
}

export interface IReaction {
  userId: string;
  type: ReactionType;
}

export type ReactionType = 'LIKE' | 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface IPost {
  _id: string;
  userId: string;
  content?: string;
  media: IMedia[];
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  likes: string[];
  likeCount: number;
  commentCount: number;
  reactions?: IReaction[];
  reactionCount?: number;
  tags?: string[];
  backgroundTemplate?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatar: string;
  };
}

export interface IComment {
  _id: string;
  postId: string;
  userId: string;
  content?: string;
  mediaUrl?: string;
  parentId: string | null;
  reactions?: IReaction[];
  reactionCount?: number;
  createdAt: string;
  updatedAt: string;
  replies?: IComment[];
  user?: {
    id: string;
    fullName: string;
    avatar: string;
  };
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
  duration?: number;
  createdAt: string;
  expiresAt: string;
}

export interface IStoryGroup {
  userId: string;
  stories: IStory[];
}

export const postService = {
  getHomeFeed: async (limit: number = 10, skip: number = 0): Promise<IPost[]> => {
    try {
      const response = await api.get<any, any>(`/posts/feed`, {
        params: { limit, skip },
      });
      return response || [];
    } catch (error) {
      console.error("Lỗi getHomeFeed:", error);
      return [];
    }
  },

  getUserTimeline: async (userId: string, limit: number = 10, skip: number = 0): Promise<IPost[]> => {
    try {
      const response = await api.get<any, any>(`/posts/user/${userId}`, {
        params: { limit, skip },
      });
      return response || [];
    } catch (error) {
      console.error("Lỗi getUserTimeline:", error);
      return [];
    }
  },

  getPostDetails: async (postId: string): Promise<IPost | null> => {
    try {
      const response = await api.get<any, any>(`/posts/${postId}`);
      return response || null;
    } catch (error) {
      console.error("Lỗi getPostDetails:", error);
      return null;
    }
  },

  createPost: async (
    content: string, 
    files: any[], 
    privacy: string = "PUBLIC",
    tags?: string[],
    backgroundTemplate?: string
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
        files.forEach((file, index) => {
          formData.append("files", {
            uri: file.uri,
            type: file.type || "image/jpeg",
            name: file.fileName || `file_${index}.jpg`,
          } as any);
        });
      }

      const response = await api.post<any, any>(`/posts`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response || null;
    } catch (error) {
      console.error("Lỗi createPost:", error);
      return null;
    }
  },

  editPost: async (
    postId: string,
    content: string,
    privacy: string,
    files: any[],
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
        files.forEach((file, index) => {
          formData.append("files", {
            uri: file.uri,
            type: file.type || "image/jpeg",
            name: file.fileName || `file_${index}.jpg`,
          } as any);
        });
      }

      const response = await api.put<any, any>(`/posts/${postId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response || null;
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

  toggleLikePost: async (postId: string): Promise<IPost | null> => {
    try {
      const response = await api.post<any, any>(`/posts/${postId}/like`);
      return response || null;
    } catch (error) {
      console.error("Lỗi toggleLikePost:", error);
      return null;
    }
  },

  getComments: async (postId: string, limit: number = 20, skip: number = 0): Promise<IComment[]> => {
    try {
      const response = await api.get<any, any>(`/posts/${postId}/comments`, {
        params: { limit, skip },
      });
      return response || [];
    } catch (error) {
      console.error("Lỗi getComments:", error);
      return [];
    }
  },

  createComment: async (postId: string, content?: string, parentId?: string, file?: any): Promise<IComment | null> => {
    try {
      if (file) {
        const formData = new FormData();
        if (content) formData.append("content", content);
        if (parentId) formData.append("parentId", parentId);
        formData.append("file", {
          uri: file.uri,
          type: file.type || "image/jpeg",
          name: file.fileName || "comment_image.jpg",
        } as any);

        const response = await api.post<any, any>(`/posts/${postId}/comments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response || null;
      } else {
        const payload: any = { content };
        if (parentId) payload.parentId = parentId;

        const response = await api.post<any, any>(`/posts/${postId}/comments`, payload);
        return response || null;
      }
    } catch (error) {
      console.error("Lỗi createComment:", error);
      return null;
    }
  },

  deleteComment: async (commentId: string): Promise<{ success: boolean; deletedCount: number }> => {
    try {
      const response = await api.delete<any, any>(`/posts/comments/${commentId}`);
      const deletedCount = response?.deletedCount || response?.data?.deletedCount || 1;
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Lỗi deleteComment:", error);
      return { success: false, deletedCount: 0 };
    }
  },

  // ============ Reaction APIs ============

  reactToPost: async (postId: string, type: ReactionType): Promise<IPost | null> => {
    try {
      const response = await api.post<any, any>(`/posts/${postId}/react`, { type });
      return response || null;
    } catch (error) {
      console.error("Lỗi reactToPost:", error);
      return null;
    }
  },

  reactToComment: async (commentId: string, type: ReactionType): Promise<IComment | null> => {
    try {
      const response = await api.post<any, any>(`/posts/comments/${commentId}/react`, { type });
      return response || null;
    } catch (error) {
      console.error("Lỗi reactToComment:", error);
      return null;
    }
  },

  getSpotifyToken: async (): Promise<string | null> => {
    try {
      const response = await api.get<any, any>(`/posts/spotify/token`);
      return response?.accessToken || null;
    } catch (error) {
      console.error("Lỗi getSpotifyToken:", error);
      return null;
    }
  },

  // ============ Notification APIs ============
  getNotifications: async (limit: number = 20, skip: number = 0): Promise<any[]> => {
    try {
      const response = await api.get<any, any>(`/notifications`, {
        params: { limit, skip },
      });
      return response || [];
    } catch (error) {
      console.error("Lỗi getNotifications:", error);
      return [];
    }
  },

  getUnreadNotificationsCount: async (): Promise<number> => {
    try {
      const response = await api.get<any, any>(`/notifications/unread-count`);
      return response?.unreadCount || 0;
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

  // ============ Story APIs ============
  createStory: async (
    file: any,
    caption?: string,
    privacy: string = "FRIENDS_ONLY",
    music?: { title: string; artist: string; url: string; lyrics?: string },
    duration?: number
  ): Promise<IStory | null> => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.type || "image/jpeg",
        name: file.fileName || "story_file.jpg",
      } as any);

      if (caption) formData.append("caption", caption);
      formData.append("privacy", privacy);
      if (duration) formData.append("duration", String(duration));
      if (music) {
        formData.append("music", JSON.stringify(music));
      }

      const response = await api.post<any, any>(`/stories`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response || null;
    } catch (error) {
      console.error("Lỗi createStory:", error);
      return null;
    }
  },

  getStoryFeed: async (): Promise<IStoryGroup[]> => {
    try {
      const response = await api.get<any, any>(`/stories/feed`);
      return response || [];
    } catch (error) {
      console.error("Lỗi getStoryFeed:", error);
      return [];
    }
  },

  getArchivedStories: async (): Promise<IStory[]> => {
    try {
      const response = await api.get<any, any>(`/stories/archive`);
      return response || [];
    } catch (error) {
      console.error("Lỗi getArchivedStories:", error);
      return [];
    }
  },

  repostStory: async (storyId: string): Promise<IStory | null> => {
    try {
      const response = await api.post<any, any>(`/stories/${storyId}/repost`);
      return response || null;
    } catch (error) {
      console.error("Lỗi repostStory:", error);
      return null;
    }
  },

  viewStory: async (storyId: string): Promise<IStory | null> => {
    try {
      const response = await api.post<any, any>(`/stories/${storyId}/view`);
      return response || null;
    } catch (error) {
      console.error("Lỗi viewStory:", error);
      return null;
    }
  },

  reactToStory: async (storyId: string, type: ReactionType): Promise<IStory | null> => {
    try {
      const response = await api.post<any, any>(`/stories/${storyId}/react`, { type });
      return response || null;
    } catch (error) {
      console.error("Lỗi reactToStory:", error);
      return null;
    }
  },

  getStoryDetails: async (storyId: string): Promise<IStory | null> => {
    try {
      const response = await api.get<any, any>(`/stories/${storyId}`);
      return response || null;
    } catch (error) {
      console.error("Lỗi getStoryDetails:", error);
      return null;
    }
  },

  deleteStory: async (storyId: string): Promise<boolean> => {
    try {
      await api.delete(`/stories/${storyId}`);
      return true;
    } catch (error) {
      console.error("Lỗi deleteStory:", error);
      return false;
    }
  },

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
      const response = await api.get<any, any>(`/stories/user/${targetUserId}`);
      return response || [];
    } catch (error) {
      console.error("Lỗi getUserStories:", error);
      return [];
    }
  },
};

export default postService;
