"use client";
import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  BellIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import MemberApprovalModal from "./MemberApprovalModal";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import { contactService } from "@/services/contactService";
import { toast } from "sonner";
import { getMediaUrl } from "../../../utils/media";
import FriendProfileModal from "../FriendProfileModal";

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  members: any[];
  currentUser: any;
  userCache?: Record<string, { name: string; avatar: string }>;
  onRefreshData?: () => void;
  onOpenAddMember: () => void;
}

export default function MemberManagementModal({
  isOpen,
  onClose,
  conversationId,
  members,
  currentUser,
  userCache = {},
  onRefreshData,
  onOpenAddMember,
}: MemberManagementModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "managers">("all");
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  
  // Friendship state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const myMember = members.find(m => m.userId === myId);
  const myRole = myMember?.role?.toLowerCase() || 'member';
  const isAdmin = myRole === 'leader';
  const isDeputy = myRole === 'deputy';
  const isManager = isAdmin || isDeputy;

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const name = m.user?.fullName || userCache[m.userId]?.name || "Thành viên";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === "managers") {
        return matchesSearch && (m.role?.toLowerCase() === "leader" || m.role?.toLowerCase() === "deputy");
      }
      return matchesSearch;
    });
  }, [members, searchQuery, activeTab, userCache]);

  React.useEffect(() => {
    if (!conversationId || !isManager) return;

    // Check for pending requests initially
    const checkRequests = async () => {
      try {
        const reqs = await groupService.getJoinRequests(conversationId);
        setHasPendingRequests(Array.isArray(reqs) && reqs.length > 0);
      } catch (err) {
        console.error("Error checking join requests:", err);
      }
    };
    checkRequests();

    const unsubJoin = socketService.onNewJoinRequest((data: { groupId: string }) => {
      if (String(data.groupId) === String(conversationId)) {
        setHasPendingRequests(true);
      }
    });

    const unsubUpdate = socketService.onGroupUpdated((data: any) => {
       const updatedId = data._id || data.conversationId || data.id;
       if (String(updatedId) === String(conversationId)) {
         checkRequests();
       }
    });

    return () => {
      unsubJoin();
      unsubUpdate();
    };
  }, [conversationId, isManager]);

  // Fetch friendship data when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchFriendshipData = async () => {
      setFriendshipLoading(true);
      try {
        const [friends, sent, pending] = await Promise.all([
          contactService.getFriendsList(),
          contactService.getSentRequests(),
          contactService.getPendingRequests()
        ]);
        setFriendsList(friends);
        setSentRequests(sent);
        setPendingRequests(pending);
      } catch (err) {
        console.error("Error fetching friendship data:", err);
      } finally {
        setFriendshipLoading(false);
      }
    };

    fetchFriendshipData();
  }, [isOpen]);

  const getRelationStatus = (userId: string) => {
    if (friendsList.some(f => f.requesterId === userId || f.recipientId === userId)) return "ACCEPTED";
    if (sentRequests.some(r => r.recipientId === userId)) return "I_SENT_REQUEST";
    if (pendingRequests.some(r => r.requesterId === userId)) return "THEY_SENT_REQUEST";
    return "NOT_FRIEND";
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await contactService.sendFriendRequest(userId);
      toast.success("Đã gửi lời mời kết bạn");
      // Cập nhật local state để UI thay đổi ngay
      setSentRequests(prev => [...prev, { recipientId: userId, status: 'PENDING' }]);
      
      // [REALTIME]
      socketService.emitFriendRequestSent({
        recipientId: userId,
        requesterName: currentUser?.fullName || "Ai đó",
        requesterAvatar: currentUser?.avatar
      });
    } catch (err) {
      toast.error("Không thể gửi lời mời kết bạn");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await groupService.updateRole(conversationId, userId, newRole);
      toast.success("Đã cập nhật quyền thành viên");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Không thể cập nhật quyền");
    }
  };

  const handleRemoveMember = async (userId: string, isBanned: boolean = false) => {
    const confirmMsg = isBanned 
      ? "Bạn có chắc chắn muốn mời thành viên này ra khỏi nhóm và CHẶN không cho tham gia lại?" 
      : "Bạn có chắc chắn muốn mời thành viên này ra khỏi nhóm?";
      
    if (!confirm(confirmMsg)) return;
    try {
      await groupService.removeMember(conversationId, userId, { isBanned });
      toast.success(isBanned ? "Đã mời ra và chặn thành viên" : "Đã mời thành viên ra khỏi nhóm");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error(isBanned ? "Không thể chặn thành viên" : "Không thể xóa thành viên");
    }
  };

  const handleAssignLeader = async (userId: string) => {
    if (!confirm("Bạn có chắc chắn muốn chuyển quyền trưởng nhóm? Bạn sẽ trở thành thành viên thường.")) return;
    try {
      await groupService.assignLeader(conversationId, userId);
      toast.success("Đã chuyển quyền trưởng nhóm");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error("Không thể chuyển quyền trưởng nhóm");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Thành viên</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {members.length} người tham gia
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddMember}
              className="p-2 hover:bg-gray-100 text-black rounded-full transition-all"
              title="Thêm thành viên"
            >
              <UserPlusIcon className="w-6 h-6" />
            </button>
            {isManager && (
              <button
                onClick={() => {
                  setShowApprovalModal(true);
                  setHasPendingRequests(false);
                }}
                className="p-2 hover:bg-gray-50 text-gray-700 rounded-full transition-all relative"
                title="Duyệt thành viên"
              >
                <ShieldCheckIcon className="w-6 h-6" />
                {hasPendingRequests && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black/10 transition"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-gray-50 bg-white">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-3 text-[13px] font-black tracking-tight transition-all relative ${
              activeTab === "all" ? "text-black" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Tất cả
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("managers")}
            className={`px-4 py-3 text-[13px] font-black tracking-tight transition-all relative ${
              activeTab === "managers" ? "text-black" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Trưởng & Phó nhóm
            {activeTab === "managers" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t-full" />}
          </button>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((m) => {
              const name = m.user?.fullName || userCache[m.userId]?.name || "Thành viên";
              const avatar = m.user?.avatar || userCache[m.userId]?.avatar;
              const role = m.role?.toLowerCase();
              const isMe = m.userId === myId;

              return (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition group relative cursor-pointer"
                  onClick={() => setSelectedProfileId(m.userId)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                    {avatar ? (
                      <img src={getMediaUrl(avatar)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-gray-400">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-gray-900 truncate">
                        {name} {isMe && "(Bạn)"}
                      </span>
                      {role === 'leader' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-black text-[10px] font-black uppercase rounded-lg border border-gray-200 ring-1 ring-black/10">
                          Trưởng nhóm
                        </span>
                      )}
                      {role === 'deputy' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-black text-[10px] font-black uppercase rounded-lg border border-gray-200 ring-1 ring-black/10">
                          Phó nhóm
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                      {role === 'leader' ? 'Quyền cao nhất' : role === 'deputy' ? 'Ban quản trị' : 'Thành viên'}
                    </p>
                  </div>

                  {/* Add Friend Quick Action */}
                  {!isMe && !friendshipLoading && getRelationStatus(m.userId) === "NOT_FRIEND" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFriend(m.userId);
                      }}
                      className="p-2 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition-colors mr-1"
                      title="Kết bạn"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                    </button>
                  )}

                  {!isMe && getRelationStatus(m.userId) === "I_SENT_REQUEST" && (
                    <span className="text-[10px] font-black text-black uppercase tracking-tight bg-gray-100 px-2 py-1 rounded-lg mr-1">
                      Đã gửi
                    </span>
                  )}

                  {!isMe && getRelationStatus(m.userId) === "THEY_SENT_REQUEST" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Mở profile để họ nhấn Accept hoặc có thể thêm handleAccept nhanh ở đây
                        setSelectedProfileId(m.userId);
                      }}
                      className="p-2 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition-colors mr-1"
                      title="Chấp nhận kết bạn"
                    >
                      <UserPlusIcon className="w-5 h-5 text-green-600" />
                    </button>
                  )}

                  {/* Actions Ellipsis */}
                  {!isMe && (isAdmin || (isDeputy && role === 'member')) && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMemberMenu(activeMemberMenu === m.userId ? null : m.userId)}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition text-gray-400 hover:text-gray-600"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>

                      {activeMemberMenu === m.userId && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMemberMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => { handleAssignLeader(m.userId); setActiveMemberMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <UserIcon className="w-4 h-4 text-black" />
                                  Chuyển trưởng nhóm
                                </button>
                                <button
                                  onClick={() => { handleUpdateRole(m.userId, role === 'deputy' ? 'MEMBER' : 'DEPUTY'); setActiveMemberMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {role === 'deputy' ? (
                                    <>
                                      <ChevronDownIcon className="w-4 h-4 text-black" />
                                      Gỡ phó nhóm
                                    </>
                                  ) : (
                                    <>
                                      <ChevronUpIcon className="w-4 h-4 text-black" />
                                      Thêm phó nhóm
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={() => { handleRemoveMember(m.userId); setActiveMemberMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Mời ra khỏi nhóm
                            </button>

                            <button
                              onClick={() => { handleRemoveMember(m.userId, true); setActiveMemberMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <NoSymbolIcon className="w-4 h-4" />
                              Mời ra & Chặn
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-[14px] font-black text-gray-400 italic">Không tìm thấy thành viên</p>
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mt-1">Vui lòng thử từ khóa khác</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-900 text-white text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition shadow-lg shadow-black/10 active:scale-95"
           >
             Đóng
           </button>
        </div>
      </div>

      {showApprovalModal && (
        <MemberApprovalModal
          groupId={conversationId}
          onClose={() => setShowApprovalModal(false)}
        />
      )}

      {selectedProfileId && (
        <FriendProfileModal
          isOpen={!!selectedProfileId}
          userId={selectedProfileId}
          relationStatus={getRelationStatus(selectedProfileId)}
          onClose={() => setSelectedProfileId(null)}
          onActionSuccess={() => {
            // Refresh friendship data
            const fetchFriendshipData = async () => {
              try {
                const [friends, sent, pending] = await Promise.all([
                  contactService.getFriendsList(),
                  contactService.getSentRequests(),
                  contactService.getPendingRequests()
                ]);
                setFriendsList(friends);
                setSentRequests(sent);
                setPendingRequests(pending);
              } catch (err) {}
            };
            fetchFriendshipData();
          }}
        />
      )}
    </div>
  );
}
