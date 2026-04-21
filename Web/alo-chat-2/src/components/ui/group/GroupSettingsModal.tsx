"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ShieldCheckIcon,
  LinkIcon,
  DocumentTextIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { toast } from "sonner";

interface GroupSettingsModalProps {
  groupId: string;
  groupName: string;
  isApprovalRequired: boolean;
  isLinkEnabled: boolean;
  isQuestionEnabled?: boolean;
  membershipQuestion?: string;
  onClose: () => void;
  onRefreshData?: () => void;
}

export default function GroupSettingsModal({
  groupId,
  groupName,
  isApprovalRequired: initialApproval,
  isLinkEnabled: initialLink,
  isQuestionEnabled: initialQuestionEnabled,
  membershipQuestion: initialQuestion,
  onClose,
  onRefreshData,
}: GroupSettingsModalProps) {
  const [isApprovalRequired, setIsApprovalRequired] = useState(initialApproval);
  const [isLinkEnabled, setIsLinkEnabled] = useState(initialLink);
  const [isQuestionEnabled, setIsQuestionEnabled] = useState(initialQuestionEnabled || false);
  const [membershipQuestion, setMembershipQuestion] = useState(initialQuestion || "");
  const [updating, setUpdating] = useState(false);

  // Sync state with props if they change
  useEffect(() => {
    setIsApprovalRequired(initialApproval);
    setIsLinkEnabled(initialLink);
    setIsQuestionEnabled(initialQuestionEnabled || false);
    setMembershipQuestion(initialQuestion || "");
  }, [initialApproval, initialLink, initialQuestionEnabled, initialQuestion]);

  const toggleApproval = async () => {
    try {
      setUpdating(true);
      const newVal = !isApprovalRequired;
      await groupService.updateApprovalSetting(groupId, newVal);
      setIsApprovalRequired(newVal);
      toast.success(`Đã ${newVal ? "bật" : "tắt"} yêu cầu phê duyệt`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình duyệt");
    } finally {
      setUpdating(false);
    }
  };

  const toggleLink = async () => {
    try {
      setUpdating(true);
      const newVal = !isLinkEnabled;
      await groupService.updateLinkSetting(groupId, newVal);
      setIsLinkEnabled(newVal);
      toast.success(`Đã ${newVal ? "bật" : "tắt"} link tham gia`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình link");
    } finally {
      setUpdating(false);
    }
  };

  const toggleQuestion = async () => {
    try {
      setUpdating(true);
      const newVal = !isQuestionEnabled;
      await groupService.updateGroupSettings(groupId, { isQuestionEnabled: newVal });
      setIsQuestionEnabled(newVal);
      toast.success(`Đã ${newVal ? "bật" : "tắt"} câu hỏi tham gia`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật câu hỏi");
    } finally {
      setUpdating(false);
    }
  };

  const saveQuestion = async () => {
    if (membershipQuestion.trim() === initialQuestion) return;
    try {
      setUpdating(true);
      await groupService.updateGroupSettings(groupId, { membershipQuestion: membershipQuestion.trim() });
      toast.success("Đã lưu câu hỏi tham gia");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu câu hỏi");
    } finally {
      setUpdating(false);
    }
  };

  const joinUrl = `${window.location.origin}/join/${groupId}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Cài đặt nhóm</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Quản lý quyền hạn & quyền riêng tư</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
          {/* Approval Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-gray-900">Phê duyệt thành viên</p>
                  <p className="text-[12px] text-gray-500 font-medium">Yêu cầu quản trị viên duyệt khi có người mới</p>
                </div>
              </div>
              <button
                onClick={toggleApproval}
                disabled={updating}
                className={`w-12 h-6 rounded-full transition-all relative ${isApprovalRequired ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isApprovalRequired ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Join Question - Only available if Approval is ON */}
            <div className={`pl-13 space-y-3 transition-all ${isApprovalRequired ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-gray-700">Câu hỏi tham gia</p>
                <button
                  onClick={toggleQuestion}
                  disabled={updating}
                  className={`w-10 h-5 rounded-full transition-all relative ${isQuestionEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isQuestionEnabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {isQuestionEnabled && (
                <div className="space-y-2">
                  <textarea
                    value={membershipQuestion}
                    onChange={(e) => setMembershipQuestion(e.target.value)}
                    onBlur={saveQuestion}
                    placeholder="Nhập câu hỏi để thành viên trả lời..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-[13px] font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    rows={2}
                  />
                  <p className="text-[10px] text-gray-400 font-medium italic">Tự động lưu khi bạn nhấn ra ngoài.</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-50 pt-6">
            {/* Link Section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-gray-900">Tham gia bằng link</p>
                  <p className="text-[12px] text-gray-500 font-medium">Bất kỳ ai có link đều có thể tham gia</p>
                </div>
              </div>
              <button
                onClick={toggleLink}
                disabled={updating}
                className={`w-12 h-6 rounded-full transition-all relative ${isLinkEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isLinkEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {isLinkEnabled && (
              <div className="pl-13 space-y-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-2 overflow-hidden">
                  <p className="text-[12px] text-gray-500 font-medium truncate flex-1 select-all">{joinUrl}</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(joinUrl);
                      toast.success("Đã sao chép link!");
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-4 bg-black text-white rounded-2xl font-black text-[14px] shadow-xl shadow-black/10 hover:bg-gray-900 transition-all"
          >
            HOÀN TẤT
          </button>
        </div>
      </div>
    </div>
  );
}
