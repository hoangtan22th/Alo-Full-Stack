import { Button } from "@/components/ui/button";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/24/outline";
import { ReportItem } from "@/services/reportService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { UserGroupIcon, UserIcon } from "@heroicons/react/24/solid";

interface ReportRowProps {
  report: ReportItem;
  onReview: (report: ReportItem) => void;
}

export function ReportRow({ report, onReview }: ReportRowProps) {
  // Translate target type to severity roughly or just use status for styling
  const getStatusInfo = () => {
    switch (report.status) {
      case "PENDING":
        return { label: "Chờ xử lý", color: "text-amber-700 bg-amber-100 border-amber-200" };
      case "RESOLVED":
        return { label: "Đã giải quyết", color: "text-green-700 bg-green-100 border-green-200" };
      case "REJECTED":
        return { label: "Đã từ chối", color: "text-slate-600 bg-slate-100 border-slate-200" };
      default:
        return { label: report.status, color: "text-on-surface-variant bg-surface-container-high" };
    }
  };
  const statusInfo = getStatusInfo();

  const timeAgo = formatDistanceToNow(new Date(report.createdAt), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className="p-6 hover:bg-surface-container-lowest/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10">
      <div className="flex items-start gap-4 flex-1">
        {report.targetType === "USER" ? (
          <ExclamationTriangleIcon className="w-8 h-8 text-error p-1 bg-error/10 rounded-full shrink-0" />
        ) : (
          <FlagIcon className="w-8 h-8 text-indigo-500 p-1 bg-indigo-500/10 rounded-full shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-sm font-bold text-on-surface">
              {report.reason}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface`}
            >
              {report.targetType === "USER" ? <div className="flex items-center gap-1"><UserIcon className="w-4 h-4" /> User</div> : <div className="flex items-center gap-1"><UserGroupIcon className="w-4 h-4" /> Group</div>}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">
            Mục tiêu: {report.targetUser?.fullName || report.targetId} • {timeAgo} •
            Bởi:{" "}
            <span className="text-on-surface underline decoration-outline-variant/30 cursor-pointer">
              {report.reporter?.fullName || "Ẩn danh"}
            </span>
          </p>
          {report.description && (
            <p className="text-xs text-on-surface-variant mt-1 italic line-clamp-2">
              "{report.description}"
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:ml-auto shrink-0">
        {report.status !== "PENDING" && (
          <div className="text-[11px] text-right">
            <p className="text-on-surface-variant uppercase font-bold tracking-tighter">Đã xử lý bởi</p>
            <p className="font-semibold text-primary/80">{report.resolvedBy || "Hệ thống"}</p>
          </div>
        )}

        <Button
          size="sm"
          onClick={() => onReview(report)}
          variant={report.status === "PENDING" ? "default" : "outline"}
          className={`text-xs font-bold shadow-minimal ${report.status === "PENDING"
            ? "bg-primary text-on-primary hover:bg-primary/90"
            : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
            }`}
        >
          {report.status === "PENDING" ? "Review Case" : "View Details"}
        </Button>
      </div>
    </div>
  );
}
