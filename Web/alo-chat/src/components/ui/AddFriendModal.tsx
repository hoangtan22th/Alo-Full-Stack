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
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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
      toast.error("Không tìm thấy người dùng này");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[24px] w-full max-w-sm h-auto max-h-[85vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-10 transition-all"
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[15px] font-black text-gray-900">
              Thêm bạn mới
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 stroke-2" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nhập số điện thoại..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black transition-all"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-bold text-[14px] hover:bg-neutral-800 transition active:scale-95 shadow-md"
              >
                {loading ? "Đang tìm..." : "Tìm kiếm"}
              </button>
            </div>

            {searchHistory.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Tìm kiếm gần đây
                  </h3>
                  <button
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem("search_phone_history");
                    }}
                    className="p-1 hover:text-red-500 text-gray-300 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-black hover:text-white rounded-full text-[12px] font-bold text-gray-600 transition-all"
                    >
                      <ClockIcon className="w-3.5 h-3.5 opacity-40" /> {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(searchHistory.length > 0 || foundUser) && (
              <div className="h-[1px] bg-gray-50 my-8" />
            )}

            {foundUser ? (
              <div
                className="p-4 bg-black text-white rounded-[20px] flex items-center justify-between shadow-lg animate-in zoom-in-95 cursor-pointer"
                onClick={() => setShowProfile(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-neutral-800 shrink-0">
                    <img
                      src={foundUser.avatarUrl || "/avt-mac-dinh.jpg"}
                      onError={(e) =>
                        (e.currentTarget.src = "/avt-mac-dinh.jpg")
                      }
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] truncate">
                      {foundUser.fullName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-bold">
                      {foundUser.phone}
                    </span>
                  </div>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-white/50" />
              </div>
            ) : (
              !searchHistory.length && (
                <div className="py-8 text-center text-gray-300 text-xs italic">
                  Nhập số điện thoại để tìm bạn mới
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
