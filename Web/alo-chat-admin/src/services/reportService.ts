import { axiosClient } from "@/lib/axiosClient";
import axios from "axios";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888";
const API_URL = `${GATEWAY_URL}/api/v1/admin/reports`;
const MESSAGES_URL = `${GATEWAY_URL}/api/v1/messages`;

export interface ReportUser {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

export interface MessageSnapshot {
  messageId: string;
  senderId: string;
  content: string;
  contentType: string;
  sentAt: string;
  isAnchor: boolean;
  sequenceIndex: number;
  totalMessagesInConversation: number;
  isByReporter: boolean;
  senderName?: string;
  senderAvatar?: string;
}

export interface ReportGroup {
  id: string;
  name: string;
  groupAvatar?: string | null;
}

export interface ReportItem {
  id: string;
  reporter?: ReportUser;
  targetId: string;
  targetName: string | null;
  targetUser?: ReportUser;
  targetGroup?: ReportGroup;
  targetType: "USER" | "GROUP";
  reason: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  description: string | null;
  imageUrls: string[];
  messageSnapshots?: MessageSnapshot[]; // New in V2.1
  adminNotes: string | null;
  resolvedBy: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
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

  /**
   * Lock a report for review.
   * Uses X-Admin-Id header from current auth state.
   */
  lockReport: async (reportId: string, adminId: string): Promise<void> => {
    try {
      await axiosClient.patch(`${API_URL}/${reportId}/lock`, null, {
        headers: { "X-Admin-Id": adminId }
      });
    } catch (error) {
      console.error(`Error locking report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Heartbeat to maintain the lock.
   */
  heartbeatLock: async (reportId: string, adminId: string): Promise<void> => {
    try {
      await axiosClient.patch(`${API_URL}/${reportId}/heartbeat`, null, {
        headers: { "X-Admin-Id": adminId }
      });
    } catch (error) {
      console.error(`Error heartbeat for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Resolve a report with an action.
   */
  resolveReport: async (
    reportId: string,
    actionPayload: {
      action: "DISMISS" | "WARN" | "BAN" | "DISBAND_GROUP";
      adminNotes: string;
    },
    adminId: string
  ): Promise<ReportItem> => {
    try {
      const response = await axiosClient.patch(
        `${API_URL}/${reportId}/action`,
        actionPayload,
        {
          headers: { "X-Admin-Id": adminId }
        }
      );
      return response.data?.data;
    } catch (error) {
      console.error(`Error resolving report ${reportId}:`, error);
      throw error;
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
