"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { ReportRow } from "@/components/reports/ReportRow";
import { ReportActionModal } from "@/components/reports/ReportActionModal";
import { useReports } from "@/hooks/useReports";
import { ReportItem } from "@/services/reportService";

export default function ReportsModerationPage() {
  const { reports, loading, error, fetchReports, resolveReport } = useReports();
  const [filterStatus, setFilterStatus] = useState<string | null>("PENDING");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  useEffect(() => {
    fetchReports({ status: filterStatus, page: 0, size: 20 });
  }, [filterStatus, fetchReports]);

  const handleReview = (report: ReportItem) => {
    setSelectedReport(report);
  };

  const handleModalSubmit = async (
    reportId: string,
    action: "DISMISS" | "WARN" | "BAN",
    notes: string,
  ) => {
    const ok = await resolveReport(reportId, action, notes);
    if (ok) {
      setSelectedReport(null);
      // Reload lại danh sách
      fetchReports({ status: filterStatus, page: 0, size: 20 });
    }
  };

  const handleModalClose = () => {
    setSelectedReport(null);
  };

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">
            Reports &amp; Moderation
          </h1>
          <p className="text-on-surface-variant text-base">
            Monitor platform safety, review flagged content, and manage user
            restrictions.
          </p>
        </div>
        <div>
          <Button
            onClick={() =>
              fetchReports({ status: filterStatus, page: 0, size: 20 })
            }
            variant="outline"
          >
            Làm mới danh sách
          </Button>
        </div>
      </div>

      {/* Top Row: Stats (Visual Layout Giữ Nguyên) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Total Pending
            </h3>
            <PresentationChartLineIcon className="w-8 h-8 text-error bg-error-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              24
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Resolved Today
            </h3>
            <CheckCircleIcon className="w-8 h-8 text-primary bg-primary-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              142
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Avg. Response
            </h3>
            <ClockIcon className="w-8 h-8 text-secondary bg-secondary-container/30 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              12m
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Accuracy
            </h3>
            <ShieldCheckIcon className="w-8 h-8 text-primary bg-primary-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              98.5%
            </span>
          </div>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-minimal border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-on-surface font-headline">
            Danh sách Reports
          </h2>
          <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg">
            <Button
              variant={filterStatus === "PENDING" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("PENDING")}
              className={`text-xs font-semibold ${
                filterStatus === "PENDING" &&
                "bg-surface-container-highest shadow-none text-on-surface"
              }`}
            >
              Chờ xử lý (Pending)
            </Button>
            <Button
              variant={filterStatus === "RESOLVED" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("RESOLVED")}
              className={`text-xs font-semibold ${
                filterStatus === "RESOLVED" &&
                "bg-surface-container-highest shadow-none text-on-surface"
              }`}
            >
              Đã xử lý (Resolved)
            </Button>
            <Button
              variant={filterStatus === null ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus(null)}
              className={`text-xs font-semibold ${
                filterStatus === null &&
                "bg-surface-container-highest shadow-none text-on-surface"
              }`}
            >
              Tất cả
            </Button>
          </div>
        </div>

        <div className="flex flex-col min-h-[300px]">
          {loading ? (
            <div className="p-8 text-center text-on-surface-variant">
              Đang tải danh sách báo cáo...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error">Đã có lỗi: {error}</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              Không có báo cáo nào khớp với bộ lọc
            </div>
          ) : (
            reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onReview={handleReview}
              />
            ))
          )}
        </div>
      </div>

      <ReportActionModal
        isOpen={!!selectedReport}
        report={selectedReport}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
