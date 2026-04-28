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

interface EvidenceMessage {
  id: string;
  senderName: string;
  type: string;
  content: string;
  timestamp: string;
  isTarget: boolean;
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
            senderName: resolvedName,
            type: m.type,
            content: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isTarget,
          };
        });

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
            🔍 Bằng chứng & Thông tin
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
                    <div className="bg-[#e9eaeb] dark:bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                      {chatMessages.map((msg, index) => (
                        <React.Fragment key={msg.id}>
                          {index === 20 && chatMessages.length === 40 && (
                            <div className="flex items-center my-4 w-full">
                              <div className="flex-1 border-t border-dashed border-outline-variant/60"></div>
                              <span className="mx-4 text-[11px] font-bold tracking-wider text-on-surface-variant/70 uppercase flex items-center gap-1.5">
                                ✂️ KHẢNG THỜI GIAN BỊ ẨN ✂️
                              </span>
                              <div className="flex-1 border-t border-dashed border-outline-variant/60"></div>
                            </div>
                          )}
                          <div
                            className={`flex flex-col max-w-[80%] ${msg.isTarget ? "self-start" : "self-end"}`}
                          >
                            <span
                              className={`text-[10px] mb-1 px-1 font-semibold ${msg.isTarget ? "text-red-500 self-start" : "text-gray-500 self-end"
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
                                className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${msg.isTarget
                                  ? "bg-white dark:bg-[#2c2c2e] text-black dark:text-white rounded-tl-none border border-red-200 dark:border-red-900/40"
                                  : "bg-[#007aff] text-white rounded-tr-none"
                                  }`}
                              >
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      ))}
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
          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20 pb-2 mb-3">
            ⚖️ Quyết định xử lý
          </h4>
          <textarea
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] transition-all resize-y placeholder:text-on-surface-variant/50 disabled:opacity-50"
            placeholder="Nhập ghi chú cho quyết định (Bắt buộc nếu chọn Warn/Ban)..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </section>

        <DialogFooter className="mt-6 flex sm:justify-between items-center gap-3">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
