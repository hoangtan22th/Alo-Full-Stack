// src/components/ui/AddFriendModal.tsx
import React, { useState, useEffect } from "react";
import axiosClient from "../../config/axiosClient";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import FriendProfileModal from "./FriendProfileModal";
import { toast } from "sonner";

const AddFriendModal = ({ onClose }: { onClose: () => void }) => {
  const [phone, setPhone] = useState("");
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("search_phone_history");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }

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

  const saveToHistory = (phoneNumber: string) => {
    const updatedHistory = [
      phoneNumber,
      ...searchHistory.filter((h) => h !== phoneNumber),
    ].slice(0, 5);

    setSearchHistory(updatedHistory);
    localStorage.setItem(
      "search_phone_history",
      JSON.stringify(updatedHistory),
    );
  };

  const handleSearch = async (phoneToSearch?: string) => {
    const targetPhone = phoneToSearch || phone;
    if (!targetPhone) return;

    setLoading(true);
    try {
      const res: any = await axiosClient.get(
        `/contacts/search?phone=${targetPhone}`,
      );
      const data = res?.data?.data || res?.data || res;

      setFoundUser(data);
      saveToHistory(targetPhone);
      if (phoneToSearch) setPhone(targetPhone);
    } catch (err) {
      setFoundUser(null);
      toast.error("Không tìm thấy người dùng này!");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("search_phone_history");
    toast.info("Đã xóa lịch sử tìm kiếm");
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      >
        {/* FIX: Đổi h-[92vh] thành h-auto max-h-[92vh] để modal tự co dãn */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[28px] w-full max-w-[400px] h-auto max-h-[92vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-10 transition-all duration-300"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h2 className="text-[17px] font-black text-gray-900">
              Thêm bạn mới
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="w-6 h-6 stroke-2 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {/* Input tìm kiếm */}
            <div className="space-y-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nhập số điện thoại..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-[15px] font-bold outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-2xl font-black text-[15px] hover:bg-gray-800 transition shadow-lg active:scale-95"
              >
                {loading ? "Đang tìm..." : "Tìm kiếm ngay"}
              </button>
            </div>

            {/* Lịch sử tìm kiếm: Chỉ hiện và làm dài modal khi có data */}
            {searchHistory.length > 0 && (
              <div className="mt-10 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
                    Tìm kiếm gần đây
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="p-1.5 hover:bg-red-50 rounded-lg group transition-colors"
                  >
                    <TrashIcon className="w-4 h-4 text-gray-300 group-hover:text-red-500" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(item)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-black hover:text-white border border-gray-100 rounded-full text-[13px] font-bold text-gray-600 transition-all active:scale-90"
                    >
                      <ClockIcon className="w-4 h-4 opacity-50" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kẻ ngang: Chỉ hiện khi có kết quả hoặc lịch sử để không bị dư thừa */}
            {(searchHistory.length > 0 || foundUser) && (
              <div className="h-[1px] bg-gray-50 my-10" />
            )}

            {/* Kết quả tìm kiếm */}
            {foundUser ? (
              <div
                className="p-5 bg-black text-white rounded-[24px] flex items-center justify-between shadow-xl animate-in zoom-in-95 cursor-pointer hover:bg-gray-900 transition-all mb-2"
                onClick={() => setShowProfile(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shrink-0 shadow-inner bg-neutral-800">
                    <img
                      src={foundUser.avatarUrl || "/avt-mac-dinh.jpg"}
                      onError={(e) =>
                        (e.currentTarget.src = "/avt-mac-dinh.jpg")
                      }
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-[16px] leading-tight">
                      {foundUser.fullName}
                    </span>
                    <span className="text-[12px] text-gray-400 font-bold mt-0.5">
                      {foundUser.phone}
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-white/10 rounded-full">
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </div>
            ) : (
              !searchHistory.length && (
                <div className="py-12 text-center">
                  <p className="text-gray-300 text-sm font-medium italic">
                    Nhập số điện thoại để tìm bạn mới
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

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
