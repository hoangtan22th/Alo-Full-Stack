"use client";
import { useEffect, useState, useCallback } from "react";
import { 
  EnvelopeOpenIcon, 
  CheckIcon, 
  XMarkIcon, 
  UserGroupIcon, 
  PaperAirplaneIcon, 
  PlusIcon,
  BellIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { groupService } from "@/services/groupService";
import { getMediaUrl } from "@/utils/media";
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";

export default function GroupInvitePage() {
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [sentJoinRequests, setSentJoinRequests] = useState<any[]>([]);
  const [sentMemberInvites, setSentMemberInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLink, setSearchLink] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundGroup, setFoundGroup] = useState<any>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { user: currentUser } = useAuthStore();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [received, sentJoin, sentMember] = await Promise.all([
        groupService.getMyInvitations(),
        groupService.getMySentJoinRequests(),
        groupService.getMySentInvitations()
      ]);
      
      setReceivedInvites(Array.isArray(received) ? received : []);
      setSentJoinRequests(Array.isArray(sentJoin) ? sentJoin : []);
      setSentMemberInvites(Array.isArray(sentMember) ? sentMember : []);
    } catch (err) {
      console.error("Lỗi fetch data:", err);
      toast.error("Không thể tải danh sách lời mời");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Lắng nghe realtime để cập nhật danh sách ngay lập tức
    const unsubs = [
      socketService.onNewInvitation(() => {
        console.log("Realtime: New invitation received, refetching...");
        fetchAllData();
      }),
      socketService.onJoinRequestApproved(() => {
        console.log("Realtime: Join request approved, refetching...");
        fetchAllData();
      }),
      socketService.onJoinRequestRejected(() => {
        console.log("Realtime: Join request rejected, refetching...");
        fetchAllData();
      }),
      socketService.onNewJoinRequest(() => {
        console.log("Realtime: New join request for your group, refetching...");
        fetchAllData();
      }),
      socketService.onInvitationAccepted(() => {
        console.log("Realtime: Someone accepted your invitation, refetching...");
        fetchAllData();
      })
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [fetchAllData]);

  const handleAcceptInvite = async (groupId: string) => {
    try {
      await groupService.acceptInvitation(groupId);
      toast.success("Đã tham gia nhóm thành công!");
      fetchAllData();
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleDeclineInvite = async (groupId: string) => {
    try {
      await groupService.declineInvitation(groupId);
      toast.success("Đã từ chối lời mời");
      fetchAllData();
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleSearchLink = async () => {
    const input = searchLink.trim();
    if (!input) return;
    
    setSearching(true);
    try {
      // Robust extraction: find 24-char hex ID anywhere in the input
      const match = input.match(/[0-9a-fA-F]{24}/);
      const groupId = match ? match[0] : input;
      
      if (groupId.length !== 24) {
        toast.error("Link hoặc mã nhóm không hợp lệ (Phải có ID 24 ký tự)");
        setSearching(false);
        return;
      }

      console.log("🔍 [SearchLink] Extracted GroupID:", groupId);
      const res = await groupService.getGroupInfoForLink(groupId);
      
      // Because of axios interceptor unwrapping in api.ts, 
      // res is directly the group object (if backend returns { data: { ... } })
      // or res is the whole object. Let's handle both.
      const groupData = (res && res._id) ? res : (res?.data || res);

      if (groupData && groupData._id) {
        setFoundGroup(groupData);
        setIsJoinModalOpen(true);
        setSearchLink(""); // Clear input on success
      } else {
        toast.error("Không tìm thấy thông tin nhóm");
      }
    } catch (err: any) {
      console.error("❌ [SearchLink] Error:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Không thể tìm thấy nhóm";
      toast.error(errMsg);
    } finally {
      setSearching(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!foundGroup) return;
    try {
      await groupService.requestJoinGroup(foundGroup._id);
      toast.success("Đã gửi yêu cầu tham gia thành công!");
      setIsJoinModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể gửi yêu cầu");
    }
  };


  if (loading) {
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <div className="w-12 h-12 border-4 border-black/5 border-t-black rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-[#FAFAFA] overflow-y-auto scrollbar-hide pb-20">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-black rounded-[24px] text-white shadow-2xl shadow-black/20">
              <BellIcon className="w-7 h-7 stroke-2" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Trung tâm lời mời</h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">Quản lý các yêu cầu gia nhập & lời mời</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content - Left 8 columns */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 1. Lời mời nhận được */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <UserGroupIcon className="w-5 h-5 text-black" />
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Lời mời nhận được ({receivedInvites.length})</h2>
              </div>
              
              {receivedInvites.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100 shadow-sm">
                  <p className="text-gray-400 font-bold text-sm">Bạn không có lời mời nào mới.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {receivedInvites.map((inv) => (
                    <div key={inv._id} className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-[20px] bg-gray-50 border border-gray-100 overflow-hidden shrink-0 shadow-inner">
                          <img src={getMediaUrl(inv.groupAvatar)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-gray-900 text-lg truncate leading-tight">{inv.name}</h3>
                          <p className="text-[11px] text-blue-600 font-black uppercase tracking-tight mt-1">Mời bởi {inv.invitations?.find((i: any) => String(i.userId) === String(currentUser?.id || currentUser?._id))?.invitedBy || "Thành viên"}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAcceptInvite(inv._id)}
                          className="flex-1 py-3 bg-black text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-neutral-800 transition shadow-lg shadow-black/10 active:scale-95"
                        >
                          Chấp nhận
                        </button>
                        <button 
                          onClick={() => handleDeclineInvite(inv._id)}
                          className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-100 transition active:scale-95"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Yêu cầu gia nhập đã gửi */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <PlusIcon className="w-5 h-5 text-black" />
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Yêu cầu gia nhập đã gửi ({sentJoinRequests.length})</h2>
              </div>
              
              {sentJoinRequests.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100 shadow-sm">
                  <p className="text-gray-400 font-bold text-sm">Chưa có yêu cầu gia nhập nào.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentJoinRequests.map((req) => (
                    <div key={req._id} className="bg-white/60 backdrop-blur-md rounded-[28px] p-5 border border-dashed border-gray-200 flex items-center gap-4 transition-all hover:bg-white hover:border-solid hover:shadow-lg">
                      <div className="w-12 h-12 rounded-[16px] bg-gray-100 overflow-hidden shrink-0 grayscale opacity-60">
                        <img src={getMediaUrl(req.groupAvatar)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{req.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Đang chờ duyệt</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar - Right 4 columns */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-gray-500/5">
              <div className="flex items-center gap-3 mb-8">
                <PaperAirplaneIcon className="w-5 h-5 text-black" />
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Lời mời đã gửi ({sentMemberInvites.length})</h2>
              </div>

              {sentMemberInvites.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs font-bold text-gray-400 italic">Chưa gửi lời mời nào cho người khác.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentMemberInvites.map((inv, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 rounded-[24px] bg-gray-50 border border-transparent hover:bg-white hover:border-gray-100 hover:shadow-md transition-all duration-300">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                        <img src={getMediaUrl(inv.groupAvatar)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-gray-900 truncate leading-tight">{inv.groupName}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 truncate">Mời: ID {inv.invitedUserId.substring(0, 10)}...</p>
                      </div>
                      <ClockIcon className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-black to-neutral-800 rounded-[32px] p-8 text-white shadow-2xl shadow-black/20">
              <h3 className="text-lg font-black mb-3 text-white">Tìm kiếm nhóm?</h3>
              <p className="text-xs font-medium text-white/60 leading-relaxed mb-6">Nhập link gia nhập hoặc mã ID nhóm để tham gia ngay.</p>
              
              <div className="relative mb-4">
                <input 
                  type="text" 
                  value={searchLink}
                  onChange={(e) => setSearchLink(e.target.value)}
                  placeholder="https://alo.chat/g/..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/50 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchLink()}
                />
                <button 
                  onClick={handleSearchLink}
                  disabled={searching}
                  className="absolute right-2 top-1.5 p-1.5 bg-white text-black rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                  <MagnifyingGlassIcon className={`w-5 h-5 ${searching ? "animate-pulse" : ""}`} />
                </button>
              </div>

              <button 
                onClick={() => toast.info("Tính năng khám phá nhóm đang phát triển")}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10"
              >
                Khám phá cộng đồng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Join Group */}
      {isJoinModalOpen && foundGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsJoinModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[32px] bg-gray-50 border border-gray-100 overflow-hidden mb-6 shadow-xl">
                  <img src={getMediaUrl(foundGroup.groupAvatar)} className="w-full h-full object-cover" alt="" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">{foundGroup.name}</h2>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-6">
                  {foundGroup.membersCount || foundGroup.members?.length || 0} Thành viên
                </p>
                
                <div className="w-full p-6 bg-gray-50 rounded-2xl mb-8">
                  <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                    "{foundGroup.description || "Nhóm trò chuyện cộng đồng trên Alo Chat"}"
                  </p>
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setIsJoinModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-200 transition"
                  >
                    Đóng
                  </button>
                  {(() => {
                    const currentId = currentUser?.id || currentUser?._id;
                    const isMember = foundGroup.members?.some((m: any) => String(m.userId || m) === String(currentId));
                    const hasRequested = sentJoinRequests.some((r: any) => String(r._id) === String(foundGroup._id));

                    if (isMember) {
                      return (
                        <button 
                          disabled
                          className="flex-1 py-4 bg-gray-50 text-black/40 rounded-2xl text-[12px] font-black uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Đã tham gia
                        </button>
                      );
                    }
                    if (hasRequested) {
                      return (
                        <button 
                          disabled
                          className="flex-1 py-4 bg-gray-50 text-black/40 rounded-2xl text-[12px] font-black uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2"
                        >
                          <ClockIcon className="w-4 h-4" />
                          Đã gửi yêu cầu
                        </button>
                      );
                    }
                    return (
                      <button 
                        onClick={handleRequestJoin}
                        className="flex-1 py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-neutral-800 transition shadow-lg shadow-black/20"
                      >
                        Tham gia nhóm
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}