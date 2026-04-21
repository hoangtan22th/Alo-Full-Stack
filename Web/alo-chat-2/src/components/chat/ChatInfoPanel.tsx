import React, { useState, useMemo } from "react";
import {
  UserIcon,
  BellIcon,
  EllipsisHorizontalIcon,
  FolderIcon,
  NoSymbolIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ClockIcon,
  EyeSlashIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PencilIcon,
  CameraIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { MessageDTO } from "@/services/messageService";
import AddMemberModal from "../ui/group/AddMemberModal";
import PollModal from "../ui/group/PollModal";
import NoteModal from "../ui/group/NoteModal";
import ReminderModal from "../ui/group/ReminderModal";
import JoinLinkModal from "../ui/group/JoinLinkModal";
import MemberManagementModal from "../ui/group/MemberManagementModal";
import GroupSettingsModal from "../ui/group/GroupSettingsModal";
import { groupService } from "@/services/groupService";
import { toast } from "sonner";
import { getMediaUrl } from "../../utils/media";

interface ChatInfoPanelProps {
  show: boolean;
  conversationId: string;
  conversationInfo: any;
  messages: MessageDTO[];
  currentUser: any;
  onClose: () => void;
  onClearHistory: () => void;
  onLeaveGroup: () => void;
  onDisbandGroup?: () => void;
  onViewAllMedia?: () => void;
  onViewAllFiles?: () => void;
  onRemoveMember: (userId: string) => void;
  onUpdateRole: (userId: string, role: string) => void;
  onAssignLeader: (userId: string) => void;
  onRefreshData?: () => void;
  userCache?: Record<string, { name: string; avatar: string }>;
}

const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  show,
  conversationId,
  conversationInfo,
  messages,
  currentUser,
  onClose,
  onClearHistory,
  onLeaveGroup,
  onDisbandGroup,
  onViewAllMedia,
  onViewAllFiles,
  onRemoveMember,
  onUpdateRole,
  onAssignLeader,
  onRefreshData,
  userCache = {},
}) => {
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showJoinLinkModal, setShowJoinLinkModal] = useState(false);
  const [showMemberManagementModal, setShowMemberManagementModal] =
    useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);

  // Group Info Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const isGroup = conversationInfo?.isGroup;

  // Lấy role của user hiện tại trong nhóm
  const currentUserRole = useMemo(() => {
    if (!isGroup) return null;
    return conversationInfo?.members
      ?.find((m: any) => m.userId === myId)
      ?.role?.toLowerCase();
  }, [isGroup, conversationInfo, myId]);

  const isAdmin = currentUserRole === "leader";
  const isDeputy = currentUserRole === "deputy";
  const isManager = isAdmin || isDeputy;

  // Quyền hạn giống mobile
  const permissions = conversationInfo?.permissions;
  const canEdit =
    isGroup && (isManager || permissions?.editGroupInfo === "EVERYONE");
  const canCreatePoll =
    isGroup && (isManager || permissions?.createPolls === "EVERYONE");
  const canCreateNote =
    isGroup && (isManager || permissions?.createNotes === "EVERYONE");
  const canCreateReminder =
    isGroup && (isManager || permissions?.createReminders === "EVERYONE");

  const handleUpdateName = async () => {
    if (!tempName.trim() || tempName === conversationInfo?.displayName) {
      setIsEditingName(false);
      return;
    }
    try {
      await groupService.updateGroup(conversationId, tempName.trim());
      toast.success("Đã cập nhật tên nhóm");
      setIsEditingName(false);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Không thể cập nhật tên nhóm");
    }
  };

  const handleAvatarClick = () => {
    if (isGroup && canEdit) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await groupService.updateGroup(conversationId, undefined, file);
      toast.success("Đã cập nhật ảnh đại diện nhóm");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      toast.error("Không thể cập nhật ảnh đại diện");
    }
  };

  // Lọc media (ảnh/video)
  const mediaList = useMemo(() => {
    const list: any[] = [];
    messages.forEach((m) => {
      if (m.type === "image") {
        if (m.metadata?.imageGroup) {
          list.push(
            ...m.metadata.imageGroup
              .filter((img: any) => !img.isRevoked)
              .map((img: any) => ({ ...img, createdAt: m.createdAt })),
          );
        } else {
          list.push({
            url: m.content,
            fileName: m.metadata?.fileName,
            createdAt: m.createdAt,
          });
        }
      }
    });
    // Sắp xếp mới nhất lên đầu và lấy 5 cái
    return list
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [messages]);

  // Lọc file
  const fileList = useMemo(() => {
    return messages
      .filter((m) => m.type === "file")
      .slice(-4)
      .reverse();
  }, [messages]);

  if (!show) return null;

  return (
    <div
      className={`flex flex-col shrink-0 bg-white h-full transition-all duration-300 ease-in-out border-l border-gray-100 shadow-xl z-[100] overflow-hidden ${
        show ? "w-[340px] xl:w-90 opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex justify-end border-b border-gray-50">
          {/* <h2 className="text-[16px] font-black text-gray-900 tracking-tight">Thông tin (Debug: {messages.length})</h2> */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Profile Section */}
          <div className="flex flex-col items-center pt-8 pb-6 border-b border-gray-50">
            <div className="relative mb-4 group">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div
                onClick={handleAvatarClick}
                className={`relative cursor-pointer transition-transform duration-300 ${isGroup && canEdit ? "hover:scale-105 active:scale-95" : ""}`}
              >
                {conversationInfo?.displayAvatar ? (
                  <img
                    src={getMediaUrl(conversationInfo.displayAvatar)}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-1 ring-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl border-4 border-white shadow-xl">
                    {(conversationInfo?.displayName || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                {isGroup && canEdit && (
                  <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-500 hover:text-blue-600 transition">
                    <CameraIcon className="w-4 h-4" />
                  </button>
                )}
                {!isGroup && (
                  <div className="absolute bottom-1 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 group px-6 text-center">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                    onBlur={handleUpdateName}
                    className="w-full bg-gray-50 border-none rounded-lg px-3 py-1 text-[18px] font-black text-gray-900 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 max-w-full">
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight truncate">
                    {conversationInfo?.displayName || "..."}
                  </h2>
                  {isGroup && canEdit && (
                    <button
                      onClick={() => {
                        setTempName(conversationInfo?.displayName || "");
                        setIsEditingName(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition text-gray-300 hover:text-blue-500 flex-shrink-0"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-[12px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
              {isGroup
                ? `${conversationInfo?.members?.length ?? 0} thành viên`
                : "Đang hoạt động"}
            </p>

            {/* Quick Actions */}
            <div className="flex items-center gap-4 mt-7">
              <ActionButton icon={<BellSlashIcon />} label="Tắt báo" />
              <ActionButton icon={<MapPinIcon />} label="Ghim" />
              <ActionButton icon={<MagnifyingGlassIcon />} label="Tìm kiếm" />
              {isGroup ? (
                <ActionButton
                  icon={<UserGroupIcon />}
                  label="Thành viên"
                  onClick={() => setShowMemberManagementModal(true)}
                />
              ) : (
                <ActionButton icon={<UserGroupIcon />} label="Nhóm chung" />
              )}
            </div>
          </div>

          {/* Media / Video Section */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Ảnh / Video
              </h3>
              <button
                onClick={onViewAllMedia}
                className="text-[12px] font-black text-blue-600 hover:underline"
              >
                Xem tất cả
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {mediaList.length > 0 ? (
                <>
                  {mediaList.slice(0, 5).map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-50 group cursor-pointer shadow-sm"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        alt="Media"
                      />
                    </div>
                  ))}
                  {mediaList.length > 5 && (
                    <div
                      onClick={onViewAllMedia}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-200 border border-gray-50 group cursor-pointer relative shadow-sm"
                    >
                      <img
                        src={getMediaUrl(mediaList[5].url)}
                        className="w-full h-full object-cover blur-[2px] opacity-50"
                        alt="More Media"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-black text-[16px]">
                        +{mediaList.length - 5}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-3 py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <PhotoIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400 font-bold italic">
                    Chưa có ảnh/video
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Shared Files */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                File đã chia sẻ
              </h3>
              <button
                onClick={onViewAllFiles}
                className="text-[12px] font-black text-blue-600 hover:underline"
              >
                Xem tất cả
              </button>
            </div>
            <div className="space-y-3">
              {fileList.length > 0 ? (
                fileList.slice(0, 3).map((m) => (
                  <a
                    key={m._id}
                    href={getMediaUrl(m.content)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-white transition group shadow-sm active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-blue-500 group-hover:text-white group-hover:bg-blue-600 transition shadow-sm">
                      {m.metadata?.fileType?.includes("pdf") ? (
                        <DocumentTextIcon className="w-5 h-5" />
                      ) : (
                        <TableCellsIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black text-gray-900 truncate tracking-tight">
                        {m.metadata?.fileName || "File"}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {m.metadata?.fileSize
                          ? (m.metadata.fileSize / (1024 * 1024)).toFixed(1) +
                            " MB"
                          : "0 MB"}{" "}
                        •{" "}
                        {new Date(m.createdAt || "").toLocaleDateString(
                          "vi-VN",
                        )}
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                <div className="py-6 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <p className="text-[12px] text-gray-400 font-bold italic">
                    Chưa có file nào
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: TIỆN ÍCH NHÓM */}
          {isGroup && (
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Tiện ích nhóm
              </h3>
              <div className="space-y-1">
                <SettingItem
                  icon={<ChartBarIcon />}
                  label="Bình chọn"
                  onClick={() => setShowPollModal(true)}
                />
                <SettingItem
                  icon={<DocumentTextIcon />}
                  label="Ghi chú"
                  onClick={() => setShowNoteModal(true)}
                />
                <SettingItem
                  icon={<ClockIcon />}
                  label="Nhắc hẹn"
                  onClick={() => setShowReminderModal(true)}
                />
              </div>
            </div>
          )}

          {/* SECTION: THÔNG TIN KHÁC */}
          {isGroup && (
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Thông tin khác
              </h3>
              <div className="space-y-1">
                {isManager && (
                  <SettingItem 
                    icon={<Cog6ToothIcon />} 
                    label="Cài đặt nhóm" 
                    onClick={() => setShowGroupSettingsModal(true)}
                  />
                )}
                <SettingItem
                  icon={<LinkIcon />}
                  label="Link tham gia nhóm"
                  onClick={() => setShowJoinLinkModal(true)}
                />
              </div>
            </div>
          )}

          {/* Settings & Danger Zone */}
          <div className="p-6 pb-12 space-y-1">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Cài đặt & Bảo mật
            </h3>

            <SettingItem
              icon={<ClockIcon />}
              label="Tin nhắn tự xóa"
              value="Tắt"
            />
            <SettingItem icon={<EyeSlashIcon />} label="Ẩn trò chuyện" />
            <div className="pt-4 mt-4 border-t border-gray-50 space-y-1">
              <SettingItem
                icon={<TrashIcon />}
                label="Xóa lịch sử trò chuyện"
                isDanger
                onClick={onClearHistory}
              />
              {isGroup && (
                <>
                  <SettingItem
                    icon={<ArrowRightOnRectangleIcon />}
                    label="Rời khỏi nhóm"
                    isDanger
                    onClick={onLeaveGroup}
                  />
                  {isAdmin && (
                    <SettingItem
                      icon={<XMarkIcon />}
                      label="Giải tán nhóm"
                      isDanger
                      onClick={onDisbandGroup}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddMemberModal && (
        <AddMemberModal
          groupId={conversationId}
          currentMembers={conversationInfo?.members || []}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {showPollModal && (
        <PollModal
          conversationId={conversationId}
          onClose={() => setShowPollModal(false)}
        />
      )}

      {showNoteModal && (
        <NoteModal
          conversationId={conversationId}
          onClose={() => setShowNoteModal(false)}
        />
      )}

      {showReminderModal && (
        <ReminderModal
          conversationId={conversationId}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {showJoinLinkModal && (
        <JoinLinkModal
          isOpen={showJoinLinkModal}
          groupId={conversationId}
          groupName={conversationInfo?.displayName || "Nhóm"}
          groupAvatar={conversationInfo?.displayAvatar}
          isHistoryVisible={conversationInfo?.isHistoryVisible}
          currentUserName={currentUser?.fullName}
          isManager={isManager}
          onClose={() => setShowJoinLinkModal(false)}
        />
      )}

      {showMemberManagementModal && (
        <MemberManagementModal
          isOpen={showMemberManagementModal}
          conversationId={conversationId}
          members={conversationInfo?.members || []}
          currentUser={currentUser}
          userCache={userCache}
          onClose={() => setShowMemberManagementModal(false)}
          onRefreshData={onRefreshData}
          onOpenAddMember={() => {
            setShowMemberManagementModal(false);
            setShowAddMemberModal(true);
          }}
        />
      )}

      {showGroupSettingsModal && (
        <GroupSettingsModal
          groupId={conversationId}
          groupName={conversationInfo?.displayName || "Nhóm"}
          groupAvatar={conversationInfo?.displayAvatar}
          isApprovalRequired={conversationInfo?.isApprovalRequired || false}
          isLinkEnabled={conversationInfo?.isLinkEnabled || false}
          isHistoryVisible={conversationInfo?.isHistoryVisible}
          isHighlightEnabled={conversationInfo?.isHighlightEnabled}
          permissions={conversationInfo?.permissions}
          isQuestionEnabled={conversationInfo?.isQuestionEnabled}
          membershipQuestion={conversationInfo?.membershipQuestion}
          members={conversationInfo?.members || []}
          currentUserName={currentUser?.fullName}
          currentUserRole={currentUserRole}
          onClose={() => setShowGroupSettingsModal(false)}
          onRefreshData={onRefreshData}
          onDisbandGroup={onDisbandGroup}
        />
      )}
    </div>
  );
};

/* --- Sub-components --- */

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}> = ({ icon, label, onClick }) => (
  <div
    className="flex flex-col items-center gap-1.5 cursor-pointer group"
    onClick={onClick}
  >
    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition shadow-sm ring-1 ring-gray-100">
      {React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<any>, {
            className: "w-5 h-5",
          })
        : icon}
    </div>
    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">
      {label}
    </span>
  </div>
);

const SettingItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  isDanger?: boolean;
  onClick?: () => void;
}> = ({ icon, label, value, isDanger, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 -mx-3 rounded-2xl hover:bg-gray-50 transition group active:scale-[0.98]"
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-sm ${isDanger ? "bg-red-50 text-red-500 group-hover:bg-red-600 group-hover:text-white" : "bg-white text-gray-500 group-hover:bg-blue-600 group-hover:text-white border border-gray-100"}`}
      >
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<any>, {
              className: "w-5 h-5",
            })
          : icon}
      </div>
      <span
        className={`text-[13px] font-black tracking-tight ${isDanger ? "text-red-500 group-hover:text-red-600" : "text-gray-700 group-hover:text-blue-600"}`}
      >
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      {value && (
        <span className="text-[12px] font-bold text-gray-400">{value}</span>
      )}
      <ChevronRightIcon
        className={`w-4 h-4 ${isDanger ? "text-red-300" : "text-gray-300 group-hover:text-blue-300"}`}
      />
    </div>
  </button>
);

export default ChatInfoPanel;
