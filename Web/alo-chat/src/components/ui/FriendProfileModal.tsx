import {
  XMarkIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserGroupIcon,
  ShareIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";
import { toast } from "sonner"; //

interface FriendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  relationStatus?: string;
  onActionSuccess?: () => void;
}

export default function FriendProfileModal({
  isOpen,
  onClose,
  userId,
  relationStatus = "NOT_FRIEND",
  onActionSuccess,
}: FriendProfileModalProps) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
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
      toast.error("Không thể tải thông tin");
    } finally {
      setLoading(false);
    }
  };

  // Logic kết bạn
  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.post("/contacts/request", { recipientId: userId });
      if (onActionSuccess) onActionSuccess();
      toast.success("Đã gửi lời mời kết bạn!");
      onClose();
    } catch (err) {
      toast.error("Gửi lời mời thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  // Logic thu hồi
  const handleRevokeRequest = async () => {
    if (!window.confirm("Ông chắc chắn muốn thu hồi lời mời?")) return;
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/request/revoke/${userId}`);
      if (onActionSuccess) onActionSuccess();
      toast.success("Đã thu hồi lời mời!");
      onClose();
    } catch (err) {
      toast.error("Thu hồi thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  // FIX: Logic XÓA BẠN THẬT
  const handleRemoveFriend = async () => {
    if (
      !window.confirm(
        `Ông có chắc muốn xóa ${userData?.fullName || "người này"} khỏi danh sách bạn bè không?`,
      )
    )
      return;

    setActionLoading(true);
    try {
      // Gọi API xóa dựa trên userId
      await axiosClient.delete(`/contacts/friend/${userId}`);

      toast.success("Đã xóa bạn bè thành công");

      // Quan trọng: Gọi callback để FriendListPage.tsx load lại danh sách mới
      if (onActionSuccess) onActionSuccess();

      onClose();
    } catch (err) {
      toast.error("Xóa bạn bè thất bại, kiểm tra lại API nhé!");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex py-3.5 border-b border-gray-50 last:border-0 text-[14px]">
      <span className="w-28 text-gray-400 font-medium">{label}</span>
      <span className="flex-1 text-gray-900 font-semibold">{value}</span>
    </div>
  );

  const ActionItem = ({
    icon: Icon,
    label,
    subLabel,
    color = "text-gray-800",
    onClick,
    disabled,
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center gap-4">
        <Icon className={`w-5 h-5 ${color} opacity-80`} />
        <div className="flex flex-col text-left">
          <span className={`text-[15px] font-bold ${color}`}>{label}</span>
          {subLabel && (
            <span className="text-[12px] text-gray-400 font-medium">
              {subLabel}
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[400px] h-[92vh] flex flex-col rounded-[28px] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-10 duration-300"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-[17px] font-black text-gray-900">
            Thông tin tài khoản
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <XMarkIcon className="w-6 h-6 stroke-2" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="relative h-44 bg-black">
            <img
              src={userData?.coverImage || "/black.jpg"}
              className="w-full h-full object-cover opacity-80"
              alt="cover"
            />
            <div className="absolute -bottom-10 left-6">
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-black shadow-lg">
                <img
                  src={userData?.avatar || "/avt-mac-dinh.jpg"}
                  onError={(e) => (e.currentTarget.src = "/avt-mac-dinh.jpg")}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 px-6">
            <h1 className="text-[22px] font-black text-gray-900 tracking-tight">
              {userData?.fullName || "..."}
            </h1>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition active:scale-95">
                Gọi điện
              </button>
              <button className="flex-1 bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition active:scale-95 shadow-lg">
                Nhắn tin
              </button>
            </div>

            {/* Hiển thị trạng thái kết bạn */}
            {relationStatus !== "ACCEPTED" && (
              <div className="mt-4">
                {relationStatus === "NOT_FRIEND" ? (
                  <button
                    onClick={handleAddFriend}
                    disabled={actionLoading}
                    className="w-full border-2 border-black text-black py-3 rounded-xl font-bold text-sm hover:bg-black hover:text-white transition"
                  >
                    {actionLoading ? "Đang gửi..." : "Kết bạn ngay"}
                  </button>
                ) : (
                  relationStatus === "YOU_SENT_REQUEST" && (
                    <button
                      onClick={handleRevokeRequest}
                      disabled={actionLoading}
                      className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100"
                    >
                      Thu hồi lời mời
                    </button>
                  )
                )}
              </div>
            )}

            <div className="h-[1px] bg-gray-100 my-8" />

            <div className="space-y-1">
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest mb-4">
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

            <div className="h-[1px] bg-gray-100 my-8" />

            <div className="pb-10">
              <ActionItem
                icon={UserGroupIcon}
                label="Nhóm chung"
                subLabel="17 nhóm chung"
              />
              <ActionItem icon={ShareIcon} label="Chia sẻ danh thiếp" />
              <ActionItem
                icon={NoSymbolIcon}
                label="Chặn tin nhắn và cuộc gọi"
              />
              <ActionItem
                icon={ExclamationTriangleIcon}
                label="Báo xấu"
                color="text-gray-900"
              />

              {/* NÚT XÓA BẠN BÈ ĐÃ CÓ LOGIC */}
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
