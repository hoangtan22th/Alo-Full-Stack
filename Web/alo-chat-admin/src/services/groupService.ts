import { axiosClient } from "@/lib/axiosClient";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";
const API_URL = `${GATEWAY_URL}/api/v1/groups/admin`;

export interface GroupMember {
  userId: string;
  role: "LEADER" | "DEPUTY" | "MEMBER";
  joinedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  groupAvatar: string;
  isGroup: boolean;
  members: GroupMember[];
  isBanned: boolean;
  isApprovalRequired: boolean;
  isLinkEnabled: boolean;
  isHistoryVisible: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface PaginatedGroups {
  content: Group[];
  totalPages: number;
  totalElements: number;
  page?: number;
  size?: number;
}

export interface GroupStats {
  totalGroups: number;
  createdToday: number;
  createdYesterday: number;
  createdTodayTrend: number;
  avgMembers: number;
}

export const groupService = {
  getGroupStats: async (): Promise<GroupStats> => {
    try {
      const response = await axiosClient.get(`${API_URL}/stats`);
      return (
        response.data?.data || {
          totalGroups: 0,
          createdToday: 0,
          createdYesterday: 0,
          createdTodayTrend: 0,
          avgMembers: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching group stats:", error);
      throw error;
    }
  },

  getAllGroups: async (query?: {
    name?: string;
    isGroup?: boolean;
    isBanned?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedGroups> => {
    try {
      const response = await axiosClient.get(`${API_URL}/search`, {
        params: query,
      });
      return (
        response.data?.data || {
          content: [],
          totalPages: 0,
          totalElements: 0,
          page: 0,
          size: 10,
        }
      );
    } catch (error) {
      console.error("Error fetching groups:", error);
      throw error;
    }
  },

  toggleBanGroup: async (id: string, isBanned: boolean): Promise<void> => {
    try {
      await axiosClient.put(`${API_URL}/${id}/ban`, { isBanned });
    } catch (error) {
      console.error("Error toggling ban group:", error);
      throw error;
    }
  },
};
