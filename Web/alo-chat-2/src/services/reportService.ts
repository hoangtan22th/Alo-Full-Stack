import { toast } from "sonner";
import api from "./api";

export interface ReportCreationRequest {
  reporterId: string;
  targetId: string;
  targetType: "USER" | "GROUP";
  reason: string;
  description?: string;
  imageUrls?: string[];
  messageSnapshots?: any[];
}

export const reportService = {
  createReport: async (payload: ReportCreationRequest) => {
    try {
      const response = await api.post("/reports", payload);
      toast.success("Đã gửi báo cáo thành công");
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const reason = error.response?.headers?.["x-ratelimit-reason"];
      const retryAfter = error.response?.headers?.["retry-after"];

      if (status === 429) {
        let msg = "Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau.";
        if (retryAfter) {
          msg += ` (Thử lại sau ${retryAfter} giây)`;
        }
        toast.error(msg);
      } else if (status === 409) {
        toast.error("Báo cáo tương tự đang chờ xử lý.");
      } else if (status === 400 && error.response?.data?.message?.includes("Phát hiện giả mạo")) {
        toast.error("Lỗi: Bằng chứng báo cáo không hợp lệ hoặc đã bị can thiệp.");
      } else {
        toast.error(error.response?.data?.message || "Đã có lỗi xảy ra khi gửi báo cáo.");
      }
      throw error;
    }
  },
};
