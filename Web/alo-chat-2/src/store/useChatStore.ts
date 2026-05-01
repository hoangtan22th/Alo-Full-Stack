import { create } from "zustand";

interface Message {
  _id: string;
  type?: string;
  isRevoked?: boolean;
}

interface ChatState {
  typingUsers: Record<string, string[]>;
  friendIds: Set<string>;
  onlineUsers: Record<string, { status: string; last_active?: number }>;
  isReportSelectionMode: boolean;
  selectedMessagesForReport: string[];
  isReportModalOpen: boolean;
  reportTargetId: string | null;
  reportTargetName: string | null;
  isCustomizeMode: boolean; // true when user came from "Tùy chỉnh bằng chứng"

  setReportSelectionMode: (isSelecting: boolean) => void;
  toggleMessageForReport: (messageId: string) => void;
  clearReportSelection: () => void;
  autoSelectEvidence: (messages: Message[]) => void;
  openReportModal: (targetId: string, targetName?: string) => void;
  closeReportModal: () => void;
  enterCustomizeMode: () => void;
  exitCustomizeMode: () => void;

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setFriendIds: (ids: Set<string>) => void;
  setOnlineStatus: (userId: string, status: string, lastActive?: number) => void;
  setBulkPresence: (presenceData: Record<string, any>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  typingUsers: {},
  friendIds: new Set(),
  onlineUsers: {},
  isReportSelectionMode: false,
  selectedMessagesForReport: [],
  isReportModalOpen: false,
  reportTargetId: null,
  reportTargetName: null,
  isCustomizeMode: false,

  setReportSelectionMode: (isSelecting) =>
    set({ isReportSelectionMode: isSelecting }),

  toggleMessageForReport: (messageId) =>
    set((state) => {
      const isSelected = state.selectedMessagesForReport.includes(messageId);
      if (isSelected) {
        return {
          selectedMessagesForReport: state.selectedMessagesForReport.filter(
            (id) => id !== messageId
          ),
        };
      } else {
        if (state.selectedMessagesForReport.length >= 40) return state;
        return {
          selectedMessagesForReport: [
            ...state.selectedMessagesForReport,
            messageId,
          ],
        };
      }
    }),

  clearReportSelection: () =>
    set({
      selectedMessagesForReport: [],
      isReportSelectionMode: false,
      isReportModalOpen: false,
      isCustomizeMode: false,
    }),

  /**
   * Implements "20 oldest + 20 newest" logic.
   * If total valid messages <= 40, takes all.
   */
  autoSelectEvidence: (messages) => {
    const valid = messages.filter(
      (m) =>
        !m.isRevoked &&
        (m.type === "text" || m.type === "image" || m.type === "file")
    );
    let ids: string[];
    if (valid.length <= 40) {
      ids = valid.map((m) => m._id);
    } else {
      const first20 = valid.slice(0, 20).map((m) => m._id);
      const last20 = valid.slice(-20).map((m) => m._id);
      ids = Array.from(new Set([...first20, ...last20]));
    }
    console.log(
      "[autoSelectEvidence] input:", messages.length, "msgs →",
      "valid:", valid.length, "→ auto-selected IDs:", ids
    );
    set({ selectedMessagesForReport: ids });
  },

  openReportModal: (targetId, targetName) =>
    set({
      isReportModalOpen: true,
      reportTargetId: targetId,
      reportTargetName: targetName ?? null,
    }),

  closeReportModal: () =>
    set({
      isReportModalOpen: false,
      isCustomizeMode: false,
    }),

  /**
   * Called when user clicks "Tùy chỉnh bằng chứng".
   * Hides modal, enters selection mode keeping current evidence.
   */
  enterCustomizeMode: () =>
    set({
      isReportModalOpen: false,
      isReportSelectionMode: true,
      isCustomizeMode: true,
    }),

  /**
   * Called when user clicks "Continue" in the toolbar.
   * Re-opens modal in custom view.
   */
  exitCustomizeMode: () =>
    set({
      isReportSelectionMode: false,
      isReportModalOpen: true,
    }),

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
  setFriendIds: (ids) => set({ friendIds: ids }),

  setOnlineStatus: (userId, status, lastActive) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: { status, last_active: lastActive },
      },
    }));
  },

  setBulkPresence: (presenceData) => {
    const formatted: Record<string, { status: string; last_active?: number }> = {};
    Object.entries(presenceData).forEach(([userId, info]: [string, any]) => {
      formatted[userId] = {
        status: info.isOnline ? "online" : "offline",
        last_active: info.lastActiveAt,
      };
    });
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        ...formatted,
      },
    }));
  },
}));
