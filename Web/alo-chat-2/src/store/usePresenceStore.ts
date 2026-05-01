import { create } from 'zustand';

interface PresenceInfo {
  isOnline: boolean;
  lastActiveAt: number;
}

interface PresenceState {
  presences: Record<string, PresenceInfo>;
  setPresence: (userId: string, isOnline: boolean, lastActiveAt?: number) => void;
  setBulkPresences: (presences: Record<string, PresenceInfo>) => void;
  getIsOnline: (userId: string) => boolean;
  getLastActive: (userId: string) => number;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presences: {},
  setPresence: (userId, isOnline, lastActiveAt) => 
    set((state) => ({ 
      presences: { 
        ...state.presences, 
        [userId]: { 
          isOnline, 
          lastActiveAt: lastActiveAt ?? Date.now() 
        } 
      } 
    })),
  setBulkPresences: (newPresences) => 
    set((state) => ({ 
      presences: { ...state.presences, ...newPresences } 
    })),
  getIsOnline: (userId) => !!get().presences[userId]?.isOnline,
  getLastActive: (userId) => get().presences[userId]?.lastActiveAt || 0,
}));
