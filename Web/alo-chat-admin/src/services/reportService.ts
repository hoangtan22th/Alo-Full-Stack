import { axiosClient } from "@/lib/axiosClient";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";
const API_URL = `${GATEWAY_URL}/api/v1/admin/reports`;

export interface ReportUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ReportItem {
  id: string;
  reporter?: ReportUser;
  targetId: string;
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

export const reportService = {
  getReports: async (query?: {
    status?: string | null;
    page?: number;
    size?: number;
  }): Promise<PaginatedReports> => {
    try {
      const response = await axiosClient.get(API_URL, { params: query });
      return (
        response.data?.data || {
          content: [],
          totalPages: 0,
          totalElements: 0,
          page: 0,
          number: 0,
        }
      );
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
};
