// src/components/ui/AddFriendModal.tsx
import React, { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import FriendProfileModal from "./FriendProfileModal";

const AddFriendModal = ({ onClose }: { onClose: () => void }) => {
  const [phone, setPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // UX: Bắt phím ESC và Khóa cuộn trang
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    // Không setFoundUser(null) ở đây để tránh giao diện bị giật khi refresh dữ liệu
    try {
      const res: any = await axiosClient.get(`/contacts/search?phone=${phone}`);
      const data = res?.data?.data || res?.data || res;
      setFoundUser(data);
    } catch (err) {
      setFoundUser(null);
      alert("Số điện thoại chưa đăng kí hoặc không cho phép tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Click Outside: Bấm vào lớp phủ để đóng */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[40px] p-8 max-w-[480px] w-full relative shadow-2xl text-black animate-in zoom-in-95 duration-200"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-8 text-gray-400 hover:text-black transition-colors"
          >
            <XMarkIcon className="w-7 h-7 stroke-2" />
          </button>

          <h1 className="text-[22px] font-extrabold text-gray-900 mb-6">
            Thêm bạn mới
          </h1>

          <div className="flex gap-3 mb-8">
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
              className="bg-black text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
            >
              {loading ? "..." : "Tìm"}
            </button>
          </div>

          {foundUser && (
            <div className="bg-[#f9f9f9] rounded-[28px] p-5 border border-gray-100 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full overflow-hidden border border-gray-100">
                  <img
                    src={
                      foundUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${foundUser.fullName}`
                    }
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-gray-900">
                    {foundUser.fullName}
                  </h3>
                  <p className="text-[12px] text-gray-500">{foundUser.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="p-3 bg-white border border-gray-200 rounded-full hover:bg-black hover:text-white transition-all shadow-sm active:scale-90"
              >
                <ArrowRightIcon className="w-5 h-5 stroke-2" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Truyền handleSearch xuống để con có thể báo hiệu refresh dữ liệu */}
      <FriendProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userId={foundUser?.userId}
        relationStatus={foundUser?.relationStatus}
        onActionSuccess={handleSearch}
      />
    </>
  );
};

export default AddFriendModal;
