import api from "./api";

export enum TargetType {
  USER = "USER",
  GROUP = "GROUP",
}

export enum ReportReason {
  SCAM_FRAUD = "SCAM_FRAUD",
  SPAM_HARRASSMENT = "SPAM_HARRASSMENT",
  SEXUAL_CONTENT = "SEXUAL_CONTENT",
  VIOLENCE_TERRORISM = "VIOLENCE_TERRORISM",
  CHILD_ABUSE = "CHILD_ABUSE",
  OTHER = "OTHER",
}

export interface ReportRequest {
  reporterId: string;
  targetId: string;
  targetType: TargetType;
  reason: ReportReason;
  description?: string;
  imageUrls?: string[];
  messageIds?: string[];
}

export const reportService = {
  createReport: async (request: ReportRequest) => {
    try {
      const response = await api.post("/reports", request);
      return response;
    } catch (error) {
      console.error("Lỗi khi tạo báo cáo:", error);
      throw error;
    }
  },
};
