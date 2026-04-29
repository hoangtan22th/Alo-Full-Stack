"use client";

import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { ReportRow } from "@/components/reports/ReportRow";
import { ReportActionModal } from "@/components/reports/ReportActionModal";
import ReportAnalytics from "@/components/reports/ReportAnalytics";
import { Pagination } from "@/components/ui/Pagination";
import { useReports } from "@/hooks/useReports";
import { ReportItem } from "@/services/reportService";

const REASON_OPTIONS = [
  { value: "ALL", label: "Tất cả lý do" },
  { value: "SCAM_FRAUD", label: "Lừa đảo / Gian lận" },
  { value: "CHILD_ABUSE", label: "Xâm hại trẻ em" },
  { value: "SEXUAL_CONTENT", label: "Nội dung tình dục" },
  { value: "VIOLENCE_TERRORISM", label: "Bạo lực / Khủng bố" },
  { value: "SPAM_HARRASSMENT", label: "Spam / Quấy rối" },
  { value: "OTHER", label: "Khác" },
];

export default function ReportsModerationPage() {
  const { reports, pagination, loading, error, fetchReports, resolveReport } =
    useReports();
  const [filterStatus, setFilterStatus] = useState<string | null>("PENDING");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTargetType, setFilterTargetType] = useState<string>("ALL");
  const [filterReason, setFilterReason] = useState<string>("ALL");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = () => {
    fetchReports({
      status: filterStatus,
      targetName: debouncedSearch || undefined,
      targetType: filterTargetType !== "ALL" ? filterTargetType : undefined,
      reason: filterReason !== "ALL" ? filterReason : undefined,
      page: currentPage,
      size: 20,
    });
    // Trigger statistics refresh
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    fetchReports({
      status: filterStatus,
      targetName: debouncedSearch || undefined,
      targetType: filterTargetType !== "ALL" ? filterTargetType : undefined,
      reason: filterReason !== "ALL" ? filterReason : undefined,
      page: currentPage,
      size: 20,
    });
  }, [filterStatus, currentPage, debouncedSearch, filterTargetType, filterReason, fetchReports]);

  const handleReview = (report: ReportItem) => {
    setSelectedReport(report);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterStatusChange = (status: string | null) => {
    setFilterStatus(status);
    setCurrentPage(0);
  };

  const handleModalSubmit = async (
    reportId: string,
    action: "DISMISS" | "WARN" | "BAN",
    notes: string,
  ) => {
    const ok = await resolveReport(reportId, action, notes);
    if (ok) {
      setSelectedReport(null);
      loadData();
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
      </div>

      {/* ── ANALYTICS DASHBOARD ── */}
      <ReportAnalytics key={refreshKey} />

      {/* ── SEARCH & FILTERS BAR ── */}
      <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center border border-outline-variant/15 shadow-sm">
        <div className="text-xs font-bold text-on-surface mr-2 tracking-wide uppercase">
          Filters
        </div>

        {/* Search by Target Name */}
        <div className="relative flex-1 min-w-[250px] max-w-[400px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-on-surface-variant" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên người dùng hoặc nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        {/* Target Type Filter */}
        <select
          value={filterTargetType}
          onChange={(e) => {
            setFilterTargetType(e.target.value);
            setCurrentPage(0);
          }}
          className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary transition-all"
        >
          <option value="ALL">Tất cả đối tượng</option>
          <option value="USER">Người dùng (USER)</option>
          <option value="GROUP">Nhóm (GROUP)</option>
        </select>

        {/* Reason Filter */}
        <select
          value={filterReason}
          onChange={(e) => {
            setFilterReason(e.target.value);
            setCurrentPage(0);
          }}
          className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary transition-all"
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setFilterStatus("PENDING");
            setFilterTargetType("ALL");
            setFilterReason("ALL");
            setCurrentPage(0);
            setRefreshKey(prev => prev + 1);
            if (searchTerm === "" && filterStatus === "PENDING" && filterTargetType === "ALL" && filterReason === "ALL" && currentPage === 0) {
              loadData();
            }
          }}
          className="p-2 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary transition-all shadow-sm"
          title="Reset & Refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>

        <div className="ml-auto text-sm text-on-surface-variant font-medium">
          Showing{" "}
          <span className="text-on-surface font-bold">
            {pagination.totalElements === 0
              ? 0
              : pagination.page * 20 + 1}
            -
            {Math.min(
              (pagination.page + 1) * 20,
              pagination.totalElements,
            )}
          </span>{" "}
          of{" "}
          <span className="text-on-surface font-bold">
            {pagination.totalElements}
          </span>{" "}
          reports
        </div>
      </div>

      {/* ── STATUS TABS ── */}
      <div className="flex gap-2 mb-6 bg-surface-container-low p-1.5 rounded-2xl w-fit border border-outline-variant/10 shadow-sm">
        <button
          onClick={() => handleFilterStatusChange("PENDING")}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "PENDING"
              ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
              : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => handleFilterStatusChange("RESOLVED")}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "RESOLVED"
              ? "bg-primary text-white shadow-md shadow-secondary/20 scale-105"
              : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
        >
          Resolved
        </button>
        <button
          onClick={() => handleFilterStatusChange("REJECTED")}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "REJECTED"
              ? "bg-error text-white shadow-md shadow-error/20 scale-105"
              : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
        >
          Rejected
        </button>
        <button
          onClick={() => handleFilterStatusChange(null)}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === null
              ? "bg-on-surface text-surface shadow-md scale-105"
              : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
        >
          All Reports
        </button>
      </div>

      {/* ── REPORTS LIST ── */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                  Reporter
                </th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                  Target (User/Group)
                </th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                  Reason
                </th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                  Evidence
                </th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                  Date
                </th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {reports.length > 0 ? (
                reports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onReview={() => handleReview(report)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-on-surface-variant font-medium animate-pulse">
                          Loading reports...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-on-surface-variant text-lg">
                          No reports found.
                        </p>
                        <p className="text-sm text-on-surface-variant/60">
                          Try adjusting your filters or search term.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-6 border-t border-outline-variant/10 bg-surface-container-low/30">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedReport && (
        <ReportActionModal
          isOpen={!!selectedReport}
          onClose={handleModalClose}
          report={selectedReport}
          onSubmit={handleModalSubmit}
        />
      )}
    </>
  );
}
