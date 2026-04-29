import { axiosClient } from "@/lib/axiosClient";
import axios from "axios";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";
const API_URL = `${GATEWAY_URL}/api/v1/admin/reports`;
const MESSAGES_URL = `${GATEWAY_URL}/api/v1/messages`;

export interface ReportUser {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

export interface ReportItem {
  id: string;
  reporter?: ReportUser;
  targetId: string;
  targetName: string | null;
  targetUser?: ReportUser;
  targetType: "USER" | "GROUP";
  reason: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  description: string | null;
  imageUrls: string[];
  messageIds: string[];
  adminNotes: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReports {
  content: ReportItem[];
  totalPages: number;
  totalElements: number;
  page?: number;
  number?: number;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  type: string;
  content: string;
  createdAt: string;
  isRevoked: boolean;
  hiddenAfterCount?: number;
}

export const reportService = {
  getReports: async (query?: {
    status?: string | null;
    targetName?: string;
    targetType?: string;
    reason?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedReports> => {
    try {
      const response = await axiosClient.get(API_URL, { params: query });
      const raw = response.data?.data;

      if (!raw) {
        return { content: [], totalPages: 0, totalElements: 0, page: 0, number: 0 };
      }

      // Spring VIA_DTO wraps pagination metadata in a `page` sub-object:
      // { content: [...], page: { size, number, totalElements, totalPages } }
      // Fallback: old PageImpl serialization had totalPages/totalElements at root level.
      const meta = raw.page ?? raw;

      return {
        content: raw.content ?? [],
        totalPages: meta.totalPages ?? 0,
        totalElements: meta.totalElements ?? 0,
        page: meta.number ?? raw.number ?? 0,
        number: meta.number ?? raw.number ?? 0,
      };
    } catch (error) {
      console.error("Error fetching reports:", error);
      throw error;
    }
  },

  resolveReport: async (
    reportId: string,
    actionPayload: {
      action: "DISMISS" | "WARN" | "BAN";
      adminNotes: string;
      adminId: string;
    },
  ): Promise<ReportItem> => {
    try {
      const response = await axiosClient.patch(
        `${API_URL}/${reportId}/action`,
        actionPayload,
      );
      return response.data?.data;
    } catch (error) {
      console.error(`Error resolving report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch messages by their IDs from message-service via Gateway.
   * Returns messages sorted by createdAt ASC (backend handles this).
   */
  fetchMessagesBulk: async (ids: string[]): Promise<MessageDTO[]> => {
    try {
      // Use plain axios with admin token from cookie — axiosClient baseURL is for /management
      const getCookie = (name: string) => {
        if (typeof document === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
        return null;
      };
      const token = getCookie("admin_token");

      const response = await axios.post(
        `${MESSAGES_URL}/bulk`,
        { ids },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      return response.data?.data ?? [];
    } catch (error) {
      console.error("Error fetching bulk messages:", error);
      return []; // Return empty instead of throwing — modal can still show without evidence
    }
  },

  /**
   * Fetch Group Info by ID from group-service for Group Reports
   */
  fetchGroupInfo: async (groupId: string): Promise<{ name?: string; avatar?: string | null } | null> => {
    try {
      const getCookie = (name: string) => {
        if (typeof document === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
        return null;
      };
      const token = getCookie("admin_token");

      const response = await axios.get(
        `${GATEWAY_URL}/api/v1/groups/${groupId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      return {
        name: response.data?.data?.name,
        avatar: response.data?.data?.avatar,
      };
    } catch (error) {
      console.error(`Error fetching group info for ${groupId}:`, error);
      return null;
    }
  },
 
  /**
   * Fetch full conversation history for context auditing (Admin only).
   */
  fetchFullConversationHistory: async (
    conversationId: string,
    limit: number = 200,
    skip: number = 0,
  ): Promise<MessageDTO[]> => {
    try {
      const getCookie = (name: string) => {
        if (typeof document === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
        return null;
      };
      const token = getCookie("admin_token");
 
      const response = await axios.get(
        `${MESSAGES_URL}/conversation/${conversationId}/admin`,
        {
          params: { limit, skip },
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      return response.data?.data ?? [];
    } catch (error) {
      console.error(
        `Error fetching full history for conversation ${conversationId}:`,
        error,
      );
      return [];
    }
  },

  getStatistics: async (): Promise<any> => {
    try {
      const response = await axiosClient.get(`${API_URL}/statistics`);
      return response.data?.data;
    } catch (error) {
      console.error("Error fetching report statistics:", error);
      throw error;
    }
  },
};
