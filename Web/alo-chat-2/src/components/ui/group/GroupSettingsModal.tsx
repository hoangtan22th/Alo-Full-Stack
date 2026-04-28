"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  ShieldCheckIcon,
  LinkIcon,
  DocumentTextIcon,
  CheckIcon,
  BellAlertIcon,
  ClockIcon,
  ChartBarIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  UserPlusIcon,
  CameraIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import { messageService } from "@/services/messageService";
import { toast } from "sonner";
import { getMediaUrl } from "../../../utils/media";
import QRCode from "react-qr-code";

export interface GroupPermissions {
  editGroupInfo?: "EVERYONE" | "ADMIN";
  createNotes?: "EVERYONE" | "ADMIN";
  createPolls?: "EVERYONE" | "ADMIN";
  pinMessages?: "EVERYONE" | "ADMIN";
  sendMessage?: "EVERYONE" | "ADMIN";
  createReminders?: "EVERYONE" | "ADMIN";
}

interface GroupSettingsModalProps {
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  isApprovalRequired: boolean;
  isLinkEnabled: boolean;
  isHistoryVisible?: boolean;
  isHighlightEnabled?: boolean;
  permissions?: GroupPermissions;
  isQuestionEnabled?: boolean;
  membershipQuestion?: string;
  members?: any[];
  currentUserRole?: string;
  currentUserName?: string;
  onClose: () => void;
  onRefreshData?: () => void;
  onDisbandGroup?: () => void;
}

export default function GroupSettingsModal({
  groupId,
  groupName,
  groupAvatar: initialAvatar,
  isApprovalRequired: initialApproval,
  isLinkEnabled: initialLink,
  isHistoryVisible: initialHistory,
  isHighlightEnabled: initialHighlight,
  permissions: initialPermissions,
  isQuestionEnabled: initialQuestionEnabled,
  membershipQuestion: initialQuestion,
  members = [],
  currentUserRole = "member",
  currentUserName,
  onClose,
  onRefreshData,
  onDisbandGroup,
}: GroupSettingsModalProps) {
  const [isApprovalRequired, setIsApprovalRequired] = useState(initialApproval);
  const [isLinkEnabled, setIsLinkEnabled] = useState(initialLink);
  const [isHistoryVisible, setIsHistoryVisible] = useState(initialHistory !== false);
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(initialHighlight || false);
  const [permissions, setPermissions] = useState<GroupPermissions>(initialPermissions || {
    editGroupInfo: "ADMIN",
    createNotes: "EVERYONE",
    createPolls: "EVERYONE",
    pinMessages: "ADMIN",
    sendMessage: "EVERYONE",
    createReminders: "ADMIN",
  });

  const [isQuestionEnabled, setIsQuestionEnabled] = useState(initialQuestionEnabled || false);
  const [membershipQuestion, setMembershipQuestion] = useState(initialQuestion || "");
  const [updating, setUpdating] = useState(false);
  const [showTransferLeader, setShowTransferLeader] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string | null>(null);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [blockedMembers, setBlockedMembers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUserRole === "leader";

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

  // Sync state with props if they change
  useEffect(() => {
    setIsApprovalRequired(initialApproval);
    setIsLinkEnabled(initialLink);
    setIsHistoryVisible(initialHistory !== false);
    setIsHighlightEnabled(initialHighlight || false);
    setIsQuestionEnabled(initialQuestionEnabled || false);
    setMembershipQuestion(initialQuestion || "");
    if (initialPermissions) setPermissions(initialPermissions);
  }, [initialApproval, initialLink, initialHistory, initialHighlight, initialQuestionEnabled, initialQuestion, initialPermissions]);

  // Real-time updates
  useEffect(() => {
    const unsub = socketService.onGroupUpdated((data) => {
      // Logic same as mobile to update UI when settings changed by others
      if (data.id === groupId || data._id === groupId) {
        if (data.isApprovalRequired !== undefined) setIsApprovalRequired(data.isApprovalRequired);
        if (data.isLinkEnabled !== undefined) setIsLinkEnabled(data.isLinkEnabled);
        if (data.isHistoryVisible !== undefined) setIsHistoryVisible(data.isHistoryVisible);
        if (data.isHighlightEnabled !== undefined) setIsHighlightEnabled(data.isHighlightEnabled);
        if (data.isQuestionEnabled !== undefined) setIsQuestionEnabled(data.isQuestionEnabled);
        if (data.membershipQuestion !== undefined) setMembershipQuestion(data.membershipQuestion || "");
        if (data.permissions) setPermissions(data.permissions);
      }
    });

    return () => unsub();
  }, [groupId]);

  const toggleApproval = async () => {
    try {
      setUpdating(true);
      const newVal = !isApprovalRequired;
      
      // Update approval setting
      await groupService.updateApprovalSetting(groupId, newVal);
      setIsApprovalRequired(newVal);

      // Constraint: If turning OFF approval, also turn OFF join questions
      if (!newVal && isQuestionEnabled) {
        await groupService.updateGroupSettings(groupId, { isQuestionEnabled: false });
        setIsQuestionEnabled(false);
        toast.success(`Đã tắt phê duyệt & câu hỏi tham gia`);
        sendSystemMsg("đã tắt yêu cầu phê duyệt và câu hỏi tham gia");
      } else {
        toast.success(`Đã ${newVal ? "bật" : "tắt"} yêu cầu phê duyệt`);
        sendSystemMsg(`đã ${newVal ? "bật" : "tắt"} yêu cầu phê duyệt thành viên`);
      }
      
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
      sendSystemMsg(`đã ${newVal ? "bật" : "tắt"} link tham gia nhóm`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình link");
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
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình lịch sử");
    } finally {
      setUpdating(false);
    }
  };

  const toggleHighlight = async (val: boolean) => {
    try {
      setUpdating(true);
      await groupService.updateGroupSettings(groupId, { isHighlightEnabled: val });
      setIsHighlightEnabled(val);
      toast.success(`Đã ${val ? "bật" : "tắt"} làm nổi bật Admin`);
      sendSystemMsg(`đã ${val ? "bật" : "tắt"} chế độ làm nổi bật Admin`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấu hình nổi bật");
    } finally {
      setUpdating(false);
    }
  };

  const updatePermission = async (field: keyof GroupPermissions, value: "EVERYONE" | "ADMIN") => {
    try {
      setUpdating(true);
      const newPerms = { ...permissions, [field]: value };
      await groupService.updateGroupSettings(groupId, { permissions: newPerms });
      setPermissions(newPerms);
      const fieldNames: Record<string, string> = {
        editGroupInfo: "Đổi thông tin nhóm",
        createNotes: "Tạo ghi chú",
        createPolls: "Tạo bình chọn",
        pinMessages: "Ghim tin nhắn",
        sendMessage: "Gửi tin nhắn",
        createReminders: "Tạo nhắc hẹn"
      };
      toast.success("Đã cập nhật quyền hạn");
      sendSystemMsg(`đã cập nhật quyền "${fieldNames[field] || field}" thành ${value === "EVERYONE" ? "Tất cả thành viên" : "Chỉ Admin"}`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật quyền hạn");
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
      sendSystemMsg(`đã ${newVal ? "bật" : "tắt"} câu hỏi tham gia nhóm`);
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
      sendSystemMsg("đã cập nhật nội dung câu hỏi tham gia nhóm");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu câu hỏi");
    } finally {
      setUpdating(false);
    }
  };

  const handleEditName = () => {
    const newName = prompt("Nhập tên nhóm mới:", groupName);
    if (newName && newName.trim() && newName.trim() !== groupName) {
      groupService.updateGroup(groupId, newName.trim())
        .then(() => {
          toast.success("Đã đổi tên nhóm");
          sendSystemMsg(`đã đổi tên nhóm thành "${newName.trim()}"`);
          if (onRefreshData) onRefreshData();
        })
        .catch(() => toast.error("Không thể đổi tên nhóm"));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await groupService.updateGroup(groupId, undefined, file);
      toast.success("Đã cập nhật ảnh đại diện");
      sendSystemMsg("đã cập nhật ảnh đại diện nhóm");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Lỗi cập nhật ảnh đại diện");
    }
  };

  const handleTransferLeader = async () => {
    if (!selectedNewLeaderId) return;
    if (!confirm("Xác nhận chuyển quyền trưởng nhóm? Bạn sẽ trở thành thành viên thường.")) return;
    try {
      setUpdating(true);
      await groupService.assignLeader(groupId, selectedNewLeaderId);
      const newLeader = members.find(m => m.userId === selectedNewLeaderId);
      const newLeaderName = newLeader?.fullName || newLeader?.user?.fullName || "Thành viên mới";
      toast.success("Đã chuyển quyền trưởng nhóm");
      sendSystemMsg(`đã chuyển quyền trưởng nhóm cho ${newLeaderName}`);
      setShowTransferLeader(false);
      onClose();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Lỗi chuyển quyền trưởng nhóm");
    } finally {
      setUpdating(false);
    }
  };

  const fetchBlockedMembers = async () => {
    try {
      setLoadingBlocked(true);
      const res = await groupService.getBlockedMembers(groupId);
      setBlockedMembers(res || []);
    } catch (err) {
      toast.error("Không thể tải danh sách bị chặn");
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblockMember = async (userId: string) => {
    try {
      await groupService.unblockMember(groupId, userId);
      toast.success("Đã gỡ chặn người dùng");
      setBlockedMembers(prev => prev.filter(m => m.userId !== userId));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Lỗi gỡ chặn người dùng");
    }
  };

  useEffect(() => {
    if (showBlockedUsersModal) {
      fetchBlockedMembers();
    }
  }, [showBlockedUsersModal]);

  const shareUrl = `https://alo.chat/g/${groupId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Đã sao chép link tham gia nhóm");
  };

  const handleSaveQR = () => {
    const svg = document.getElementById("group-qr-code");
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-10">
          {/* Profile Section */}
          <div className="flex flex-col items-center">
            <div className="relative group overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                  {initialAvatar ? (
                    <img src={getMediaUrl(initialAvatar)} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-black">{groupName.charAt(0).toUpperCase()}</span>
                  )}
               </div>
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                 <CameraIcon className="w-8 h-8 text-white" />
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            
            <div className="flex items-center gap-2 mt-4 cursor-pointer hover:bg-gray-50 px-4 py-2 rounded-xl transition shadow-sm border border-gray-100" onClick={handleEditName}>
               <h3 className="text-xl font-black text-gray-900">{groupName}</h3>
               <PencilIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="h-px bg-gray-50" />

          {/* Section: Message Settings */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[1.5px] ml-1">Thiết lập tin nhắn</h3>
            <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
               <ToggleRow 
                 icon={<BellAlertIcon className="w-6 h-6 text-black" />}
                 title="Làm nổi bật tin nhắn Admin"
                 description="Tin nhắn từ trưởng/phó nhóm sẽ được hiển thị đặc biệt"
                 value={isHighlightEnabled}
                 onChange={toggleHighlight}
               />
               <ToggleRow 
                 icon={<ClockIcon className="w-6 h-6 text-black" />}
                 title="Xem tin nhắn gần đây"
                 description="Thành viên mới được xem các tin nhắn cũ"
                 value={isHistoryVisible}
                 onChange={toggleHistory}
               />
            </div>
          </div>

          {/* Section: Privacy / Join Settings */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[1.5px] ml-1">Riêng tư & tham gia</h3>
            <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
               {/* Approval */}
               <ToggleRow 
                 icon={<ShieldCheckIcon className="w-6 h-6 text-black" />}
                 title="Phê duyệt thành viên"
                 description="Yêu cầu quản trị viên duyệt khi có người mới"
                 value={isApprovalRequired}
                 onChange={toggleApproval}
               />
               
               {/* Join Question - Only available if Approval is ON */}
               {isApprovalRequired && (
                 <div className="p-5 bg-white/50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-black flex items-center justify-center">
                             <DocumentTextIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[13px] font-bold text-gray-700">Câu hỏi tham gia</span>
                       </div>
                       <button
                         onClick={toggleQuestion}
                         disabled={updating}
                         className={`w-10 h-5 rounded-full transition-all relative ${isQuestionEnabled ? 'bg-black' : 'bg-gray-200'}`}
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
                          className="w-full bg-white border border-gray-100 rounded-2xl p-3 text-[13px] font-medium focus:ring-2 focus:ring-black/10 outline-none transition-all shadow-inner"
                          rows={2}
                        />
                        <p className="text-[10px] text-gray-400 font-medium italic">Tự động lưu khi bạn nhấn ra ngoài.</p>
                      </div>
                    )}
                 </div>
               )}

                {/* Join Link NavItem */}
                <button 
                  onClick={() => setShowLinkModal(true)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-black border border-gray-100 shadow-sm group-hover:bg-black group-hover:text-white transition-all">
                      <LinkIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-[15px] font-bold text-gray-800 tracking-tight">Link tham gia nhóm</p>
                      <p className="text-[11px] text-gray-400 font-medium">{isLinkEnabled ? "Đang bật" : "Đang tắt"}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                </button>

                {/* Blocked Members NavItem (Only for Admin) */}
                {isAdmin && (
                  <button 
                    onClick={() => setShowBlockedUsersModal(true)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-black border border-gray-100 shadow-sm group-hover:bg-black group-hover:text-white transition-all">
                        <NoSymbolIcon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-bold text-gray-800 tracking-tight">Danh sách bị chặn</p>
                        <p className="text-[11px] text-gray-400 font-medium">Người dùng bị cấm tham gia nhóm</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                  </button>
                )}
             </div>
          </div>

          {/* Section: Member Permissions */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[1.5px] ml-1">Quyền của thành viên</h3>
            <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
               <PermissionRow 
                 icon={<PencilIcon className="w-5 h-5" />}
                 title="Đổi thông tin nhóm"
                 value={permissions.editGroupInfo || "ADMIN"}
                 onChange={(val) => updatePermission('editGroupInfo', val)}
               />
               <PermissionRow 
                 icon={<DocumentTextIcon className="w-5 h-5" />}
                 title="Tạo ghi chú"
                 value={permissions.createNotes || "EVERYONE"}
                 onChange={(val) => updatePermission('createNotes', val)}
               />
               <PermissionRow 
                 icon={<CalendarDaysIcon className="w-5 h-5" />}
                 title="Tạo nhắc hẹn"
                 value={permissions.createReminders || "ADMIN"}
                 onChange={(val) => updatePermission('createReminders', val)}
               />
               <PermissionRow 
                 icon={<ChartBarIcon className="w-5 h-5" />}
                 title="Tạo bình chọn"
                 value={permissions.createPolls || "EVERYONE"}
                 onChange={(val) => updatePermission('createPolls', val)}
               />
               <PermissionRow 
                 icon={<MapPinIcon className="w-5 h-5" />}
                 title="Ghim tin nhắn"
                 value={permissions.pinMessages || "ADMIN"}
                 onChange={(val) => updatePermission('pinMessages', val)}
               />
               <PermissionRow 
                 icon={<PaperAirplaneIcon className="w-5 h-5" />}
                 title="Gửi tin nhắn"
                 value={permissions.sendMessage || "EVERYONE"}
                 onChange={(val) => updatePermission('sendMessage', val)}
               />
            </div>
          </div>

          {/* Section: Admin Actions */}
          {isAdmin && (
            <div className="space-y-4 pt-4">
               <div className="bg-red-50/30 rounded-3xl border border-red-100 overflow-hidden divide-y divide-red-50">
                  <button 
                    onClick={() => {
                        if (onDisbandGroup) onDisbandGroup();
                    }}
                    className="w-full flex items-center gap-4 p-5 hover:bg-red-50 transition active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-red-100/50 flex items-center justify-center text-red-500">
                       <TrashIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                       <p className="text-[15px] font-bold text-red-600">Giải tán nhóm</p>
                       <p className="text-[11px] text-red-400/70 font-medium">Xóa dữ liệu và mời tất cả thành viên ra</p>
                    </div>
                  </button>
               </div>
            </div>
          )}
        </div>

        <div className="px-6 py-5 bg-white border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-black text-white rounded-2xl font-black text-[14px] shadow-xl shadow-black/10 hover:bg-gray-900 active:scale-[0.98] transition-all"
          >
            ĐÓNG
          </button>
        </div>
      </div>

      {/* Transfer Leader Modal Overlay */}
      {showTransferLeader && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl flex flex-col h-[70vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                 <h3 className="text-lg font-black text-gray-900">Trưởng nhóm mới</h3>
                 <button onClick={() => setShowTransferLeader(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm"><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                  <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Chọn thành viên tiếp quản</p>
                  {members.filter(m => {
                    const leader = members.find(me => me.role?.toLowerCase() === 'leader');
                    return leader ? m.userId !== leader.userId : true;
                  }).map(m => (
                    <button 
                      key={m.userId}
                      onClick={() => setSelectedNewLeaderId(m.userId)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedNewLeaderId === m.userId ? 'border-black bg-gray-50 shadow-md' : 'border-gray-50 bg-white hover:border-gray-200'}`}
                    >
                       <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white overflow-hidden shadow-sm">
                          {m.user?.avatar ? <img src={getMediaUrl(m.user.avatar)} className="w-full h-full object-cover" /> : m.fullName?.charAt(0).toUpperCase()}
                       </div>
                       <div className="text-left flex-1">
                          <p className={`text-[15px] font-black ${selectedNewLeaderId === m.userId ? 'text-black' : 'text-gray-900'}`}>{m.fullName || m.user?.fullName || "Thành viên"}</p>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{m.role}</p>
                       </div>
                       {selectedNewLeaderId === m.userId && (
                         <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                           <CheckIcon className="w-4 h-4 text-white stroke-[3px]" />
                         </div>
                       )}
                    </button>
                 ))}
              </div>

              <div className="p-6 border-t border-gray-100">
                 <button
                    onClick={handleTransferLeader}
                    disabled={!selectedNewLeaderId || updating}
                    className={`w-full py-4 rounded-2xl font-black text-[14px] transition-all shadow-xl active:scale-[0.98] ${selectedNewLeaderId ? 'bg-red-500 text-white shadow-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                 >
                    XÁC NHẬN CHUYỂN QUYỀN
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Group Link & QR Modal Overlay (Parity with Mobile) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl flex flex-col h-[85vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                 <h3 className="text-lg font-black text-gray-900 text-center flex-1 ml-8">Link tham gia nhóm</h3>
                 <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm"><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
                 {/* Group Info Branding */}
                 <div className="mb-6 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[28px] bg-gray-900 border-4 border-white shadow-xl overflow-hidden mb-4">
                       {initialAvatar ? <img src={getMediaUrl(initialAvatar)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{groupName.charAt(0).toUpperCase()}</div>}
                    </div>
                    <h4 className="text-xl font-black text-gray-900">{groupName}</h4>
                    <p className="text-[13px] text-gray-400 font-medium mt-1 text-center px-4">Mời mọi người tham gia nhóm bằng mã QR hoặc link dưới đây</p>
                 </div>

                 {!isLinkEnabled ? (
                    <div className="w-full bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center text-center">
                       <LinkIcon className="w-12 h-12 text-gray-300 mb-4" />
                       <p className="text-[14px] font-bold text-gray-800 mb-2">Link tham gia đang tắt</p>
                       <p className="text-[12px] text-gray-400 mb-6">Bạn cần bật tính năng này để mọi người có thể tham gia qua link hoặc mã QR.</p>
                       <button 
                         onClick={toggleLink}
                         className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                       >
                         Bật tính năng link
                       </button>
                    </div>
                 ) : (
                    <>
                       {/* QR Code Section */}
                       <div className="bg-white p-5 rounded-[32px] shadow-2xl border border-gray-50 mb-8 animate-in zoom-in-95 duration-500">
                          <QRCode 
                            id="group-qr-code"
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
                       <div className="flex gap-4 w-full mb-10 shrink-0">
                          <button 
                            onClick={handleCopyLink}
                            className="flex-1 flex flex-col items-center gap-2 group"
                          >
                             <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
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
                            className="flex-1 flex flex-col items-center gap-2 group"
                          >
                             <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                <ShareIcon className="w-6 h-6" />
                             </div>
                             <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Chia sẻ</span>
                          </button>

                          <button 
                            onClick={handleSaveQR}
                            className="flex-1 flex flex-col items-center gap-2 group"
                          >
                             <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                             </div>
                             <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Lưu QR</span>
                          </button>
                       </div>

                       {/* Admin Privacy Settings */}
                       {isAdmin && (
                          <div className="w-full space-y-4 pt-6 border-t border-gray-50 shrink-0">
                             <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex-1 pr-4">
                                   <p className="text-[14px] font-black text-gray-800 tracking-tight">Xem lại tin nhắn cũ</p>
                                   <p className="text-[11px] text-gray-400 font-medium leading-tight">Thành viên mới được xem tin nhắn từ trước khi tham gia</p>
                                </div>
                                <button
                                  onClick={() => toggleHistory(!isHistoryVisible)}
                                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${isHistoryVisible ? 'bg-black' : 'bg-gray-200'}`}
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
      )}
      {/* Blocked Users Modal Overlay */}
      {showBlockedUsersModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl flex flex-col h-[70vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                 <h3 className="text-lg font-black text-gray-900">Danh sách bị chặn</h3>
                 <button onClick={() => setShowBlockedUsersModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm"><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {loadingBlocked ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                       <div className="w-8 h-8 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                       <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Đang tải...</p>
                    </div>
                  ) : blockedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                       <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4">
                          <NoSymbolIcon className="w-10 h-10" />
                       </div>
                       <p className="text-[15px] font-bold text-gray-800">Không có ai bị chặn</p>
                       <p className="text-[12px] text-gray-400 mt-1">Danh sách các thành viên đã bị Admin mời ra khỏi nhóm và chặn tham gia lại sẽ hiện ở đây.</p>
                    </div>
                  ) : (
                    blockedMembers.map(m => (
                      <div 
                        key={m.userId}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-50 bg-white hover:bg-gray-50 transition-all group"
                      >
                         <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white overflow-hidden shadow-sm">
                            {m.avatar ? <img src={getMediaUrl(m.avatar)} className="w-full h-full object-cover" /> : m.name?.charAt(0).toUpperCase()}
                         </div>
                         <div className="text-left flex-1 min-w-0">
                            <p className="text-[15px] font-black text-gray-900 truncate">{m.name || "Thành viên"}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Bị chặn vào {new Date(m.removedAt).toLocaleDateString('vi-VN')}</p>
                         </div>
                         <button 
                           onClick={() => handleUnblockMember(m.userId)}
                           className="px-4 py-2 bg-black text-white text-[11px] font-black rounded-xl shadow-sm hover:bg-gray-800 active:scale-95 transition-all uppercase tracking-wider"
                         >
                            Gỡ chặn
                         </button>
                      </div>
                    ))
                  )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                 <button
                    onClick={() => setShowBlockedUsersModal(false)}
                    className="w-full py-4 bg-white border border-gray-100 rounded-2xl font-black text-[14px] text-gray-900 shadow-sm active:scale-[0.98] transition-all"
                 >
                    QUAY LẠI
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

/* --- Internal Helpers --- */

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, title, description, value, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-5">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-[15px] font-bold text-gray-800 tracking-tight">{title}</p>
          {description && <p className="text-[11px] text-gray-400 font-medium max-w-[200px]">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-black' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

interface PermissionRowProps {
  icon: React.ReactNode;
  title: string;
  value: "EVERYONE" | "ADMIN";
  onChange: (val: "EVERYONE" | "ADMIN") => void;
}

function PermissionRow({ icon, title, value, onChange }: PermissionRowProps) {
  return (
    <div className="flex items-center justify-between p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white border border-gray-50 rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:text-black">
           {icon}
        </div>
        <span className="text-[14px] font-bold text-gray-700">{title}</span>
      </div>
      
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 ring-1 ring-gray-200 shadow-inner">
         <button 
           onClick={() => onChange("EVERYONE")}
           className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${value === "EVERYONE" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
         >
           Tất cả
         </button>
         <button 
           onClick={() => onChange("ADMIN")}
           className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${value === "ADMIN" ? "bg-white text-red-500 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
         >
           Admin
         </button>
      </div>
    </div>
  );
}
