import { useState, useEffect } from "react";
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
import { ReportItem } from "@/services/reportService";

interface EvidenceMessage {
  id: string;
  senderName: string;
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
  ) => void;
}

export function ReportActionModal({
  report,
  isOpen,
  onClose,
  onSubmit,
}: ReportActionModalProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [messages, setMessages] = useState<EvidenceMessage[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchEvidence = async () => {
      if (!report || !report.messageIds || report.messageIds.length === 0) {
        setMessages([]);
        return;
      }

      setLoadingEvidence(true);
      try {
        // TODO: Replace with real API call to message-service via Gateway
        // const res = await axiosClient.post('/api/v1/admin/messages/bulk', { ids: report.messageIds });

        // MOCK: Giả lập gọi API lấy data từ các ID
        await new Promise((resolve) => setTimeout(resolve, 800)); // fake delay

        const mockMessages: EvidenceMessage[] = report.messageIds.map(
          (id, index) => {
            // Fake text based on ID hash or random logic, making the target user look suspicious
            const isSuspect = index % 2 !== 0;
            const senderName = isSuspect
              ? report.targetUser?.name || report.targetId || "Suspect User"
              : report.reporter?.name || "Reporter";

            const fakeTexts = [
              "Hello, everyone!",
              "I'm going to spam this group with crypto links, buy my coin!",
              "Please stop doing that.",
              "Tôi thích thì tôi chửi thề đấy thì làm sao? @#$%",
              "Report me if you dare.",
            ];

            return {
              id,
              senderName,
              content: fakeTexts[index % fakeTexts.length],
              timestamp: new Date(
                Date.now() - (report.messageIds.length - index) * 60000,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isTarget: isSuspect,
            };
          },
        );

        if (isMounted) {
          setMessages(mockMessages);
        }
      } catch (error) {
        console.error("Failed to fetch evidence", error);
      } finally {
        if (isMounted) setLoadingEvidence(false);
      }
    };

    if (isOpen && report) {
      setAdminNotes(""); // Reset form on open
      fetchEvidence();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, report]);

  if (!report) return null;

  const handleSubmit = (action: "DISMISS" | "WARN" | "BAN") => {
    if ((action === "WARN" || action === "BAN") && !adminNotes.trim()) {
      toast.error(
        "Vui lòng nhập ghi chú (Admin Notes) trước khi Cảnh cáo hoặc Cấm!",
      );
      return;
    }
    onSubmit(report.id, action, adminNotes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-surface">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-on-surface">
            Review Case: {report.reason}
          </DialogTitle>
          <div className="text-on-surface-variant flex flex-col gap-1 mt-2">
            <DialogDescription>
              Xử lý báo cáo liên quan đến:{" "}
              <span className="font-semibold text-primary">
                {report.targetType}
              </span>
              {report.targetUser?.name
                ? ` (${report.targetUser.name})`
                : ` (${report.targetId})`}
            </DialogDescription>
            {report.targetType === "GROUP" && (
              <p className="text-error font-medium text-sm mt-1 bg-error-container p-2 rounded-lg">
                ⚠️ Cảnh báo: Nếu bạn chọn "Cấm" (BAN), Nhóm này sẽ bị giải tán
                và xóa vĩnh viễn khỏi hệ thống!
              </p>
            )}
          </div>
        </DialogHeader>

        {/* SECTION A: EVIDENCE */}
        <section className="mt-4 p-5 border border-outline-variant/20 rounded-2xl bg-surface-container-lowest">
          <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-4 flex items-center gap-2">
            Thông tin bằng chứng
          </h4>

          <div className="space-y-5">
            {report.targetType === "USER" && (
              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                <img
                  src={report.targetUser?.avatar || "/placeholder.png"}
                  alt="Target User Avatar"
                  className="w-14 h-14 rounded-full object-cover border-2 border-outline-variant/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(report.targetUser?.name || "User")}&background=random`;
                  }}
                />
                <div>
                  <h5 className="text-sm font-bold text-on-surface">
                    Mục tiêu báo cáo (USER)
                  </h5>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Tên:{" "}
                    <span className="font-semibold text-on-surface">
                      {report.targetUser?.name || "Unknown User"}
                    </span>
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    ID: <span className="font-mono">{report.targetId}</span>
                  </p>
                </div>
              </div>
            )}

            {report.description && (
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-1">
                  Mô tả từ người tố cáo:
                </p>
                <p className="text-sm bg-surface-container-low p-3 rounded-lg text-on-surface italic border-l-4 border-l-primary/50">
                  "{report.description}"
                </p>
              </div>
            )}

            {report.imageUrls && report.imageUrls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-2">
                  Hình ảnh đính kèm:
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-32 h-32 object-cover rounded-xl border border-outline-variant/20 shadow-sm"
                    />
                  ))}
                </div>
              </div>
            )}

            {report.messageIds && report.messageIds.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-2">
                  Đoạn Chat Bằng Chứng:
                </p>
                {loadingEvidence ? (
                  <div className="flex items-center justify-center p-8 bg-surface-container rounded-xl">
                    <span className="text-sm font-medium animate-pulse text-on-surface-variant">
                      Đang tải lịch sử trò chuyện...
                    </span>
                  </div>
                ) : (
                  <div className="bg-[#e5e5ea] dark:bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${msg.isTarget ? "self-start" : "self-end"}`}
                      >
                        <span
                          className={`text-[10px] mb-1 px-1 font-medium ${msg.isTarget ? "text-gray-500 self-start" : "text-gray-500 self-end"}`}
                        >
                          {msg.senderName} • {msg.timestamp}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-sm shadow-sm ${
                            msg.isTarget
                              ? "bg-white dark:bg-[#2c2c2e] text-black dark:text-white rounded-tl-none border border-error/50"
                              : "bg-[#007aff] text-white rounded-tr-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECTION B: ACTION FORM */}
        <section className="mt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-3">
            Quyết định xử lý
          </h4>
          <textarea
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] transition-all resize-y"
            placeholder="Nhập ghi chú cho quyết định (Bắt buộc nếu chọn Warn/Ban)..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </section>

        <DialogFooter className="mt-8 flex sm:justify-between items-center gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-variant"
          >
            Hủy bỏ
          </Button>
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleSubmit("DISMISS")}
              className="border-outline-variant text-on-surface-variant hover:bg-surface-container-highest"
            >
              Bỏ qua
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit("WARN")}
              className="border-tertiary text-tertiary hover:bg-tertiary/10"
            >
              Cảnh cáo (Warn)
            </Button>
            <Button
              onClick={() => handleSubmit("BAN")}
              className="bg-error text-on-error hover:bg-error/90 font-bold shadow-minimal"
            >
              Cấm (Ban)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
