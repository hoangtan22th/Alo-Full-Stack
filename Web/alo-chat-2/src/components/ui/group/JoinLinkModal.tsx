"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  LinkIcon,
  CheckIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { messageService } from "@/services/messageService";
import { toast } from "sonner";
import { getMediaUrl } from "@/utils/media";
import QRCode from "react-qr-code";

interface JoinLinkModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  isHistoryVisible?: boolean;
  currentUserName?: string;
  isManager: boolean;
  onClose: () => void;
}

export default function JoinLinkModal({ 
  isOpen,
  groupId, 
  groupName, 
  groupAvatar,
  isHistoryVisible: initialHistory,
  currentUserName,
  isManager, 
  onClose 
}: JoinLinkModalProps) {
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(initialHistory ?? true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const shareUrl = `https://alo.chat/g/${groupId}`;

  const sendSystemMsg = async (content: string) => {
    try {
      await messageService.sendMessage({
        conversationId: groupId,
        type: "system",
        content: `${currentUserName || "Quản trị viên"} ${content}`,
      });
    } catch (error) {
      console.error("Lỗi gửi tin nhắn hệ thống:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroupSettings();
    }
  }, [groupId, isOpen]);

  const fetchGroupSettings = async () => {
    try {
      setLoading(true);
      const res: any = await groupService.getGroupById(groupId);
      const data = res?.data || res;
      setIsLinkEnabled(data.isLinkEnabled ?? false);
      setIsHistoryVisible(data.isHistoryVisible ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLink = async () => {
    try {
      setUpdating(true);
      const newVal = !isLinkEnabled;
      await groupService.updateLinkSetting(groupId, newVal);
      setIsLinkEnabled(newVal);
      toast.success(`Đã ${newVal ? 'bật' : 'tắt'} link tham gia nhóm`);
      sendSystemMsg(`đã ${newVal ? 'bật' : 'tắt'} link tham gia nhóm`);
    } catch (err) {
      toast.error("Lỗi khi cập nhật cài đặt link");
    } finally {
      setUpdating(false);
    }
  };

  const toggleHistory = async (val: boolean) => {
    try {
      setUpdating(true);
      await groupService.updateHistorySetting(groupId, val);
      setIsHistoryVisible(val);
      toast.success(`Đã ${val ? "bật" : "tắt"} lịch sử tin nhắn`);
      sendSystemMsg(`đã ${val ? "cho phép" : "không cho phép"} thành viên mới xem lại tin nhắn cũ`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình lịch sử");
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Đã sao chép link tham gia nhóm");
  };

  const handleShareToChat = async () => {
    try {
      setUpdating(true);
      await messageService.sendMessage({
        conversationId: groupId,
        type: "text",
        content: `Mời bạn tham gia nhóm qua link: ${shareUrl}`,
      });
      toast.success("Đã chia sẻ link vào nhóm");
    } catch (err) {
      toast.error("Không thể chia sẻ link");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveQR = () => {
    const svg = document.getElementById("info-qr-code");
    if (svg) {
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `QR_Group_${groupName}.png`;
          downloadLink.href = `${pngFile}`;
          downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        toast.success("Đang tải xuống mã QR...");
      } catch (err) {
        toast.error("Không thể lưu mã QR");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl flex flex-col h-[85vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
             <h3 className="text-lg font-black text-gray-900 text-center flex-1 ml-8">Link tham gia nhóm</h3>
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition shadow-sm"><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
             {/* Group Info Branding */}
             <div className="mb-6 flex flex-col items-center">
                <div className="w-20 h-20 rounded-[28px] bg-gray-900 border-4 border-white shadow-xl overflow-hidden mb-4">
                   {groupAvatar ? <img src={getMediaUrl(groupAvatar)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{groupName?.charAt(0).toUpperCase()}</div>}
                </div>
                <h4 className="text-xl font-black text-gray-900 leading-tight text-center">{groupName}</h4>
                <p className="text-[13px] text-gray-400 font-medium mt-1 text-center px-4 leading-relaxed">Mời mọi người tham gia nhóm bằng mã QR hoặc link dưới đây</p>
             </div>

             {loading ? (
                <div className="flex-1 flex items-center justify-center">
                   <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                </div>
             ) : !isLinkEnabled ? (
                <div className="w-full bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center text-center">
                   <LinkIcon className="w-12 h-12 text-gray-300 mb-4" />
                   <p className="text-[14px] font-bold text-gray-800 mb-2">Link tham gia đang tắt</p>
                   <p className="text-[12px] text-gray-400 mb-6">Bạn cần bật tính năng này để mọi người có thể tham gia qua link hoặc mã QR.</p>
                   {isManager && (
                      <button 
                         onClick={handleToggleLink}
                         className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
                      >
                         Bật tính năng link
                      </button>
                   )}
                </div>
             ) : (
                <>
                   {/* QR Code Section */}
                   <div className="bg-white p-5 rounded-[32px] shadow-2xl border border-gray-50 mb-8 animate-in zoom-in-95 duration-500 shrink-0">
                      <QRCode 
                        id="info-qr-code"
                        value={shareUrl}
                        size={200}
                        level="H"
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      />
                   </div>

                   {/* URL Display */}
                   <div className="w-full bg-gray-50/80 py-3 px-5 rounded-2xl border border-gray-100 mb-8 group shrink-0">
                      <p className="text-[13px] text-gray-500 font-bold truncate text-center select-all">{shareUrl}</p>
                   </div>

                   {/* Action Buttons */}
                   <div className="grid grid-cols-2 gap-4 w-full mb-10 shrink-0">
                      <button 
                        onClick={handleCopyLink}
                        className="flex flex-col items-center gap-2 group"
                      >
                         <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                            <DocumentDuplicateIcon className="w-6 h-6" />
                         </div>
                         <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Sao chép</span>
                      </button>

                      <button 
                        onClick={() => {
                           if (navigator.share) {
                              navigator.share({ title: groupName, url: shareUrl });
                           } else {
                              handleCopyLink();
                           }
                        }}
                        className="flex flex-col items-center gap-2 group"
                      >
                         <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                            <ShareIcon className="w-6 h-6" />
                         </div>
                         <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Chia sẻ</span>
                      </button>

                      <button 
                        onClick={handleSaveQR}
                        className="flex flex-col items-center gap-2 group"
                      >
                         <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                            <ArrowDownTrayIcon className="w-6 h-6" />
                         </div>
                         <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Lưu QR</span>
                      </button>

                      <button 
                        onClick={handleShareToChat}
                        disabled={updating}
                        className="flex flex-col items-center gap-2 group"
                      >
                         <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                            <PaperAirplaneIcon className="w-6 h-6" />
                         </div>
                         <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Gửi chat</span>
                      </button>
                   </div>

                   {/* Admin Privacy Settings */}
                   {isManager && (
                      <div className="w-full space-y-4 pt-6 border-t border-gray-100 shrink-0 mb-4">
                         <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex-1 pr-4">
                               <p className="text-[14px] font-black text-gray-800 tracking-tight">Xem lại tin nhắn cũ</p>
                               <p className="text-[11px] text-gray-400 font-medium leading-tight">Thành viên mới được xem tin nhắn từ trước khi tham gia</p>
                            </div>
                            <button
                              onClick={() => toggleHistory(!isHistoryVisible)}
                              disabled={updating}
                              className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${isHistoryVisible ? 'bg-black' : 'bg-gray-200'} ${updating ? 'opacity-50' : ''}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isHistoryVisible ? 'left-6' : 'left-1'}`} />
                            </button>
                         </div>
                      </div>
                   )}
                </>
             )}
          </div>
       </div>
    </div>
  );
}
