import { create } from "zustand";

interface ChatState {
    typingUsers: Record<string, string[]>; // conversationId -> userIds
    onlineUsers: Record<string, { status: string; lastActive?: number }>;
    friendIds: Set<string>;

    // --- Notifications State ---
    unreadNotifsCount: number;

    // --- V2.1 Report System State ---
    isReportModalOpen: boolean;
    reportTargetId: string | null;
    reportTargetName: string | null;
    reportAnchorId: string | null;
    reportConversationType: "ONE_TO_ONE" | "GROUP" | null;
    isReportSelectionMode: boolean;
    selectedMessagesForReport: string[];

    // --- Actions ---
    setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
    setBulkPresence: (presences: any) => void;
    setOnlineStatus: (userId: string, status: string, lastActive?: number) => void;
    setFriendIds: (ids: Set<string>) => void;

    openReportModal: (targetId: string, targetName?: string | null, anchorId?: string | null, conversationType?: "ONE_TO_ONE" | "GROUP") => void;
    closeReportModal: () => void;
    setReportSelectionMode: (val: boolean) => void;
    toggleMessageForReport: (messageId: string) => void;
    clearReportSelection: () => void;

    setUnreadNotifsCount: (count: number) => void;
    incrementUnreadNotifsCount: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    typingUsers: {},
    onlineUsers: {},
    friendIds: new Set(),

    // --- Notifications State ---
    unreadNotifsCount: 0,

    // --- V2.1 Report System State ---
    isReportModalOpen: false,
    reportTargetId: null,
    reportTargetName: null,
    reportAnchorId: null,
    reportConversationType: null,
    isReportSelectionMode: false,
    selectedMessagesForReport: [],

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

    setBulkPresence: (presences) => {
        const normalized: Record<string, { status: string; lastActive?: number }> = {};
        Object.keys(presences).forEach((userId) => {
            const p = presences[userId];
            normalized[userId] = {
                status: p.status || (p.isOnline ? "online" : "offline"),
                lastActive: p.lastActive || p.lastActiveAt,
            };
        });
        set({ onlineUsers: normalized });
    },

    setOnlineStatus: (userId, status, lastActive) => {
        set((state) => ({
            onlineUsers: {
                ...state.onlineUsers,
                [userId]: { status, lastActive: lastActive || state.onlineUsers[userId]?.lastActive },
            },
        }));
    },

    setFriendIds: (ids) => {
        set({ friendIds: ids });
    },

    // --- V2.1 Reporting Actions ---
    openReportModal: (targetId, targetName, anchorId, conversationType) =>
        set({
            isReportModalOpen: true,
            reportTargetId: targetId,
            reportTargetName: targetName ?? null,
            reportAnchorId: anchorId ?? null,
            reportConversationType: conversationType ?? "ONE_TO_ONE",
        }),

    closeReportModal: () =>
        set({
            isReportModalOpen: false,
            reportTargetId: null,
            reportTargetName: null,
            reportAnchorId: null,
            reportConversationType: null,
        }),

    setReportSelectionMode: (val) => set({ isReportSelectionMode: val, selectedMessagesForReport: [] }),
    toggleMessageForReport: (messageId) =>
        set((state) => {
            const current = state.selectedMessagesForReport;
            const updated = current.includes(messageId)
                ? current.filter((id) => id !== messageId)
                : [...current, messageId];
            return { selectedMessagesForReport: updated };
        }),
    clearReportSelection: () => set({ isReportSelectionMode: false, selectedMessagesForReport: [] }),

    setUnreadNotifsCount: (count) => set({ unreadNotifsCount: count }),
    incrementUnreadNotifsCount: () => set((state) => ({ unreadNotifsCount: state.unreadNotifsCount + 1 })),
}));
