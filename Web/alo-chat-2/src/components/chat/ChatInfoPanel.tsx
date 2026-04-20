import React, { useState, useMemo } from 'react';
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
} from '@heroicons/react/24/outline';
import { MessageDTO } from '@/services/messageService';
import AddMemberModal from '../ui/group/AddMemberModal';

const getMediaUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const backendHost =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
    "http://localhost:8888";
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);
  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const isGroup = conversationInfo?.isGroup;
  
  // Lấy role của user hiện tại trong nhóm
  const currentUserRole = useMemo(() => {
    if (!isGroup) return null;
    return conversationInfo?.members?.find((m: any) => m.userId === myId)?.role?.toLowerCase();
  }, [isGroup, conversationInfo, myId]);

  const isAdmin = currentUserRole === 'leader';

  // Lọc media (ảnh/video)
  const mediaList = useMemo(() => {
    const list: any[] = [];
    messages.forEach(m => {
      if (m.type === 'image') {
        if (m.metadata?.imageGroup) {
          list.push(...m.metadata.imageGroup.filter((img: any) => !img.isRevoked));
        } else {
          list.push({ url: m.content, fileName: m.metadata?.fileName });
        }
      }
    });
    return list.slice(0, 6); // Lấy 6 cái mới nhất
  }, [messages]);

  // Lọc file
  const fileList = useMemo(() => {
    return messages
      .filter(m => m.type === 'file')
      .slice(-4)
      .reverse();
  }, [messages]);

  if (!show) return null;

  return (
    <div
      className={`flex flex-col shrink-0 bg-white h-full transition-all duration-300 ease-in-out border-l border-gray-100 shadow-xl z-20 overflow-hidden ${
        show ? "w-[340px] xl:w-90 opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight">Thông tin</h2>
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
              {conversationInfo?.displayAvatar ? (
                <img
                  src={getMediaUrl(conversationInfo.displayAvatar)}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-1 ring-gray-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl border-4 border-white shadow-xl">
                  {(conversationInfo?.displayName || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {isGroup && (
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-500 hover:text-blue-600 transition scale-0 group-hover:scale-100 duration-200">
                  <CameraIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 group cursor-pointer">
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight">
                {conversationInfo?.displayName || "..."}
              </h2>
              {isGroup && <PencilIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition" />}
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
              {isGroup && (
                <ActionButton 
                  icon={<UserGroupIcon />} 
                  label="Thêm" 
                  onClick={() => setShowAddMemberModal(true)}
                />
              )}
            </div>
          </div>

          {/* Members (Collapsible for Groups) */}
          {isGroup && (
            <div className="border-b border-gray-50">
              <button 
                onClick={() => setShowMembers(!showMembers)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-[14px] font-black text-gray-900">Thành viên nhóm</span>
                </div>
                {showMembers ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
              </button>
              
              {showMembers && (
                <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  {conversationInfo?.members?.map((m: any) => (
                    <div key={m.userId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {(m.user?.avatar || userCache[m.userId]?.avatar) ? (
                          <img 
                            src={getMediaUrl(m.user?.avatar || userCache[m.userId]?.avatar)} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            {(m.user?.fullName || userCache[m.userId]?.name || "?").charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">
                          {m.user?.fullName || userCache[m.userId]?.name || "Thành viên"}
                        </p>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                          {m.role?.toLowerCase() === 'leader' ? 'Trưởng nhóm' : m.role?.toLowerCase() === 'deputy' ? 'Phó nhóm' : 'Thành viên'}
                        </p>
                      </div>

                      {/* Member Actions Menu */}
                      {isGroup && m.userId !== myId && (isAdmin || currentUserRole === 'deputy') && (
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMemberMenu(activeMemberMenu === m.userId ? null : m.userId);
                            }}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                          >
                            <EllipsisHorizontalIcon className="w-5 h-5" />
                          </button>

                          {activeMemberMenu === m.userId && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveMemberMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                {/* Leader specific actions */}
                                {isAdmin && (
                                  <>
                                    <button 
                                      onClick={() => { onAssignLeader(m.userId); setActiveMemberMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <UserIcon className="w-4 h-4 text-blue-500" />
                                      Chuyển trưởng nhóm
                                    </button>
                                    <button 
                                      onClick={() => { onUpdateRole(m.userId, m.role?.toLowerCase() === 'deputy' ? 'MEMBER' : 'DEPUTY'); setActiveMemberMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      {m.role?.toLowerCase() === 'deputy' ? (
                                        <>
                                          <ChevronDownIcon className="w-4 h-4 text-orange-500" />
                                          Gỡ phó nhóm
                                        </>
                                      ) : (
                                        <>
                                          <ChevronUpIcon className="w-4 h-4 text-green-500" />
                                          Thêm phó nhóm
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                                
                                {/* Kick action (Leader can kick anyone, Deputy can only kick Members) */}
                                {(isAdmin || (currentUserRole === 'deputy' && m.role?.toLowerCase() === 'member')) && (
                                  <button 
                                    onClick={() => { onRemoveMember(m.userId); setActiveMemberMenu(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Mời ra khỏi nhóm
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Media / Video Section */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ảnh / Video</h3>
              <button onClick={onViewAllMedia} className="text-[12px] font-black text-blue-600 hover:underline">Xem tất cả</button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {mediaList.length > 0 ? (
                mediaList.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-50 group cursor-pointer">
                    <img 
                      src={getMediaUrl(img.url)} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      alt="Media"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-4 text-center">
                  <PhotoIcon className="w-8 h-8 text-gray-100 mx-auto mb-1" />
                  <p className="text-[12px] text-gray-300 font-medium italic">Trống</p>
                </div>
              )}
            </div>
          </div>

          {/* Shared Files */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">File đã chia sẻ</h3>
              <button onClick={onViewAllFiles} className="text-[12px] font-black text-blue-600 hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-3">
              {fileList.length > 0 ? (
                fileList.map((m) => (
                  <a
                    key={m._id}
                    href={getMediaUrl(m.content)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition">
                      {m.metadata?.fileType?.includes('pdf') ? <DocumentTextIcon className="w-5 h-5" /> : <TableCellsIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                        {m.metadata?.fileName || "File"}
                      </p>
                      <p className="text-[11px] font-medium text-gray-400">
                        {m.metadata?.fileSize ? (m.metadata.fileSize / 1024).toFixed(1) + ' KB' : '0 KB'} • {new Date(m.createdAt || "").toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-[12px] text-gray-300 font-medium italic py-2">Chưa có file nào</p>
              )}
            </div>
          </div>

          {/* Settings & Danger Zone */}
          <div className="p-6 space-y-1">
             <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Cài đặt & Bảo mật</h3>
             
             <SettingItem 
              icon={<ClockIcon />} 
              label="Tin nhắn tự xóa" 
              value="Tắt" 
             />
             <SettingItem 
              icon={<EyeSlashIcon />} 
              label="Ẩn trò chuyện" 
             />
             <div className="pt-4 mt-4 border-t border-gray-50 space-y-1">
               <SettingItem 
                icon={<TrashIcon className="text-red-500" />} 
                label="Xóa lịch sử trò chuyện" 
                isDanger 
                onClick={onClearHistory}
               />
               {isGroup && (
                 <>
                   <SettingItem 
                    icon={<ArrowRightOnRectangleIcon className="text-red-500" />} 
                    label="Rời khỏi nhóm" 
                    isDanger 
                    onClick={onLeaveGroup}
                   />
                   {isAdmin && (
                     <SettingItem 
                      icon={<XMarkIcon className="text-red-600" />} 
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
    </div>
  );
};

/* --- Sub-components --- */

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onClick}>
    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition shadow-sm ring-1 ring-gray-100">
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" }) : icon}
    </div>
    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">{label}</span>
  </div>
);

const SettingItem: React.FC<{ icon: React.ReactNode; label: string; value?: string; isDanger?: boolean; onClick?: () => void }> = ({ icon, label, value, isDanger, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-gray-50 transition group"
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${isDanger ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-gray-50 text-gray-500 group-hover:bg-white group-hover:shadow-sm group-hover:ring-1 group-hover:ring-gray-100'}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" }) : icon}
      </div>
      <span className={`text-[13px] font-bold ${isDanger ? 'text-red-500' : 'text-gray-700'}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[12px] font-bold text-gray-400">{value}</span>}
      <ChevronRightIcon className={`w-3.5 h-3.5 ${isDanger ? 'text-red-300' : 'text-gray-300'}`} />
    </div>
  </button>
);

export default ChatInfoPanel;
