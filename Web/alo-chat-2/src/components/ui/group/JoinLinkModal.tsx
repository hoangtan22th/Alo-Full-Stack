"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { toast } from "sonner";

interface JoinLinkModalProps {
  groupId: string;
  groupName: string;
  isManager: boolean;
  onClose: () => void;
}

export default function JoinLinkModal({ groupId, groupName, isManager, onClose }: JoinLinkModalProps) {
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Giả sử link format là: http://localhost:3000/join/[groupId]
  const joinUrl = `${window.location.origin}/join/${groupId}`;

  useEffect(() => {
    fetchGroupSettings();
  }, [groupId]);

  const fetchGroupSettings = async () => {
    try {
      setLoading(true);
      const res: any = await groupService.getGroupById(groupId);
      const data = res?.data || res;
      setIsLinkEnabled(data.isLinkEnabled ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLink = async () => {
    try {
      setUpdating(true);
      await groupService.updateLinkSetting(groupId, !isLinkEnabled);
      setIsLinkEnabled(!isLinkEnabled);
      toast.success(`Đã ${!isLinkEnabled ? 'bật' : 'tắt'} link tham gia nhóm`);
    } catch (err) {
      toast.error("Lỗi khi cập nhật cài đặt link");
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyLink = () => {
    if (!isLinkEnabled) return toast.error("Vui lòng bật link tham gia trước");
    navigator.clipboard.writeText(joinUrl);
    toast.success("Đã sao chép link vào bộ nhớ tạm");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Link tham gia nhóm</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Mời thành viên qua liên kết</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 ${isLinkEnabled ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 rotate-12 scale-110' : 'bg-gray-100 text-gray-400'}`}>
            <LinkIcon className="w-10 h-10" />
          </div>

          <h3 className="text-xl font-black text-gray-900 text-center mb-2">{groupName}</h3>
          <p className="text-sm text-gray-500 text-center mb-8 px-4">
            Bất kỳ ai có link này đều có thể tham gia nhóm nếu được Trưởng/Phó nhóm bật.
          </p>

          {isLinkEnabled && (
            <div className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 break-all">
              <p className="text-[13px] font-medium text-gray-600 text-center leading-relaxed">
                {joinUrl}
              </p>
            </div>
          )}

          <div className="w-full space-y-3">
            <button 
              disabled={!isLinkEnabled}
              onClick={handleCopyLink}
              className="w-full py-4 flex items-center justify-center gap-3 bg-black text-white rounded-2xl font-black shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition disabled:bg-gray-300 disabled:shadow-none disabled:translate-y-0"
            >
              <ClipboardDocumentIcon className="w-5 h-5" />
              SAO CHÉP LINK
            </button>

            {isManager && (
              <button 
                onClick={handleToggleLink}
                disabled={updating}
                className={`w-full py-4 rounded-2xl font-black text-[13px] border-2 transition ${isLinkEnabled ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}
              >
                {updating ? 'ĐANG CẬP NHẬT...' : (isLinkEnabled ? 'TẮT LINK THAM GIA' : 'BẬT LINK THAM GIA')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
