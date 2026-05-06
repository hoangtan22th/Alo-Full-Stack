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
  PhotoIcon, 
  XMarkIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
  HandThumbDownIcon,
  NoSymbolIcon,
  EyeSlashIcon,
  DocumentMagnifyingGlassIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { reportService } from '@/services/reportService';
import { generateEvidenceSnapshot } from '@/utils/reportUtils';
import { MessageDTO } from '@/services/messageService';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "USER" | "GROUP";
  targetName?: string;
  onSuccess?: () => void;
  messages?: MessageDTO[];
  anchorId?: string;
  userCache?: Record<string, { avatar?: string }>;
  conversationId: string;
  conversationType: "ONE_TO_ONE" | "GROUP";
}

const REPORT_REASONS = [
  { id: 'SCAM_FRAUD', label: 'Lừa đảo', icon: <HandThumbDownIcon className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'SPAM_HARASSMENT', label: 'Spam/Quấy rối', icon: <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'CHILD_ABUSE', label: 'Xâm hại trẻ em', icon: <ShieldCheckIcon className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'SEXUAL_CONTENT', label: 'Nội dung dục', icon: <EyeSlashIcon className="w-4 h-4" />, color: 'text-pink-600', bg: 'bg-pink-50' },
  { id: 'VIOLENCE_TERRORISM', label: 'Bạo lực', icon: <NoSymbolIcon className="w-4 h-4" />, color: 'text-gray-900', bg: 'bg-gray-100' },
  { id: 'OTHER', label: 'Khác', icon: <ExclamationTriangleIcon className="w-4 h-4" />, color: 'text-gray-500', bg: 'bg-gray-50' },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetName,
  onSuccess,
  messages = [],
  anchorId,
  userCache = {},
  conversationId,
  conversationType: initialConversationType,
}: ReportModalProps) {
  const { user: currentUser } = useAuthStore();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reporterId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const snapshots = React.useMemo(() => {
    if (!reporterId) return [];
    return generateEvidenceSnapshot(anchorId, messages, String(reporterId), (senderId) => {
      return userCache[senderId]?.avatar || "";
    });
  }, [anchorId, messages, reporterId, userCache]);

  const resetForm = () => {
    setReason('');
    setDescription('');
    setSelectedFiles([]);
    setUploadProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 5) {
        toast.error('Tối đa 5 ảnh');
        return;
      }
      setSelectedFiles([...selectedFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Chọn lý do');
      return;
    }

    if (reason === 'OTHER' && !description.trim()) {
      toast.error('Vui lòng nhập mô tả chi tiết cho lý do "Khác"');
      return;
    }

    const reporterId = currentUser?.id || currentUser?._id || currentUser?.userId;
    if (!reporterId) {
      toast.error('Lỗi phiên đăng nhập');
      return;
    }

    try {
      setIsSubmitting(true);

      let finalImageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const { messageService } = await import('@/services/messageService');
        finalImageUrls = await messageService.uploadRawFiles(
          selectedFiles,
          (percent) => setUploadProgress(percent)
        );
      }

      const payload = {
        reporterId: String(reporterId),
        targetId,
        targetType,
        targetName,
        conversationId,
        conversationType: initialConversationType,
        reason,
        description: description || '',
        imageUrls: finalImageUrls,
        messageSnapshots: snapshots,
      };

      await reportService.createReport(payload);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Report failed:", error);
      // Backend might return 500 if spot-check fails or other issues
      toast.error(error.response?.data?.message || "Gửi báo cáo thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUser = targetType === 'USER';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[380px] w-[95vw] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-[24px] max-h-[85vh] flex flex-col">
        <DialogHeader className="p-5 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black text-gray-900 truncate">
                Báo cáo {isUser ? 'người dùng' : 'nhóm'}
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-[12px] truncate font-medium">
                {targetName || `ID: ${targetId}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-2 overflow-y-auto custom-scrollbar space-y-4">
          {/* --- REASON GRID --- */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Lý do báo cáo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setReason(item.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                    reason === item.id 
                      ? 'bg-blue-50/50 border-blue-600' 
                      : 'bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <span className={`text-[11px] font-bold ${reason === item.id ? 'text-blue-600' : 'text-gray-600'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {snapshots.length > 0 && (
              <motion.div 
                key="evidence"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-gray-900 p-3 text-white"
              >
                <div className="flex items-center gap-3">
                  <DocumentMagnifyingGlassIcon className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-black">Bằng chứng tin nhắn</p>
                    <p className="text-[10px] text-gray-400 truncate">Hệ thống đã tự động lưu vết {snapshots.length} tin nhắn</p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div key="form" className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Mô tả chi tiết {reason === 'OTHER' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  placeholder="Nhập nội dung vi phạm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="resize-none h-20 bg-gray-50 border-none rounded-xl p-3 text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Ảnh đính kèm ({selectedFiles.length}/5)
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {selectedFiles.map((file, idx) => (
                    <div key={`img-${idx}`} className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                      <button 
                        onClick={() => removeFile(idx)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length < 5 && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 shrink-0 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      <span className="text-[8px] font-bold">THÊM</span>
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="p-5 pt-2 bg-gray-50 shrink-0 gap-2">
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            disabled={isSubmitting}
            className="rounded-lg h-9 text-[12px] font-bold text-gray-500"
          >
            HỦY
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason}
            className="rounded-lg px-6 h-9 text-[12px] font-black bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? 'ĐANG GỬI...' : 'GỬI BÁO CÁO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
