import api from "./api";

export interface IMedia {
  url: string;
  type: "IMAGE" | "VIDEO";
  fileName: string;
}

export interface IPost {
  _id: string;
  userId: string;
  content?: string;
  media: IMedia[];
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  likes: string[];
  likeCount: number;
  commentCount: number;
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
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: IComment[];
  user?: {
    id: string;
    fullName: string;
    avatar: string;
  };
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

  createPost: async (content: string, files: any[], privacy: string = "FRIENDS_ONLY"): Promise<IPost | null> => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("privacy", privacy);

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
    keepMediaUrls: string[]
  ): Promise<IPost | null> => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("privacy", privacy);
      formData.append("keepMediaUrls", JSON.stringify(keepMediaUrls));

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

  createComment: async (postId: string, content: string, parentId?: string): Promise<IComment | null> => {
    try {
      const payload: any = { content };
      if (parentId) payload.parentId = parentId;

      const response = await api.post<any, any>(`/posts/${postId}/comments`, payload);
      return response || null;
    } catch (error) {
      console.error("Lỗi createComment:", error);
      return null;
    }
  },

  deleteComment: async (commentId: string): Promise<boolean> => {
    try {
      await api.delete(`/posts/comments/${commentId}`);
      return true;
    } catch (error) {
      console.error("Lỗi deleteComment:", error);
      return false;
    }
  },
};
export default postService;
