"use client";
// src/components/ui/FriendProfileModal.tsx
import {
  XMarkIcon,
  UserPlusIcon,
  TrashIcon,
  UserGroupIcon,
  ShareIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { presenceService } from "@/services/presenceService";
import { useShallow } from "zustand/react/shallow";

export default function FriendProfileModal({
  isOpen,
  onClose,
  userId,
  friendshipId,
  relationStatus = "NOT_FRIEND",
  onActionSuccess,
}: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState("Xin chào, mình kết bạn nhé!");
  const [currentRelation, setCurrentRelation] = useState<any>({
    status: relationStatus,
    friendshipId: friendshipId,
  });
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { onlineUsers, setBulkPresence } = useChatStore(
    useShallow((s) => ({
      onlineUsers: s.onlineUsers,
      setBulkPresence: s.setBulkPresence,
    }))
  );

  const getOfflineText = (lastActive?: number) => {
    if (!lastActive) return "Ngoại tuyến";
    const diff = Math.floor((Date.now() - lastActive) / 60000);
    if (diff < 1) return "Vừa mới truy cập";
    if (diff < 60) return `Hoạt động ${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  };

  const userStatus = userId ? onlineUsers[String(userId)] : null;
  const isOnline = userStatus?.status === "online";

  useEffect(() => {
    if (isOpen && userId && userId !== "undefined" && userId !== "null") {
      fetchUserData();
      fetchRelationStatus();
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
        setIsAdding(false);
        setGreetingMessage("Xin chào, mình kết bạn nhé!");
      };
    }
  }, [isOpen, userId]);

  // Sync internal state when props change
  useEffect(() => {
    setCurrentRelation({
      status: relationStatus,
      friendshipId: friendshipId,
    });
  }, [relationStatus, friendshipId]);

  const fetchRelationStatus = async () => {
    if (!userId || userId === "undefined" || userId === "null") return;
    try {
      const res: any = await axiosClient.get(`/contacts/relation-status`, {
        params: { targetUserId: userId }
      });
      const data = res?.data || res;
      setCurrentRelation({
        status: data.relationStatus,
        friendshipId: data.friendshipId,
      });
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn("⚠️ Endpoint /relation-status chưa khả dụng.");
      } else {
        console.error("Lỗi tải trạng thái quan hệ:", error);
      }
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res: any = await axiosClient.get(`/users/${userId}`);
      setUserData(res.data || res);

      // Fetch presence
      presenceService.getBulkPresence([userId]).then(res => {
        if (res) setBulkPresence(res);
      });
    } catch (error) {
      toast.error("Lỗi tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM THAO TÁC API ---
  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.post("/contacts/request", {
        recipientId: userId,
        greetingMessage: greetingMessage,
      });

      const me: any = await axiosClient.get("/auth/me");
      const myData = me?.data || me;
      socketService.emitFriendRequestSent({
        recipientId: userId,
        requesterName: currentUser?.fullName || "Một người bạn",
        requesterAvatar: myData.avatar,
      });

      // Optimistic update
      setCurrentRelation((prev: any) => ({ ...prev, status: "I_SENT_REQUEST" }));

      toast.success("Đã gửi lời mời kết bạn!");
      setIsAdding(false);
      await fetchRelationStatus(); // Cập nhật lại trạng thái tại chỗ
      onActionSuccess?.("I_SENT_REQUEST");
    } catch (err) {
      toast.error("Lỗi khi gửi lời mời");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/request/revoke/${userId}`);
      
      // Optimistic update
      setCurrentRelation((prev: any) => ({ ...prev, status: "NOT_FRIEND", friendshipId: null }));

      toast.success("Đã thu hồi lời mời");
      await fetchRelationStatus();
      onActionSuccess?.("NOT_FRIEND");
      onClose();
    } catch (err) {
      toast.error("Không thể thu hồi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const targetId = currentRelation.friendshipId || friendshipId;
      if (!targetId) {
        toast.error("Đang cập nhật dữ liệu, vui lòng thử lại sau giây lát");
        await fetchRelationStatus();
        return;
      }
      await axiosClient.put(`/contacts/${targetId}/accept`);

      socketService.emitFriendRequestAccepted({
        recipientId: userId,
        accepterName: currentUser?.fullName || "Một người bạn",
      });

      toast.success("Đã trở thành bạn bè!");
      onActionSuccess?.("ACCEPTED");

      const conversation = await groupService.createDirectConversation(userId);
      const convoId =
        conversation?._id ||
        conversation?.id ||
        conversation?.data?._id ||
        conversation?.data?.id;

      if (convoId) {
        await axiosClient.post("/messages", {
          conversationId: convoId,
          type: "system",
          content: "🎉 Hai bạn đã trở thành bạn bè. Hãy bắt đầu trò chuyện!",
        });
        onClose();
        router.push(`/chat/${convoId}`);
      } else {
        onActionSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error("Lỗi khi chấp nhận kết bạn:", err);
      toast.error("Lỗi khi chấp nhận kết bạn");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      const targetId = currentRelation.friendshipId || friendshipId;
      if (!targetId) {
        toast.error("Đang cập nhật dữ liệu, vui lòng thử lại sau giây lát");
        await fetchRelationStatus();
        return;
      }
      await axiosClient.delete(`/contacts/${targetId}/decline`);
      toast.success("Đã từ chối lời mời");
      onActionSuccess?.("NOT_FRIEND");
      onClose();
    } catch (err) {
      toast.error("Lỗi khi từ chối lời mời");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/friend/${userId}`);
      toast.success("Đã xoá khỏi danh sách bạn bè!");
      onActionSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi xoá bạn");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    setActionLoading(true);
    try {
      const conversation = await groupService.createDirectConversation(userId);
      const convoId =
        conversation?._id ||
        conversation?.id ||
        conversation?.data?._id ||
        conversation?.data?.id;

      if (!convoId) {
        toast.error("Không tạo được cuộc hội thoại");
        return;
      }
      onClose();
      router.push(`/chat/${convoId}`);
    } catch (error) {
      toast.error("Lỗi khi tạo cuộc hội thoại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = async (isVideo: boolean) => {
    setActionLoading(true);
    try {
      const conversation = await groupService.createDirectConversation(userId);
      const convoId =
        conversation?._id ||
        conversation?.id ||
        conversation?.data?._id ||
        conversation?.data?.id;

      if (!convoId) {
        toast.error("Không tạo được cuộc hội thoại");
        return;
      }
      onClose();
      router.push(`/chat/${convoId}?call=${isVideo ? "video" : "audio"}`);
    } catch (error) {
      toast.error("Lỗi khi tạo cuộc gọi");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  // Component phụ cho dòng thông tin
  const InfoRow = ({ label, value }: any) => (
    <div className="flex py-2.5 border-b border-gray-50 last:border-0 text-[13px]">
      <span className="w-24 text-gray-400 font-medium">{label}</span>
      <span className="flex-1 text-gray-900 font-bold">{value}</span>
    </div>
  );

  // Component phụ cho các nút tùy chọn ở dưới
  const ActionItem = ({
    icon: Icon,
    label,
    color = "text-gray-800",
    danger,
    onClick,
    disabled,
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between py-3 px-1 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${danger ? "text-red-500" : color}`} />
        <span className={`text-[13px] font-bold ${danger ? "text-red-500" : color}`}>{label}</span>
      </div>
      <ChevronRightIcon className="w-3 h-3 text-gray-300" />
    </button>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm h-auto max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-10"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">
            Hồ sơ người dùng
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
          >
            <XMarkIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-6">
          <div className="relative h-32 bg-black">
            <img
              src={userData?.coverImage || "/black.jpg"}
              className="w-full h-full object-cover opacity-80"
              alt=""
            />
            <div className="absolute -bottom-8 left-5">
              <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-black shadow-lg">
                <img
                  src={userData?.avatar || "/avt-mac-dinh.jpg"}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
            </div>
          </div>

          <div className="mt-10 px-5">
            <h1 className="text-[17px] font-black text-gray-900">
              {userData?.fullName || "Đang tải..."}
            </h1>
            <p className={`text-[11px] font-bold mt-0.5 ${isOnline ? "text-green-500" : "text-gray-400"}`}>
              {isOnline ? "Đang hoạt động" : getOfflineText(userStatus?.last_active)}
            </p>

            {/* ✅ KHU VỰC NÚT BẤM CHÍNH ĐÃ FIX LOGIC */}
            <div className="mt-4 space-y-2">
              {currentRelation.status === "SELF" ? (
                <div className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-xs border border-blue-100 flex justify-center items-center gap-2">
                  Đây là tài khoản của bạn
                </div>
              ) : currentRelation.status === "ACCEPTED" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(false)}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-100 text-gray-900 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
                  >
                    Gọi điện
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={actionLoading}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition"
                  >
                    Nhắn tin
                  </button>
                </div>
              ) : currentRelation.status === "I_SENT_REQUEST" || currentRelation.status === "YOU_SENT_REQUEST" ? (
                <div className="space-y-2">
                  <button
                    onClick={handleRevoke}
                    disabled={actionLoading}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-xs border border-red-100 flex justify-center items-center gap-2 hover:bg-red-100 transition shadow-sm"
                  >
                    <ArrowPathIcon
                      className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`}
                    />{" "}
                    Thu hồi lời mời kết bạn
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={actionLoading}
                    className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold text-xs border border-gray-100 flex justify-center items-center gap-2 hover:bg-gray-100 transition"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Nhắn tin
                  </button>
                </div>
              ) : currentRelation.status === "THEY_SENT_REQUEST" ? (
                // ✅ HIỆN CHẤP NHẬN/TỪ CHỐI KHI HỌ GỬI TỚI
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Chấp nhận
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Từ chối
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-100 transition flex items-center justify-center gap-2"
                  >
                    Nhắn tin
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isAdding && (
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">
                        Lời nhắn kết bạn
                      </label>
                      <textarea
                        value={greetingMessage}
                        onChange={(e) => setGreetingMessage(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none h-20"
                        placeholder="Nhập lời nhắn..."
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    {isAdding && (
                      <button
                        onClick={() => setIsAdding(false)}
                        className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!isAdding) setIsAdding(true);
                        else handleAddFriend();
                      }}
                      disabled={actionLoading}
                      className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-2 hover:bg-neutral-800 transition"
                    >
                      {actionLoading ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlusIcon className="w-4 h-4" />
                      )}
                      {isAdding ? "Gửi lời mời" : "Kết bạn"}
                    </button>
                    {!isAdding && (
                      <button
                        onClick={handleMessage}
                        disabled={actionLoading}
                        className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
                      >
                        Nhắn tin
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-50 my-6" />

            {/* Thông tin cá nhân */}
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                Thông tin cá nhân
              </h3>
              <InfoRow
                label="Giới tính"
                value={
                  (
                    {
                      MALE: "Nam",
                      FEMALE: "Nữ",
                      OTHER: "Khác",
                      PREFER_NOT_TO_SAY: "Khác",
                    } as Record<string, string>
                  )[userData?.gender] || "Bảo mật"
                }
              />
              <InfoRow label="Ngày sinh" value="••/••/••••" />
              <InfoRow
                label="Điện thoại"
                value={userData?.phoneNumber || "Bảo mật"}
              />
            </div>

            <div className="h-px bg-gray-50 my-6" />

            {/* ✅ TẤT CẢ CÁC NÚT DƯỚI NÀY TUI ĐÃ TRẢ LẠI ĐỦ CHO ÔNG */}
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                Tùy chọn bạn bè
              </h3>
              <ActionItem icon={UserGroupIcon} label="Nhóm chung" />
              <ActionItem icon={ShareIcon} label="Chia sẻ danh thiếp" />
              <ActionItem icon={NoSymbolIcon} label="Chặn người này" />
              <ActionItem
                icon={ExclamationTriangleIcon}
                label="Báo xấu"
                onClick={() => {
                  // Enter report selection mode in chat for this user
                  useChatStore.getState().setReportSelectionMode(true);
                  // Close modal so admin/user can select messages in the chat
                  onClose?.();
                }}
              />
              {currentRelation.status === "ACCEPTED" && (
                <ActionItem
                  icon={TrashIcon}
                  label="Xóa khỏi danh sách bạn bè"
                  danger
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
