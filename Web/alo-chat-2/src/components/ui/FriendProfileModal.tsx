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
      await axiosClient.put(`/contacts/${userId}/accept`);
      toast.success("Đã trở thành bạn bè!");
      onActionSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi chấp nhận");
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
                  <button className="flex-1 bg-gray-100 text-gray-900 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition">
                    Gọi điện
                  </button>
                  <button className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition">
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
                  { 0: "Nam", 1: "Nữ", 2: "Khác" }[
                    userData?.gender as 0 | 1 | 2
                  ] || "Bảo mật"
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
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
