import {
  XMarkIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserPlusIcon,
  ArrowPathIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await axiosClient.post("/contacts/request", {
        recipientId: userId,
        greetingMessage: "Chào bạn, mình muốn kết bạn!",
      });
      if (onActionSuccess) onActionSuccess();
      alert("Đã gửi lời mời thành công!");
      onClose();
    } catch (err) {
      alert("Lỗi khi gửi lời mời!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    if (!window.confirm("Ông có chắc muốn thu hồi lời mời này không?")) return;
    setActionLoading(true);
    try {
      await axiosClient.delete(`/contacts/request/revoke/${userId}`);
      if (onActionSuccess) onActionSuccess();
      alert("Đã thu hồi lời mời kết bạn!");
      onClose();
    } catch (err) {
      alert("Lỗi khi thu hồi!");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/20 bg-black/10 rounded-full z-30 text-white transition-all"
        >
          <XMarkIcon className="w-5 h-5 stroke-2" />
        </button>

        {/* FIX: Bọc ảnh cover vào div có chiều cao cố định */}
        <div className="h-40 bg-black relative">
          <img
            src={userData?.coverImage || "/black.jpg"}
            className="w-full h-full object-cover opacity-90"
            alt="cover"
          />
        </div>

        <div className="px-8 py-6 relative bg-white">
          <div className="flex flex-col items-center -mt-20 mb-6">
            {/* FIX: Đổi bg-gray-50 thành bg-black cho avatar */}
            <div className="w-28 h-28 rounded-full border-[4px] border-white overflow-hidden shadow-lg bg-black mb-3">
              <img
                src={
                  userData?.avatar && userData.avatar.trim() !== ""
                    ? userData.avatar
                    : "/avt-mac-dinh.jpg"
                }
                onError={(e) => {
                  e.currentTarget.src = "/avt-mac-dinh.jpg";
                }}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-[22px] font-extrabold text-gray-900">
              {userData?.fullName || "Đang tải..."}
            </h1>

            <div className="mt-5 w-full flex flex-col items-center gap-3">
              {relationStatus === "ACCEPTED" ? (
                <div className="flex gap-3 w-full justify-center">
                  <button className="flex-1 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition shadow-md">
                    Nhắn tin
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition">
                    Gọi điện
                  </button>
                </div>
              ) : relationStatus === "NOT_FRIEND" ? (
                <button
                  onClick={handleAddFriend}
                  disabled={actionLoading}
                  className="w-full max-w-[280px] bg-black text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg"
                >
                  {actionLoading ? "Đang xử lý..." : "Kết bạn ngay"}
                </button>
              ) : relationStatus === "YOU_SENT_REQUEST" ? (
                <div className="flex flex-col items-center gap-3 w-full animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-sm uppercase tracking-tight italic">
                    <CheckIcon className="w-4 h-4" /> Đã gửi yêu cầu kết nối
                  </div>
                  <button
                    onClick={handleRevokeRequest}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-10 py-3 rounded-2xl font-extrabold hover:bg-red-100 transition border border-red-100"
                  >
                    <ArrowPathIcon
                      className={`w-5 h-5 ${actionLoading ? "animate-spin" : ""}`}
                    />
                    Thu hồi lời mời
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="bg-gray-200 text-gray-500 px-8 py-2.5 rounded-full font-bold"
                >
                  Người này đã mời bạn
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#f9f9f9] rounded-[24px] p-6 space-y-5 border border-gray-100 shadow-inner">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-5">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Giới tính
                </p>
                <p className="font-bold text-[15px] text-gray-900">
                  {userData ? (userData.gender === 0 ? "Nam" : "Nữ") : "..."}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Điện thoại
                </p>
                <p className="font-bold text-[15px] text-gray-900">
                  {userData?.phoneNumber || "Bảo mật"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Email liên hệ
              </p>
              <p className="font-bold text-[15px] text-gray-900">
                {userData?.email || "Chưa cập nhật"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
