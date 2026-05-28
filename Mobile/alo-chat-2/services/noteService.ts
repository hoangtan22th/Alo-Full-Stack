import api from "./api";

export interface NoteDTO {
  _id: string;
  conversationId: string;
  creatorId: string;
  content: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
}

export const noteService = {
  getNotesByConversation: async (groupId: string): Promise<NoteDTO[]> => {
    try {
      const response = await api.get(`/groups/${groupId}/notes`);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ghi chú:", error);
      return [];
    }
  },

  createNote: async (
    groupId: string,
    content: string,
    links: string[],
  ): Promise<NoteDTO | null> => {
    try {
      const response = await api.post(`/groups/${groupId}/notes`, {
        content,
        links,
      });
      return response as any;
    } catch (error) {
      console.error("Lỗi khi tạo ghi chú:", error);
      return null;
    }
  },

  deleteNote: async (noteId: string): Promise<boolean> => {
    try {
      await api.delete(`/groups/notes/${noteId}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa ghi chú:", error);
      return false;
    }
  },

  updateNote: async (
    noteId: string,
    content: string,
    links: string[],
  ): Promise<NoteDTO | null> => {
    try {
      const response = await api.put(`/groups/notes/${noteId}`, {
        content,
        links,
      });
      return response as any;
    } catch (error) {
      console.error("Lỗi khi cập nhật ghi chú:", error);
      return null;
    }
  },
};
