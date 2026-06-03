import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportItem, reportService, MessageSnapshot } from "@/services/reportService";
import { AdjustmentsHorizontalIcon, PhotoIcon, LockClosedIcon, CheckBadgeIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/useAuthStore";
import { Progress } from "@/components/ui/progress";

interface EvidenceMessage {
  id: string;
  senderName: string;
  senderAvatar?: string;
  type: string;
  content: string;
  timestamp: string;
  isTarget: boolean;
  isAnchor: boolean;
  isByReporter: boolean;
  sequenceIndex: number;
}

interface ReportActionModalProps {
  report: ReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Called after resolution to refresh parent list
}

const REASON_LABELS: Record<string, string> = {
  SCAM_FRAUD: "Lừa đảo / Gian lận",
  CHILD_ABUSE: "Xâm hại trẻ em",
  SEXUAL_CONTENT: "Nội dung tình dục",
  VIOLENCE_TERRORISM: "Bạo lực / Khủng bố",
  SPAM_HARASSMENT: "Spam / Quấy rối",
  SPAM_HARRASSMENT: "Spam / Quấy rối",
  OTHER: "Khác",
};

const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const backendHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888";
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

export function ReportActionModal({
  report,
  isOpen,
  onClose,
  onSuccess,
}: ReportActionModalProps) {
  const { adminId } = useAuthStore();
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedByMe, setIsLockedByMe] = useState(false);
  const [lockErrorMessage, setLockErrorMessage] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ name?: string, avatar?: string | null } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // 1. Concurrency Lock & Heartbeat
  useEffect(() => {
    if (!isOpen || !report || !adminId) return;

    let heartbeatInterval: NodeJS.Timeout;

    const acquireLock = async () => {
      try {
        await reportService.lockReport(report.id, adminId);
        setIsLockedByMe(true);
        setLockErrorMessage(null);

        // Start heartbeat every 2 minutes
        heartbeatInterval = setInterval(async () => {
          try {
            await reportService.heartbeatLock(report.id, adminId);
          } catch (err) {
            console.error("Heartbeat failed", err);
            setIsLockedByMe(false);
            setLockErrorMessage("Phiên làm việc đã hết hạn hoặc bị chiếm quyền bởi Admin khác.");
            clearInterval(heartbeatInterval);
          }
        }, 120000);
      } catch (error: any) {
        setIsLockedByMe(false);
        const msg = error.response?.data?.message || "Báo cáo này đang được xử lý bởi một Admin khác.";
        setLockErrorMessage(msg);
        toast.warning(msg);
      }
    };

    acquireLock();

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isOpen, report?.id, adminId]);

  // 2. Evidence Processing (V2.1 Immutable Snapshots)
  const evidenceMessages = useMemo(() => {
    if (!report?.messageSnapshots) return [];

    return report.messageSnapshots.map((s: any) => {
      let parsedContent = s.content;
      try {
        if (typeof s.content === 'string' && s.content.trim().startsWith('{') && s.content.trim().endsWith('}')) {
          const parsed = JSON.parse(s.content);
          if (typeof parsed.isRichText === 'boolean' && typeof parsed.text === 'string') {
            parsedContent = parsed.plainText || parsed.text;
          }
        }
      } catch (e) {
        // Fallback to original content
      }

      return {
        id: s.messageId,
        senderName: s.senderName || (s.isByReporter ? (report.reporter?.fullName || "Người tố cáo") : (report.targetUser?.fullName || report.targetName || "Bị tố cáo")),
        senderAvatar: s.senderAvatar,
        type: s.contentType || "text",
        content: parsedContent,
        timestamp: new Date(s.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTarget: !(s.isByReporter ?? s.byReporter ?? false),
        isAnchor: s.isAnchor ?? s.anchor ?? false,
        isByReporter: s.isByReporter ?? s.byReporter ?? false,
        sequenceIndex: s.sequenceIndex,
      };
    }).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  }, [report]);

  const timelineInfo = useMemo(() => {
    if (!report?.messageSnapshots || report.messageSnapshots.length === 0) return null;
    const first = report.messageSnapshots[0];
    const total = first.totalMessagesInConversation;
    const start = first.sequenceIndex;
    const end = report.messageSnapshots[report.messageSnapshots.length - 1].sequenceIndex;

    return { start, end, total };
  }, [report]);

  // 3. Fetch Group Info if needed (Removed - unused and causing crash)

  // 4. Auto-scroll to Anchor
  useEffect(() => {
    if (isOpen && evidenceMessages.length > 0) {
      setTimeout(() => {
        const anchorEl = document.getElementById("anchor-msg");
        if (anchorEl) {
          anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [isOpen, evidenceMessages]);

  if (!report) return null;

  const isUser = report.targetType === "USER";
  const isGroup = report.targetType === "GROUP";
  const isResolved = report.status === "RESOLVED" || report.status === "REJECTED";

  // Phân tích ngữ cảnh (nếu là user bị report trong nhóm)
  const targetNameStr = report.targetName || report.targetUser?.fullName || "";
  const matchGroupContext = targetNameStr.match(/(.*?)\s*\(trong\s+nhóm:\s*(.*)\)/i);
  const cleanTargetName = matchGroupContext ? matchGroupContext[1] : targetNameStr;
  const groupContextName = matchGroupContext ? matchGroupContext[2] : null;

  const handleAction = async (action: "DISMISS" | "WARN" | "BAN" | "DISBAND_GROUP") => {
    if (!adminId) return;
    if (action !== "DISMISS" && !adminNotes.trim()) {
      toast.error("Vui lòng nhập ghi chú Admin trước khi thực hiện hành động này.");
      return;
    }

    try {
      setIsSubmitting(true);
      await reportService.resolveReport(report.id, { action, adminNotes }, adminId);
      toast.success("Đã xử lý báo cáo thành công.");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xử lý báo cáo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto bg-surface p-0 gap-0 border-none shadow-2xl">
        {/* ── STICKY HEADER ── */}
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 p-6 pb-4">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <DialogTitle className="text-2xl font-headline text-on-surface">
                Case #{report.id.slice(-6).toUpperCase()}
              </DialogTitle>
              {isLockedByMe ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold border border-green-500/20">
                  <CheckBadgeIcon className="w-3.5 h-3.5" />
                  BẠN ĐANG ĐIỀU PHỐI
                </div>
              ) : lockErrorMessage ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold border border-red-500/20">
                  <LockClosedIcon className="w-3.5 h-3.5" />
                  ĐANG BỊ KHÓA
                </div>
              ) : null}
            </div>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded uppercase">
                {REASON_LABELS[report.reason] || report.reason}
              </span>
              <span className="text-on-surface-variant text-xs flex items-center">
                {isUser ? "Tố cáo người dùng" : "Tố cáo nhóm"}: <b className="text-on-surface ml-1">{cleanTargetName}</b>
                {groupContextName && (
                  <span className="ml-2 font-black text-[9px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded uppercase">
                    Trong nhóm: {groupContextName}
                  </span>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-8">
          {/* ── SECTION 1: PROFILES ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20">
              <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-3">Người báo cáo</p>
              <div className="flex items-center gap-3">
                <img src={report.reporter?.avatar || "/placeholder.png"} className="w-10 h-10 rounded-full border border-outline-variant/30" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{report.reporter?.fullName || "Ẩn danh"}</p>
                  <p className="text-[10px] font-mono text-on-surface-variant">ID: {report.reporter?.id}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
              <p className="text-[10px] font-black text-red-600/50 dark:text-red-400/50 uppercase tracking-widest mb-3">Đối tượng bị tố cáo</p>
              <div className="flex items-center gap-3">
                {isGroup ? (
                  report.targetGroup?.groupAvatar ? (
                    <img 
                      src={getMediaUrl(report.targetGroup.groupAvatar)} 
                      className="w-10 h-10 rounded-lg border border-red-200 dark:border-red-800 object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-red-200 dark:bg-red-800 flex items-center justify-center font-bold text-red-700 dark:text-red-200">
                      {report.targetName?.charAt(0) || "G"}
                    </div>
                  )
                ) : (
                  <img 
                    src={getMediaUrl(report.targetUser?.avatar) || "/placeholder.png"} 
                    className="w-10 h-10 rounded-full border border-red-200 dark:border-red-800" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.targetUser?.fullName || "U")}&background=random`;
                    }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{cleanTargetName}</p>
                  <p className="text-[10px] font-mono text-on-surface-variant">ID: {report.targetId}</p>
                  {groupContextName && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-200 text-purple-800 uppercase tracking-widest">
                      Nhóm: {groupContextName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION: REPORTER DESCRIPTION ── */}
          {report.description && (
            <div className="p-4 bg-surface-container-highest/30 rounded-2xl border border-outline-variant/10">
              <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2">Mô tả từ người báo cáo</p>
              <p className="text-sm text-on-surface leading-relaxed italic">
                "{report.description}"
              </p>
            </div>
          )}

          {/* ── SECTION 2: ATTACHED EVIDENCE (MANUAL UPLOAD) ── */}
          {report.imageUrls && report.imageUrls.length > 0 && (
            <section>
              <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4">Ảnh bằng chứng đính kèm</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.imageUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/30 group cursor-zoom-in block"
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PhotoIcon className="w-6 h-6 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── SECTION 3: IMMUTABLE EVIDENCE (V2.1) ── */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">Bằng chứng bất biến</h4>
                <p className="text-[10px] text-on-surface-variant/70 italic">
                  {evidenceMessages.some(m => m.isAnchor)
                    ? "Bản chụp Snapshot (±15 tin nhắn quanh Anchor)"
                    : "Bản chụp Snapshot (Hội thoại gần nhất)"}
                </p>
              </div>
              {timelineInfo && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-primary mb-1">Dòng thời gian: {timelineInfo.start} - {timelineInfo.end} / {timelineInfo.total}</p>
                  <Progress value={(timelineInfo.end / timelineInfo.total) * 100} className="w-24 h-1" />
                </div>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-inner">
              <div className="max-h-[450px] overflow-y-auto p-5 flex flex-col gap-4 bg-[#f1f3f4] dark:bg-[#0b0b0b]">
                {evidenceMessages.length > 0 ? evidenceMessages.map((msg) => (
                  <div
                    key={msg.id}
                    id={msg.isAnchor ? "anchor-msg" : undefined}
                    className={`flex flex-col w-full ${msg.type === "NOTE" || msg.type === "SYSTEM" ? "items-center my-2" : msg.isByReporter ? "items-end" : "items-start"}`}
                  >
                    {msg.type === "NOTE" || msg.type === "SYSTEM" ? (
                      <div className="bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-medium px-4 py-1.5 rounded-full text-center max-w-[80%]">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`flex flex-col max-w-[85%] ${msg.isByReporter ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 mb-1 px-1 ${msg.isByReporter ? "flex-row-reverse" : "flex-row"}`}>
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-outline-variant/30 bg-surface-container shrink-0">
                            <img 
                              src={getMediaUrl(msg.senderAvatar) || "/placeholder.png"} 
                              className="w-full h-full object-cover"
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || "U")}&background=random`;
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-on-surface-variant/60">
                            {msg.senderName} • {msg.timestamp}
                          </span>
                          {msg.isAnchor && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                              <ExclamationTriangleIcon className="w-2.5 h-2.5" />
                              Tin nhắn bị báo cáo
                            </span>
                          )}
                        </div>
                        <div className={`
                          relative p-4 rounded-2xl text-sm leading-relaxed shadow-md transition-all duration-500 cursor-default
                          ${msg.isByReporter ? "bg-primary text-on-primary rounded-tr-none" : "bg-white dark:bg-surface-container text-on-surface rounded-tl-none border border-outline-variant/20"}
                          ${msg.isAnchor ? "!bg-red-50 dark:!bg-red-900/20 !text-red-900 dark:!text-red-100 ring-2 ring-red-500/50 border-red-500/50" : ""}
                        `}>
                          {msg.type === "IMAGE" ? (
                            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={msg.content}
                                className="max-w-[200px] rounded-lg border border-white/20 cursor-zoom-in hover:scale-[1.02] transition-transform"
                              />
                            </a>
                          ) : (
                            <p className="break-words">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-10 text-center text-on-surface-variant/40 italic text-sm">
                    Không có dữ liệu snapshot tin nhắn.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── SECTION 3: ADMIN ACTION ── */}
          <section className="space-y-4">
            <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Quyết định của Quản trị viên</h4>

            <textarea
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none min-h-[120px] transition-all disabled:opacity-50"
              placeholder="Nhập lý do chi tiết cho quyết định này..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={isSubmitting || isResolved || !isLockedByMe}
            />

            {isResolved ? (
              <div className="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Kết quả xử lý</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${report.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {report.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-on-surface-variant/60 font-bold uppercase mb-1">Người xử lý</p>
                    <p className="font-semibold text-on-surface">{report.resolvedBy || "System"}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant/60 font-bold uppercase mb-1">Thời gian</p>
                    <p className="font-semibold text-on-surface">{new Date(report.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Đóng
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAction("DISMISS")}
                    disabled={isSubmitting || !isLockedByMe}
                    className="border-outline-variant text-on-surface-variant rounded-xl px-6"
                  >
                    Bác bỏ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction("WARN")}
                    disabled={isSubmitting || !isLockedByMe}
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 rounded-xl px-6"
                  >
                    Cảnh cáo
                  </Button>
                  {isGroup && (
                    <Button
                      variant="outline"
                      onClick={() => handleAction("BAN")}
                      disabled={isSubmitting || !isLockedByMe}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl px-6"
                    >
                      Khóa Chat (Chỉ đọc)
                    </Button>
                  )}
                  <Button
                    onClick={() => handleAction(isGroup ? "DISBAND_GROUP" : "BAN")}
                    disabled={isSubmitting || !isLockedByMe}
                    className="bg-red-600 text-white hover:bg-red-700 font-bold px-8 rounded-xl shadow-lg shadow-red-500/20"
                  >
                    {isUser ? "Cấm người dùng" : "Giải tán nhóm"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── STICKY FOOTER WARNING ── */}
        {!isLockedByMe && !isResolved && (
          <div className="sticky bottom-0 bg-amber-500 text-white px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest z-20">
            {lockErrorMessage || "Bạn chỉ có thể xem, báo cáo này đang bị khóa bởi Admin khác."}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
