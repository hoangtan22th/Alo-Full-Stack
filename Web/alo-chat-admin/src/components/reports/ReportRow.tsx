import { Button } from "@/components/ui/button";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/24/outline";
import { ReportItem } from "@/services/reportService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ReportRowProps {
  report: ReportItem;
  onReview: (report: ReportItem) => void;
}

export function ReportRow({ report, onReview }: ReportRowProps) {
  // Translate target type to severity roughly or just use status for styling
  const getSeverity = () => {
    if (report.targetType === "USER") return "High";
    if (report.targetType === "GROUP") return "Medium";
    return "Low";
  };
  const severity = getSeverity();

  const badgeColor = () => {
    if (severity === "High") return "text-error bg-error-container";
    if (severity === "Medium") return "text-tertiary bg-tertiary-container";
    return "text-secondary bg-secondary-container";
  };

  const timeAgo = formatDistanceToNow(new Date(report.createdAt), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className="p-6 hover:bg-surface-container-lowest/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10">
      <div className="flex items-start gap-4 flex-1">
        {severity === "High" ? (
          <ExclamationTriangleIcon className="w-8 h-8 text-error p-1 bg-error/10 rounded-full shrink-0" />
        ) : (
          <FlagIcon className="w-8 h-8 text-tertiary p-1 bg-tertiary/10 rounded-full shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-sm font-bold text-on-surface">
              {report.reason}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor()}`}
            >
              {report.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface`}
            >
              Target: {report.targetType}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">
            Mục tiêu: {report.targetUser?.name || report.targetId} • {timeAgo} •
            Bởi:{" "}
            <span className="text-on-surface underline decoration-outline-variant/30 cursor-pointer">
              {report.reporter?.name || "Ẩn danh"}
            </span>
          </p>
          {report.description && (
            <p className="text-xs text-on-surface-variant mt-1 italic line-clamp-2">
              "{report.description}"
            </p>
          )}
        </div>
      </div>

      {report.status === "PENDING" && (
        <div className="flex flex-wrap gap-2 sm:ml-auto shrink-0">
          <Button
            size="sm"
            onClick={() => onReview(report)}
            className="bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold shadow-minimal"
          >
            Review Case
          </Button>
        </div>
      )}

      {report.status !== "PENDING" && (
        <div className="text-sm min-w-[max-content] font-semibold text-primary/80 shrink-0">
          Đã xử lý: {report.resolvedBy || "Hệ thống"}
        </div>
      )}
    </div>
  );
}
