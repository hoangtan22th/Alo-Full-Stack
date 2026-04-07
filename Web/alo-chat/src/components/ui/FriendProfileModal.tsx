import {
  XMarkIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";

interface FriendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  relationStatus?: string; // Nhận status để render nút: NOT_FRIEND, ACCEPTED, THEY_SENT_REQUEST, v.v.
}

export default function FriendProfileModal({
  isOpen,
  onClose,
  userId,
  relationStatus = "NOT_FRIEND",
}: FriendProfileModalProps) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    } else {
      setUserData(null);
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res: any = await axiosClient.get(`/users/${userId}`);
      setUserData(res.data || res);
    } catch (error) {
      console.error("Lỗi lấy thông tin profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setSending(true);
    try {
      await axiosClient.post("/contacts/request", {
        recipientId: userId,
        greetingMessage: "Chào bạn, mình muốn kết bạn!", // Gửi lời chào mặc định
      });
      alert("Đã gửi lời mời thành công!");
      onClose();
    } catch (err) {
      alert("Lỗi khi gửi lời mời!");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;
  const genderMap: Record<number, string> = { 0: "Nam", 1: "Nữ", 2: "Khác" };
  const genderText = userData ? genderMap[userData.gender] || "Nam" : "...";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/20 bg-black/10 rounded-full z-30 text-white transition-all"
        >
          <XMarkIcon className="w-5 h-5 stroke-2" />
        </button>

        <div className="h-40 relative bg-gray-100">
          <img
            src={
              userData?.coverImage ||
              "https://images.unsplash.com/photo-1557683316-973673baf926?q=80"
            }
            className="w-full h-full object-cover"
            alt="cover"
          />
        </div>

        <div className="px-8 py-6 relative bg-white">
          <div className="flex flex-col items-center -mt-20 mb-6">
            <div className="w-28 h-28 rounded-full border-[4px] border-white overflow-hidden shadow-lg bg-gray-50 mb-3">
              <img
                src={
                  userData?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.fullName || "User"}`
                }
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-[22px] font-extrabold text-gray-900">
              {userData?.fullName || "Đang tải..."}
            </h1>

            {/* LOGIC HIỂN THỊ NÚT TƯƠNG TÁC */}
            <div className="flex gap-3 mt-4 w-full justify-center">
              {relationStatus === "ACCEPTED" ? (
                <>
                  <button className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full font-bold hover:bg-gray-700 transition">
                    <ChatBubbleLeftIcon className="w-5 h-5" /> Nhắn tin
                  </button>
                  <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition">
                    <PhoneIcon className="w-5 h-5" /> Gọi điện
                  </button>
                </>
              ) : relationStatus === "NOT_FRIEND" ? (
                <button
                  onClick={handleAddFriend}
                  disabled={sending}
                  className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full font-bold hover:bg-gray-800 transition"
                >
                  <UserPlusIcon className="w-5 h-5" />{" "}
                  {sending ? "Đang gửi..." : "Kết bạn"}
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-200 text-gray-500 px-8 py-2.5 rounded-full font-bold cursor-not-allowed"
                >
                  Đã gửi yêu cầu
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#f9f9f9] rounded-[24px] p-6 space-y-5 border border-gray-100">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-5">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Giới tính
                </p>
                <p className="font-bold text-[15px] text-gray-900">
                  {genderText}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Số điện thoại
                </p>
                <p className="font-bold text-[15px] text-gray-900">
                  {userData?.phoneNumber || "Chưa cập nhật"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Email
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
