"use client";
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import axiosClient from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AdjustmentsHorizontalIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "USER" | "GROUP";
  /** Pre-selected message IDs (auto-evidence or custom). */
  selectedMessageIds?: string[];
  targetName?: string;
  onSuccess?: () => void;
  /** Called when user clicks "Tùy chỉnh bằng chứng". */
  onCustomizeEvidence?: () => void;
  /** If true, show description/image fields (customize mode). */
  isCustomizeMode?: boolean;
}

const REPORT_REASONS: Record<string, string> = {
  SCAM_FRAUD: "Lừa đảo / Gian lận",
  CHILD_ABUSE: "Xâm hại trẻ em",
  SEXUAL_CONTENT: "Nội dung tình dục",
  VIOLENCE_TERRORISM: "Bạo lực / Khủng bố",
  SPAM_HARRASSMENT: "Spam / Quấy rối",
  OTHER: "Khác",
};

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  selectedMessageIds = [],
  targetName,
  onSuccess,
  onCustomizeEvidence,
  isCustomizeMode = false,
}: ReportModalProps) {
  const { user: currentUser } = useAuthStore();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setReason('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Vui lòng chọn lý do báo cáo');
      return;
    }

    // ── SAFE ID EXTRACTION ──
    // user.id is the MariaDB UUID from user-service (set by fetchProfile).
    // We NEVER use _id (MongoDB) or userId as fallback to avoid sending a
    // 24-char ObjectId to report-service which calls user-service (MariaDB).
    const isMongoId = (id?: string | null) =>
      typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);

    const reporterId = currentUser?.id
      ? (isMongoId(currentUser.id) ? null : currentUser.id)
      : null;

    if (!reporterId) {
      toast.error('Không thể xác định tài khoản của bạn. Vui lòng đăng xuất và đăng nhập lại.');
      console.error('[ReportModal] Invalid or missing reporterId:', {
        id: currentUser?.id,
        _id: currentUser?._id,
        userId: currentUser?.userId,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        reporterId,
        targetId,
        targetType,
        reason,
        description: isCustomizeMode ? description : '',
        imageUrls: isCustomizeMode && targetType === 'USER' ? imageUrls : [],
        messageIds: targetType === 'USER' ? selectedMessageIds : [],
      };

      console.log('[ReportModal] Submitting report payload:', {
        reporterId: payload.reporterId,
        targetId: payload.targetId,
        targetType: payload.targetType,
        messageCount: payload.messageIds.length,
      });

      await axiosClient.post('/reports', payload);

      toast.success('Báo cáo đã được gửi thành công. Cảm ơn bạn!');
      handleClose();

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể gửi báo cáo, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUser = targetType === 'USER';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">
            Báo cáo {isUser ? 'người dùng' : 'nhóm'}
          </DialogTitle>
          <DialogDescription>
            {targetName ? `Bạn đang báo cáo: ${targetName}` : `ID: ${targetId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* --- REASON DROPDOWN --- */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Lý do báo cáo <span className="text-red-500">*</span>
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lý do..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_REASONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* --- EVIDENCE SUMMARY (User reports only) --- */}
          {isUser && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-700 leading-relaxed">
                {selectedMessageIds.length > 0 ? (
                  <>
                    Hệ thống đã tự động chọn{' '}
                    <span className="font-bold">{selectedMessageIds.length}</span>{' '}
                    tin nhắn làm bằng chứng.
                  </>
                ) : (
                  'Chưa có bằng chứng nào được chọn.'
                )}
              </div>
              {onCustomizeEvidence && (
                <button
                  onClick={onCustomizeEvidence}
                  className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 shrink-0 transition-colors"
                >
                  <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                  Tùy chỉnh
                </button>
              )}
            </div>
          )}

          {/* --- EXPANDABLE SECTION: description + images (only in customize mode) --- */}
          {isCustomizeMode && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Mô tả thêm (tùy chọn)</label>
                <Textarea
                  placeholder="Cung cấp thêm ngữ cảnh cho quản trị viên..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
              {isUser && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Hình ảnh đính kèm (tùy chọn)
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors text-gray-400">
                    <PhotoIcon className="w-5 h-5" />
                    <span className="text-sm">Bấm để thêm ảnh</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
