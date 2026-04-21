import { create } from "zustand";

interface ChatState {
  typingUsers: Record<string, string[]>; // conversationId -> Array of userIds/names
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  typingUsers: {},
  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? Array.from(new Set([...current, userId]))
        : current.filter((id) => id !== userId);

      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated,
        },
      };
    });
  },
}));
