import React, { useState, useEffect } from "react";
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
import { ReportItem, MessageDTO, reportService } from "@/services/reportService";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

interface EvidenceMessage {
  id: string;
  conversationId?: string;
  senderName: string;
  type: string;
  content: string;
  timestamp: string;
  rawCreatedAt: string; // Used for gap detection
  isTarget: boolean;
  isReported?: boolean; // Highlight in full context view
  hiddenAfterCount?: number;
}

interface ReportActionModalProps {
  report: ReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    reportId: string,
    action: "DISMISS" | "WARN" | "BAN",
    notes: string,
  ) => Promise<void> | void;
}

const REASON_LABELS: Record<string, string> = {
  SCAM_FRAUD: "Lừa đảo / Gian lận",
  CHILD_ABUSE: "Xâm hại trẻ em",
  SEXUAL_CONTENT: "Nội dung tình dục",
  VIOLENCE_TERRORISM: "Bạo lực / Khủng bố",
  SPAM_HARRASSMENT: "Spam / Quấy rối",
  OTHER: "Khác",
};

export function ReportActionModal({
  report,
  isOpen,
  onClose,
  onSubmit,
}: ReportActionModalProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [chatMessages, setChatMessages] = useState<EvidenceMessage[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{ name?: string, avatar?: string | null } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);
  const [fullContextMessages, setFullContextMessages] = useState<EvidenceMessage[]>([]);
  const [loadingFullContext, setLoadingFullContext] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchEvidence = async () => {
      if (!report) return;

      if (report.targetType === "GROUP") {
        setLoadingGroup(true);
        try {
          const fetchedGroup = await reportService.fetchGroupInfo(report.targetId);
          if (isMounted) setGroupInfo(fetchedGroup);
        } catch (error) {
          console.error("Failed to fetch group info", error);
        } finally {
          if (isMounted) setLoadingGroup(false);
        }
        return; // Don't fetch message evidence
      }

      // ── IF USER: FETCH MESSAGE EVIDENCE ──
      if (
        report.targetType !== "USER" ||
        !report.messageIds ||
        report.messageIds.length === 0
      ) {
        setChatMessages([]);
        return;
      }

      setLoadingEvidence(true);
      try {
        // ── DEBUG: log the full report object to diagnose missing targetUser ──
        console.log("[ReportActionModal] Report Data in Modal:", report);
        console.log("[ReportActionModal] targetUser:", report.targetUser);
        console.log("[ReportActionModal] messageIds count:", report.messageIds.length);

        // ── REAL API CALL ──
        const msgs: MessageDTO[] = await reportService.fetchMessagesBulk(report.messageIds);
        console.log("[ReportActionModal] Bulk messages fetched:", msgs.length, msgs);

        if (!isMounted) return;

        // Map to EvidenceMessage — cross-reference senderId with targetId and reporter
        const mapped: EvidenceMessage[] = msgs.map((m) => {
          const isTarget = m.senderId === report.targetId;
          const isReporter = report.reporter?.id && m.senderId === report.reporter.id;

          let resolvedName = m.senderName;
          if (isTarget) resolvedName = report.targetUser?.fullName || m.senderName || "Mục tiêu (Unknown)";
          else if (isReporter) resolvedName = report.reporter?.fullName || m.senderName || "Người tố cáo";
          else resolvedName = m.senderName || "Người dùng khác";

          return {
            id: m.id,
            conversationId: m.conversationId,
            senderName: resolvedName,
            type: m.type,
            content: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            rawCreatedAt: m.createdAt,
            isTarget,
            hiddenAfterCount: m.hiddenAfterCount,
          };
        })
          .sort((a, b) => new Date(a.rawCreatedAt).getTime() - new Date(b.rawCreatedAt).getTime());

        setChatMessages(mapped);
      } catch (error) {
        console.error("[ReportActionModal] Failed to fetch evidence:", error);
      } finally {
        if (isMounted) setLoadingEvidence(false);
      }
    };

    if (isOpen && report) {
      setAdminNotes("");
      setChatMessages([]);
      setGroupInfo(null);
      fetchEvidence();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, report]);

  // --- FETCH FULL CONTEXT ---
  useEffect(() => {
    if (showFullContext && report && chatMessages.length > 0) {
      const fetchFull = async () => {
        const convoId = chatMessages[0].conversationId;
        if (!convoId) return;

        setLoadingFullContext(true);
        try {
          const msgs = await reportService.fetchFullConversationHistory(convoId);
          const mapped = msgs.map(m => {
            const isTarget = m.senderId === report.targetId;
            const isReporter = report.reporter?.id && m.senderId === report.reporter.id;
            
            let resolvedName = m.senderName;
            if (isTarget) resolvedName = report.targetUser?.fullName || m.senderName || "Mục tiêu (Unknown)";
            else if (isReporter) resolvedName = report.reporter?.fullName || m.senderName || "Người tố cáo";
            else resolvedName = m.senderName || "Người dùng khác";

            return {
              id: m.id,
              senderName: resolvedName,
              type: m.type,
              content: m.content,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              rawCreatedAt: m.createdAt,
              isTarget,
              isReported: report.messageIds.some(rid => String(rid) === String(m.id))
            };
          });
          setFullContextMessages(mapped);
        } catch (error) {
          toast.error("Không thể tải bối cảnh hội thoại");
        } finally {
          setLoadingFullContext(false);
        }
      };
      fetchFull();
    }
  }, [showFullContext, report, chatMessages]);

  if (!report) return null;

  const isUser = report.targetType === "USER";
  const isGroup = report.targetType === "GROUP";

  const handleSubmit = async (action: "DISMISS" | "WARN" | "BAN") => {
    if ((action === "WARN" || action === "BAN") && !adminNotes.trim()) {
      toast.error("Vui lòng nhập Admin Notes trước khi Cảnh cáo hoặc Cấm!");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(report.id, action, adminNotes);
    } catch (error) {
      console.error("Failed to submit report action", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-surface">
        {/* ── HEADER ── */}
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-on-surface">
            Review Case:{" "}
            <span className="text-primary">
              {REASON_LABELS[report.reason] ?? report.reason}
            </span>
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant mt-1">
            Báo cáo về{" "}
            <span className="font-semibold capitalize">
              {isUser ? "người dùng" : "nhóm"}
            </span>
            :{" "}
            <span className="font-mono text-xs bg-surface-container px-1.5 py-0.5 rounded">
              {report.targetId}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* ── SECTION A: EVIDENCE ── */}
        <section className="mt-4 space-y-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20 pb-2">
            Bằng chứng & Thông tin
          </h4>

          {/* ════════════════ USER EVIDENCE ════════════════ */}
          {isUser && (
            <>
              {/* Profile Card */}
              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                <img
                  src={report.targetUser?.avatar || "/placeholder.png"}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border-2 border-outline-variant/30 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(report.targetUser?.fullName || "User")}&background=random`;
                  }}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Mục tiêu bị tố cáo
                  </p>
                  <h5 className="text-base font-bold text-on-surface mt-0.5">
                    {report.targetUser?.fullName || "Unknown User"}
                  </h5>
                  <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                    ID: {report.targetId}
                  </p>
                  {!report.targetUser?.fullName && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      ⚠️ Tên chưa tải được — kiểm tra FeignClient token relay trong report-service
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {report.description && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant mb-1.5">
                    Mô tả từ người tố cáo:
                  </p>
                  <blockquote className="text-sm bg-surface-container-low p-3 rounded-xl text-on-surface italic border-l-4 border-primary/40">
                    "{report.description}"
                  </blockquote>
                </div>
              )}

              {/* Image Gallery — USER ONLY */}
              {report.imageUrls && report.imageUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant mb-2">
                    Hình ảnh đính kèm ({report.imageUrls.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {report.imageUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <img
                          src={url}
                          alt={`Bằng chứng ${idx + 1}`}
                          className="w-28 h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">🔍 Mở</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Chat Log — REAL API — USER ONLY */}
              {report.messageIds && report.messageIds.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant mb-2">
                    Đoạn Chat Bằng Chứng ({report.messageIds.length} tin nhắn):
                  </p>
                  {loadingEvidence ? (
                    <div className="flex items-center justify-center gap-2 p-8 bg-surface-container rounded-xl animate-pulse">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                      <span className="text-xs text-on-surface-variant ml-1">Đang tải lịch sử trò chuyện...</span>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="p-4 text-xs text-center text-on-surface-variant bg-surface-container rounded-xl">
                      Không thể tải tin nhắn bằng chứng. Kiểm tra console để biết thêm chi tiết.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-[#e9eaeb] dark:bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-3 max-h-[400px] overflow-y-auto shadow-inner border border-outline-variant/10">
                        {chatMessages.map((msg, idx) => (
                          <React.Fragment key={`${msg.id}-${idx}`}>
                            <div
                              className={`flex flex-col max-w-[85%] ${msg.isTarget ? "self-start" : "self-end"}`}
                            >
                              <span
                                className={`text-[10px] mb-1 px-1 font-semibold ${msg.isTarget ? "text-red-500 self-start" : "text-gray-500 dark:text-gray-400 self-end"
                                  }`}
                              >
                                {msg.isTarget && "⚠️ "}
                                {msg.senderName} · {msg.timestamp}
                              </span>
                              {msg.type === "image" || msg.content.match(/^https?:\/\/.*\.(png|jpe?g|gif|webp)(\?.*)?$/i) ? (
                                <a
                                  href={msg.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`rounded-xl overflow-hidden shadow-sm inline-block border ${msg.isTarget ? 'rounded-tl-none border-red-200 dark:border-red-900/40' : 'rounded-tr-none border-transparent'}`}
                                >
                                  <img
                                    src={msg.content}
                                    alt="Message Image"
                                    className="max-w-[200px] sm:max-w-[250px] object-cover"
                                  />
                                </a>
                              ) : (
                                <div
                                  className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.isTarget
                                    ? "bg-white dark:bg-[#2c2c2e] text-black dark:text-white rounded-tl-none border border-red-200 dark:border-red-900/40"
                                    : "bg-[#007aff] text-white rounded-tr-none"
                                    }`}
                                >
                                  {msg.content}
                                </div>
                              )}
                            </div>

                            {/* --- UPGRADED GAP DETECTION: INVISIBLE MESSAGE COUNT --- */}
                            {msg.hiddenAfterCount && msg.hiddenAfterCount > 0 ? (
                              <div className="flex items-center justify-center my-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-700 dark:text-yellow-400 text-[10px] italic font-bold uppercase tracking-wider">
                                ⚠️ Cảnh báo: Có {msg.hiddenAfterCount} tin nhắn đã bị ẩn ở đoạn này.
                              </div>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* --- DEEP FETCH BUTTON --- */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full bg-surface-container-highest hover:bg-surface-variant text-on-surface font-bold text-xs py-5 rounded-xl border border-outline-variant/30 flex items-center justify-center gap-2"
                        onClick={() => setShowFullContext(true)}
                      >
                        Xem toàn bộ hội thoại gốc (Kiểm tra bối cảnh)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════ GROUP EVIDENCE ════════════════ */}
          {isGroup && (
            <>
              {/* Red Warning Banner */}
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
                <span className="text-2xl shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">Cảnh báo nghiêm trọng</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5 leading-relaxed">
                    Nếu bạn chọn <span className="font-bold">BAN</span>, Nhóm này sẽ bị{" "}
                    <span className="font-bold underline">giải tán và xóa vĩnh viễn</span>{" "}
                    khỏi hệ thống. Hành động này không thể hoàn tác!
                  </p>
                </div>
              </div>

              {/* Group Info Card */}
              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                {groupInfo?.avatar ? (
                  <img
                    src={groupInfo.avatar}
                    alt="Group Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-outline-variant/30 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm">
                    G
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Nhóm bị tố cáo</p>
                  <h5 className="text-base font-bold text-on-surface mt-0.5">
                    {loadingGroup ? "Đang tải thông tin nhóm..." : groupInfo?.name || "Tên nhóm không rõ"}
                  </h5>
                  <p className="text-xs font-mono text-on-surface-variant mt-0.5">ID: {report.targetId}</p>
                </div>
              </div>

              {/* Reason & Description for evidence */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant mb-1">Lý do báo cáo:</p>
                  <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800/40">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                </div>

                {report.description && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 border-b border-outline-variant/20 pb-1">
                      Mô tả chi tiết từ người tố cáo:
                    </p>
                    <div className="bg-surface-container p-4 rounded-xl border-l-4 border-amber-500 shadow-sm">
                      <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                        {report.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── SECTION B: ACTION FORM ── */}
        <section className="mt-6">
          <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Quyết định xử lý
            </h4>
            <span className={`text-[10px] font-bold ${adminNotes.length > 900 ? 'text-red-500' : 'text-on-surface-variant/50'}`}>
              {adminNotes.length}/1000
            </span>
          </div>
          <textarea
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] transition-all resize-y placeholder:text-on-surface-variant/50 disabled:opacity-50"
            placeholder="Nhập ghi chú cho quyết định (Bắt buộc nếu chọn Warn/Ban)..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            maxLength={1000}
            disabled={isSubmitting}
          />
        </section>

        <DialogFooter className="mt-6 flex sm:justify-between items-center gap-3">
          {report.status !== "PENDING" ? (
            <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">Đã xử lý</span>
                <span className="text-xs text-blue-500">•</span>
                <span className="text-xs text-on-surface-variant font-mono">ID: {report.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-on-surface-variant uppercase font-bold tracking-tighter mb-1">Người xử lý</p>
                  <p className="font-semibold text-on-surface">{report.resolvedBy || "Hệ thống"}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant uppercase font-bold tracking-tighter mb-1">Thời gian</p>
                  <p className="font-semibold text-on-surface">{new Date(report.updatedAt).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-on-surface-variant uppercase font-bold tracking-tighter mb-1">Ghi chú Admin</p>
                  <p className="text-on-surface bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    {report.adminNotes || "Không có ghi chú"}
                  </p>
                </div>
              </div>
              <Button onClick={onClose} className="w-full mt-4 bg-surface-container-highest text-on-surface hover:bg-surface-variant">
                Đóng
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="text-on-surface-variant hover:bg-surface-variant">
                Hủy bỏ
              </Button>
              <div className="flex items-center justify-end gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit("DISMISS")}
                  disabled={isSubmitting}
                  className="border-outline-variant text-on-surface-variant hover:bg-surface-container-highest flex items-center gap-2"
                >
                  {isSubmitting ? "Đang xử lý..." : "Bỏ qua"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit("WARN")}
                  disabled={isSubmitting}
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                >
                  Cảnh cáo
                </Button>
                <Button
                  onClick={() => handleSubmit("BAN")}
                  disabled={isSubmitting}
                  className="bg-red-600 text-white hover:bg-red-700 font-bold shadow-sm flex items-center gap-2"
                >
                  Cấm (Ban)
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
        {/* ── FULL CONTEXT OVERLAY (Side Panel Style) ── */}
        {showFullContext && (
          <div className="absolute inset-0 z-50 bg-surface flex flex-col animate-in fade-in slide-in-from-right duration-300 shadow-2xl border-l border-outline-variant/30">
            {/* Overlay Header */}
            <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <AdjustmentsHorizontalIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-headline text-lg text-on-surface">Toàn bộ hội thoại gốc</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Đang kiểm tra bối cảnh hội thoại
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullContext(false)}
                className="rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold"
              >
                Đóng bối cảnh
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9fa] dark:bg-[#0f0f0f]">
              {loadingFullContext ? (
                <div className="h-full flex items-center justify-center flex-col gap-4">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-sm" />
                  <p className="text-sm font-headline text-on-surface-variant animate-pulse">Đang truy xuất dữ liệu từ Database...</p>
                </div>
              ) : (
                <>
                  {/* Pro Tip Banner */}
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/20 text-xs text-amber-800 dark:text-amber-400 mb-4 flex items-start gap-3 shadow-sm">
                    <span className="text-xl shrink-0">💡</span>
                    <div className="leading-relaxed">
                      <p className="font-bold mb-1">Mẹo kiểm tra:</p>
                      Các tin nhắn có <b>nền vàng</b> và <b>viền cam</b> là những bằng chứng đã được đính kèm trong đơn tố cáo. Hãy kiểm tra các tin nhắn xung quanh để xác định xem có hành vi khiêu khích hay cắt xén bối cảnh không.
                    </div>
                  </div>

                  {fullContextMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col gap-2 opacity-50">
                      <span className="text-4xl">📭</span>
                      <p className="text-sm font-bold">Không tìm thấy lịch sử hội thoại</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {fullContextMessages.map((msg, idx) => (
                        <div
                          key={`${msg.id}-${idx}`}
                          className={`flex flex-col max-w-[85%] ${msg.isTarget ? "self-start" : "self-end"} transition-all duration-500 ${msg.isReported
                              ? "p-3 bg-yellow-200 dark:bg-yellow-900/40 rounded-2xl border-2 border-yellow-400 shadow-md ring-4 ring-yellow-400/10"
                              : ""
                            }`}
                        >
                          <span
                            className={`text-[10px] mb-1.5 px-1 font-bold tracking-tight ${msg.isTarget ? "text-red-500 self-start" : "text-gray-500 dark:text-gray-400 self-end"
                              }`}
                          >
                            {msg.isReported && "🚩 [ĐÃ TỐ CÁO] "}
                            {msg.senderName} · {msg.timestamp}
                          </span>

                          {msg.type === "image" || msg.content.match(/^https?:\/\/.*\.(png|jpe?g|gif|webp)(\?.*)?$/i) ? (
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`rounded-xl overflow-hidden shadow-sm inline-block border hover:opacity-90 transition-opacity ${msg.isTarget ? 'rounded-tl-none border-red-200 dark:border-red-900/40' : 'rounded-tr-none border-transparent'
                                }`}
                            >
                              <img
                                src={msg.content}
                                alt="Context Image"
                                className="max-w-[200px] sm:max-w-[280px] object-cover"
                              />
                            </a>
                          ) : (
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.isTarget
                                  ? "bg-white dark:bg-[#2c2c2e] text-on-surface rounded-tl-none border border-outline-variant/10"
                                  : "bg-[#007aff] text-white rounded-tr-none"
                                } ${msg.isReported ? "font-medium" : ""}`}
                            >
                              {msg.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center py-12">
                    <div className="inline-block px-4 py-1.5 bg-surface-container rounded-full text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] border border-outline-variant/10">
                      Hết lịch sử tải được
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
