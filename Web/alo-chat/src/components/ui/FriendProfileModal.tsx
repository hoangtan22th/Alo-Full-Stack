// src/components/ui/FriendProfileModal.tsx
import {
  XMarkIcon,
  UserPlusIcon,
  ArrowPathIcon,
  CheckIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserGroupIcon,
  ShareIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";
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
      const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      fetchUserData();
      return () => {
        window.removeEventListener("keydown", handleEsc);
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

  // Logic: Kết bạn
  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.post("/contacts/request", { recipientId: userId });
      toast.success("Đã gửi lời mời kết bạn!");
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi gửi lời mời");
    } finally {
      setActionLoading(false);
    }
  };

  // Logic: Thu hồi lời mời
  const handleRevoke = async () => {
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/request/revoke/${userId}`);
      toast.success("Đã thu hồi lời mời");
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error("Không thể thu hồi lời mời");
    } finally {
      setActionLoading(false);
    }
  };

  // Thực thi xóa thật (gọi API)
  const executeRemoveFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/friend/${userId}`);
      toast.success("Đã xóa khỏi danh sách bạn bè");
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi xóa bạn bè");
    } finally {
      setActionLoading(false);
    }
  };

  // Gọi Toast Action của Sonner thay vì window.confirm
  const handleRemoveFriend = () => {
    toast("Xác nhận hủy kết bạn", {
      description: `Bạn có chắc muốn xóa ${userData?.fullName || "người này"}?`,
      action: {
        label: "Xác nhận xóa",
        onClick: () => executeRemoveFriend(),
      },
      cancel: {
        label: "Đóng",
        onClick: () => {},
      },
    });
  };

  if (!isOpen) return null;

  const InfoRow = ({ label, value }: any) => (
    <div className="flex py-2.5 border-b border-gray-50 last:border-0 text-[13px]">
      <span className="w-24 text-gray-400 font-medium">{label}</span>
      <span className="flex-1 text-gray-900 font-bold">{value}</span>
    </div>
  );

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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm h-auto max-h-[85vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-10"
      >
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
                  onError={(e) => (e.currentTarget.src = "/avt-mac-dinh.jpg")}
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

            {/* Khu vực nút bấm chính */}
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
              ) : relationStatus === "YOU_SENT_REQUEST" ? (
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
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-center font-bold text-blue-600 uppercase mb-1">
                    Người này đã gửi lời mời cho bạn
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-black text-white py-2 rounded-xl font-bold text-xs">
                      Chấp nhận
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold text-xs">
                      Từ chối
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAddFriend}
                  disabled={actionLoading}
                  className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition shadow-md flex justify-center items-center gap-2"
                >
                  <UserPlusIcon className="w-4 h-4" /> Kết bạn ngay
                </button>
              )}
            </div>

            <div className="h-[1px] bg-gray-50 my-6" />

            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                Thông tin cá nhân
              </h3>
              <InfoRow
                label="Giới tính"
                value={userData?.gender === 0 ? "Nam" : "Nữ"}
              />
              <InfoRow label="Ngày sinh" value="••/••/••••" />
              <InfoRow
                label="Điện thoại"
                value={userData?.phoneNumber || "Bảo mật"}
              />
            </div>

            <div className="h-[1px] bg-gray-50 my-6" />

            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                Tùy chọn bạn bè
              </h3>
              <ActionItem icon={UserGroupIcon} label="Nhóm chung" />
              <ActionItem icon={ShareIcon} label="Chia sẻ danh thiếp" />
              <ActionItem icon={NoSymbolIcon} label="Chặn người này" />
              <ActionItem icon={ExclamationTriangleIcon} label="Báo xấu" />

              {/* Nút Xóa bạn bè được đẩy xuống cuối cùng */}
              {relationStatus === "ACCEPTED" && (
                <ActionItem
                  icon={TrashIcon}
                  label="Xóa khỏi danh sách bạn bè"
                  color="text-red-500"
                  disabled={actionLoading}
                  onClick={handleRemoveFriend}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
