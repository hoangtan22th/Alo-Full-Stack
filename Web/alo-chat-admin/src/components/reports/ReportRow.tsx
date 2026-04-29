import { Button } from "@/components/ui/button";
import { 
  ExclamationTriangleIcon, 
  FlagIcon,
  UserIcon,
  UserGroupIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";
import { ReportItem } from "@/services/reportService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ReportRowProps {
  report: ReportItem;
  onReview: (report: ReportItem) => void;
}

export function ReportRow({ report, onReview }: ReportRowProps) {
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
    <tr className="hover:bg-surface-container-lowest/50 transition-colors group">
      {/* ── Reporter (With Avatar) ── */}
      <td className="px-4 py-4 w-[20%]">
        <div className="flex items-center gap-2.5">
          <img 
            src={report.reporter?.avatar || "/placeholder.png"} 
            alt="Reporter"
            className="w-8 h-8 rounded-full object-cover border border-outline-variant/20 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter?.fullName || "U")}&background=random`;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-on-surface truncate">
              {report.reporter?.fullName || "Ẩn danh"}
            </p>
            <p className="text-[9px] text-on-surface-variant font-mono truncate opacity-60">ID: {report.reporter?.id.slice(-6)}</p>
          </div>
        </div>
      </td>

      {/* ── Target ── */}
      <td className="px-4 py-4 w-[20%]">
        <div className="flex items-center gap-2">
          {report.targetType === "USER" ? (
            <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-blue-500" />
            </div>
          ) : (
            <div className="p-1.5 bg-purple-50 rounded-lg shrink-0">
              <UserGroupIcon className="w-3.5 h-3.5 text-purple-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
             <p className="text-[13px] font-medium text-on-surface truncate">
               {report.targetName || report.targetUser?.fullName || report.targetId}
             </p>
             <span className={`text-[8px] font-black uppercase tracking-tighter ${report.targetType === 'USER' ? 'text-blue-600' : 'text-purple-600'}`}>
               {report.targetType}
             </span>
          </div>
        </div>
      </td>

      {/* ── Reason ── */}
      <td className="px-4 py-4 w-[15%]">
        <div className="max-w-full">
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container border border-outline-variant/10 px-2 py-0.5 rounded-md inline-block max-w-full truncate">
            {report.reason}
          </span>
          <div className={`mt-1.5 flex px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
        </div>
      </td>

      {/* ── Evidence (Throttled Width) ── */}
      <td className="px-4 py-4 w-[25%]">
        <div className="space-y-1">
          {report.description ? (
            <p className="text-xs text-on-surface-variant italic line-clamp-1 break-all opacity-80">
              "{report.description}"
            </p>
          ) : (
            <span className="text-[10px] text-on-surface-variant italic opacity-40">Không có mô tả</span>
          )}
          <div className="flex gap-2.5">
            {report.messageIds?.length > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary tracking-tighter">
                <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5" />
                {report.messageIds.length} Msgs
              </div>
            )}
            {report.imageUrls?.length > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-secondary tracking-tighter">
                <PhotoIcon className="w-2.5 h-2.5" />
                {report.imageUrls.length} Imgs
              </div>
            )}
          </div>
        </div>
      </td>

      {/* ── Date ── */}
      <td className="px-4 py-4 w-[10%]">
        <p className="text-[11px] text-on-surface-variant font-medium whitespace-nowrap opacity-70">
          {timeAgo}
        </p>
      </td>

      {/* ── Actions ── */}
      <td className="px-4 py-4 text-right w-[10%]">
        <Button
          size="sm"
          onClick={() => onReview(report)}
          variant={report.status === "PENDING" ? "default" : "outline"}
          className={`text-[9px] font-black uppercase tracking-[0.1em] px-3 h-7 rounded-lg transition-all group-hover:scale-105 ${
            report.status === "PENDING"
              ? "bg-primary text-on-primary hover:bg-primary/90 shadow-sm"
              : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          {report.status === "PENDING" ? "Review" : "View"}
        </Button>
      </td>
    </tr>
  );
}
