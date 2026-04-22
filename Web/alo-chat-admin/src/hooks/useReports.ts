import { useState, useCallback } from "react";
import { reportService, ReportItem } from "@/services/reportService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

export const useReports = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalElements: 0,
    page: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { adminEmail } = useAuthStore();

  const fetchReports = useCallback(
    async (query?: {
      status?: string | null;
      page?: number;
      size?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportService.getReports(query);
        setReports(data.content || []);

        let currentPage = 0;
        if (data.page !== undefined) currentPage = data.page;
        else if (data.number !== undefined) currentPage = data.number;

        setPagination({
          totalPages: data.totalPages || 0,
          totalElements: data.totalElements || 0,
          page: currentPage,
        });
      } catch (err: any) {
        setReports([]);
        setError(
          err?.response?.data?.message ||
            "Xảy ra lỗi khi tải danh sách reports.",
        );
        toast.error("Không thể tải danh sách reports");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const resolveReport = async (
    reportId: string,
    action: "DISMISS" | "WARN" | "BAN",
    notes: string,
    onSuccess?: () => void,
  ) => {
    try {
      await reportService.resolveReport(reportId, {
        action,
        adminNotes: notes,
        adminId: adminEmail || "admin",
      });
      // Optimistically update the single item or just refetch
      toast.success(`Xử lý thành công (${action})`);
      if (onSuccess) onSuccess();
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi khi xử lý report");
      return false;
    }
  };

  return {
    reports,
    pagination,
    loading,
    error,
    fetchReports,
    resolveReport,
  };
};
