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
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import { useAuthStore } from "@/store/useAuthStore";

export default function FriendProfileModal({
  isOpen,
  onClose,
  userId,
  relationStatus = "NOT_FRIEND",
  onActionSuccess,
}: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res: any = await axiosClient.get(`/users/${userId}`);
      setUserData(res.data || res);
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
      await axiosClient.post("/contacts/request", { recipientId: userId });
      
      // [REALTIME] Emit socket event trực tiếp
      const me: any = await axiosClient.get("/auth/me");
      const myData = me?.data || me;
      socketService.emitFriendRequestSent({
        recipientId: userId,
        requesterName: myData.fullName,
        requesterAvatar: myData.avatar
      });

      toast.success("Đã gửi lời mời kết bạn!");
      onActionSuccess?.();
      onClose();
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
      toast.success("Đã thu hồi lời mời");
      onActionSuccess?.();
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
      // 1. Chấp nhận kết bạn trên DB
      await axiosClient.put(`/contacts/${userId}/accept`);
      
      // 2. [REALTIME] Emit socket event cho người gửi lời mời
      const me: any = await axiosClient.get("/auth/me");
      const myData = me?.data || me;
      socketService.emitFriendRequestAccepted({
        recipientId: userId,
        accepterName: myData.fullName
      });

      toast.success("Đã trở thành bạn bè!");

      // 3. Tự động tạo cuộc hội thoại và gửi tin nhắn chúc mừng
      const conversation = await groupService.createDirectConversation(userId);
      const convoId = conversation?._id || conversation?.id || conversation?.data?._id || conversation?.data?.id;

      if (convoId) {
        // Gửi tin nhắn hệ thống
        await axiosClient.post("/messages", {
          conversationId: convoId,
          type: "system",
          content: "🎉 Hai bạn đã trở thành bạn bè. Hãy bắt đầu trò chuyện!",
        });

        // 4. Nhảy vào khung chat
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
    onClick,
    disabled,
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between py-3 px-1 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-[13px] font-bold ${color}`}>{label}</span>
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

            {/* ✅ KHU VỰC NÚT BẤM CHÍNH ĐÃ FIX LOGIC */}
            <div className="mt-4 space-y-2">
              {relationStatus === "ACCEPTED" ? (
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
              ) : relationStatus === "I_SENT_REQUEST" ? (
                // ✅ HIỆN NÚT HUỶ KHI ÔNG GỬI ĐI
                <button
                  onClick={handleRevoke}
                  disabled={actionLoading}
                  className="w-full bg-red-50 text-red-600 py-2.5 rounded-xl font-bold text-xs border border-red-100 flex justify-center items-center gap-2"
                >
                  <ArrowPathIcon
                    className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`}
                  />{" "}
                  Thu hồi lời mời
                </button>
              ) : relationStatus === "THEY_SENT_REQUEST" ? (
                // ✅ HIỆN CHẤP NHẬN/TỪ CHỐI KHI HỌ GỬI TỚI
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs"
                  >
                    Chấp nhận
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-xs">
                    Từ chối
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddFriend}
                  className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-2"
                >
                  <UserPlusIcon className="w-4 h-4" /> Kết bạn ngay
                </button>
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
                  ({
                    MALE: "Nam",
                    FEMALE: "Nữ",
                    OTHER: "Khác",
                    PREFER_NOT_TO_SAY: "Khác",
                  } as Record<string, string>)[userData?.gender] || "Bảo mật"
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
              <ActionItem icon={ExclamationTriangleIcon} label="Báo xấu" />

              {relationStatus === "ACCEPTED" && (
                <ActionItem
                  icon={TrashIcon}
                  label="Xóa khỏi danh sách bạn bè"
                  color="text-red-500"
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
