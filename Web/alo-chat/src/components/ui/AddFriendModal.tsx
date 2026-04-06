import React, { useState } from "react";
import axiosClient from "../../config/axiosClient";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface UserFound {
  id: string;
  fullName: string;
  phoneNumber: string; // Đồng bộ tên trường
  avatar: string; // Đồng bộ tên trường
  relationStatus: string;
}

const AddFriendModal = ({ onClose }: { onClose: () => void }) => {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    "Chào bạn, mình là Tấn. Rất vui được kết nối!",
  );
  const [foundUser, setFoundUser] = useState<UserFound | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);



  // 1. Hàm tìm kiếm User theo Số điện thoại (Gọi sang Auth Service)
  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    setFoundUser(null);
    try {
      const res: any = await axiosClient.get(`/auth/search?phone=${phone}`);
      setFoundUser(res);
    } catch (err) {
      alert("Không tìm thấy người dùng này Tấn ơi!");
    } finally {
      setLoading(false);
    }
  };

  // 2. Hàm gửi lời mời kết bạn (Gọi sang Contact Service)

  const handleSendRequest = async () => {
    if (!foundUser) return;
    setSending(true);
    try {
      await axiosClient.post("/contacts/request", {
        recipientId: foundUser.id,
        greetingMessage: message,
      });
      alert("Đã gửi lời mời thành công!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi gửi lời mời rồi!");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-[40px] p-8 max-w-[480px] w-full relative shadow-2xl text-black">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-6 right-8 text-gray-400 hover:text-black transition-colors"
        >
          <XMarkIcon className="w-7 h-7 stroke-2" />
        </button>
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-6">
          Thêm bạn mới
        </h1>
        {/* Form Tìm kiếm */}
        <div className="mb-8">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
            TÌM KIẾM THEO SỐ ĐIỆN THOẠI
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nhập số điện thoại..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-[#f3f3f3] border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-black text-white px-8 py-3.5 rounded-2xl font-bold text-[15px] hover:bg-gray-800 transition-all active:scale-95 disabled:bg-gray-400"
            >
              {loading ? "..." : "Tìm"}
            </button>
          </div>
        </div>

        {foundUser && (
          <div className="bg-[#f3f3f3] rounded-[28px] p-5 mb-8 border border-transparent">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img
                  src={
                    foundUser.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${foundUser.fullName}`
                  }
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[17px] text-gray-900">
                  {foundUser.fullName}
                </h3>
                <p className="text-[13px] text-gray-500">
                  {foundUser.phoneNumber}
                </p>{" "}
                {/* Sửa phone -> phoneNumber */}
              </div>
            </div>

            {/* Logic hiển thị Nút bấm linh hoạt */}
            <div className="w-full">
              {foundUser.relationStatus === "YOU_SENT_REQUEST" ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-500 py-3 rounded-2xl font-bold cursor-not-allowed"
                >
                  Đã gửi lời mời
                </button>
              ) : foundUser.relationStatus === "THEY_SENT_REQUEST" ? (
                <button
                  onClick={() => (window.location.href = "/friends/requests")} // Chuyển hướng sang trang lời mời để chấp nhận
                  className="w-full bg-blue-500 text-white py-3 rounded-2xl font-bold hover:bg-blue-600 transition"
                >
                  Phản hồi lời mời
                </button>
              ) : foundUser.relationStatus === "ACCEPTED" ? (
                <button
                  disabled
                  className="w-full bg-green-100 text-green-600 py-3 rounded-2xl font-bold"
                >
                  Đã là bạn bè
                </button>
              ) : (
                <button
                  onClick={handleSendRequest}
                  className="w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg"
                >
                  Gửi lời mời kết bạn
                </button>
              )}
            </div>
          </div>
        )}
        {/* Lời chào */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3 px-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              LỜI CHÀO
            </label>
            <span className="text-[11px] text-gray-300 font-bold">
              {message.length}/150
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
            className="w-full bg-[#f3f3f3] border-none rounded-[24px] p-5 text-[15px] text-gray-700 leading-relaxed h-28 outline-none focus:ring-2 focus:ring-black transition-all resize-none"
          ></textarea>
        </div>
        {/* Nút Action */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-[#e5e5e5] text-black font-bold py-4 rounded-full hover:bg-gray-300 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSendRequest}
            disabled={!foundUser || sending}
            className={`flex-1 font-bold py-4 rounded-full transition-all ${
              foundUser && !sending
                ? "bg-black text-white hover:bg-gray-800 shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {sending ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
