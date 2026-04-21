"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import axiosClient from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

// ===========================
// INTERFACES & HELPERS
// ===========================

interface Friend {
  id: string;
  fullName: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

// Lấy danh sách bạn bè
const getFriends = async () => {
  try {
    const response: any = await axiosClient.get("/contacts/friends");
    const data = response?.data || response;
    return {
      data: Array.isArray(data) ? data : data?.data || data || [],
      error: null,
    };
  } catch (error: any) {
    console.error("getFriends error:", error);
    return { data: [], error: "Không thể tải danh sách bạn bè" };
  }
};

// Lấy thông tin user hiện tại
const getCurrentUser = async () => {
  try {
    const response: any = await axiosClient.get("/auth/me");
    const data = response?.data || response;
    return { data: data?.data || data || null, error: null };
  } catch (error: any) {
    console.error("getCurrentUser error:", error);
    return { data: null, error: "Không thể lấy thông tin user" };
  }
};

// Tạo nhóm
const createGroup = async (data: {
  name: string;
  userIds: string[];
  avatarFile?: File;
}) => {
  try {
    const formData = new FormData();
    formData.append("name", data.name);
    // Backend yêu cầu JSON string cho userIds khi dùng multipart/form-data
    formData.append("userIds", JSON.stringify(data.userIds));
    if (data.avatarFile) formData.append("avatarFile", data.avatarFile);

    const response: any = await axiosClient.post("/groups", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response, error: null };
  } catch (error: any) {
    console.error("createGroup error:", error);
    return {
      data: null,
      error: error.response?.data?.message || error.message || "Lỗi tạo nhóm",
    };
  }
};

export default function CreateGroupModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Load current user và friends
  useEffect(() => {
    const loadData = async () => {
      setFriendsLoading(true);

      // Lấy current user
      const userRes: any = await getCurrentUser();
      const user = userRes.data;
      if (user) {
        setCurrentUserId(user.id || user._id || "");
      }

      // Lấy danh sách bạn bè
      const friendsRes = await getFriends();
      if (friendsRes.data && Array.isArray(friendsRes.data)) {
        const uId = user ? user.id || user._id : "";
        const formattedFriends: Friend[] = friendsRes.data.map((f: any) => {
          // Xử lý format mảng trả về (FriendshipResponseDTO)
          if (f.requesterId && f.recipientId) {
            const isRequester = f.requesterId === uId;
            return {
              id: isRequester ? f.recipientId : f.requesterId,
              fullName: isRequester
                ? f.recipientName || "Người dùng ẩn"
                : f.requesterName || "Người dùng ẩn",
              avatar: isRequester ? f.recipientAvatar : f.requesterAvatar,
            };
          }

          return {
            id: f.id || f._id,
            fullName: f.fullName || f.name || "Unknown",
            avatar: f.avatar,
            email: f.email,
            phone: f.phone,
          };
        });
        setFriends(formattedFriends);
      } else {
        setFriends([]);
      }

      setFriendsLoading(false);
    };

    loadData();
  }, []);

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được quá 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên nhóm");
      return;
    }
    if (selectedIds.length < 2) {
      setError("Chọn ít nhất 2 bạn bè");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createGroup({
        name: name.trim(),
        userIds: selectedIds,
        avatarFile: avatarFile || undefined,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(`Đã tạo nhóm "${name}" thành công!`);
      const convoId = result.data?._id || result.data?.id;
      onSuccess();
      onClose();
      if (convoId) {
        router.push(`/chat/${convoId}`);
      }
    } catch (err: any) {
      console.error("Lỗi tạo nhóm:", err);
      setError(err.message || "Lỗi hệ thống");
      toast.error(err.message || "Lỗi tạo nhóm");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (f.phone && f.phone.includes(search)),
  );

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white rounded-[28px] shadow-2xl flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden relative">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0 transition-all">
          <h2 className="text-lg font-black text-gray-900">Tạo nhóm mới</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-5 space-y-5">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl font-medium shrink-0">
              {error}
            </p>
          )}

          <div className="flex flex-row items-center gap-4 border-b border-gray-100 pb-5 shrink-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <label className="cursor-pointer group">
                <div className="w-16 h-16 rounded-[20px] bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-black transition flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <CameraIcon className="w-6 h-6 text-gray-400 group-hover:text-black transition" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide text-center">
                Ảnh nhóm
              </span>
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 block">
                Tên nhóm *
              </label>
              <input
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                placeholder="VD: Nhóm bạn thân..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 relative flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                Chọn thành viên
              </label>
            </div>

            <div
              className={`flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus-within:ring-2 focus-within:ring-black transition-all mt-1 relative z-10 shrink-0 ${
                selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
              }`}
            >
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                className="bg-transparent flex-1 text-sm font-medium focus:outline-none"
                placeholder="Tìm tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1 flex-1 min-h-90 overflow-y-auto pr-1 scrollbar-hide">
              {friendsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl animate-pulse transition-all ${
                      selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                  </div>
                ))
              ) : filteredFriends.length === 0 ? (
                <p
                  className={`text-center text-gray-400 text-sm py-8 font-medium italic transition-all ${
                    selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                  }`}
                >
                  {friends.length === 0
                    ? "Bạn chưa có bạn bè nào để mời."
                    : "Không tìm thấy."}
                </p>
              ) : (
                filteredFriends.map((f) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all select-none hover:bg-gray-50 text-gray-800 ${
                        selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "border-black bg-black"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
                        <img
                          src={
                            f.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              f.fullName || "User",
                            )}&background=E5E7EB&color=374151&rounded=true`
                          }
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              f.fullName || "User",
                            )}&background=E5E7EB&color=374151&rounded=true`;
                          }}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <span className="flex-1 font-bold text-sm truncate">
                        {f.fullName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* === SLIDING PANEL FOR SELECTED FRIENDS === */}
            <div
              className={`absolute top-0 bottom-0 bg-white shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 flex flex-col transition-all duration-300 rounded-l-2xl ${
                selectedIds.length > 0
                  ? "w-[calc(50%-16px)] opacity-100 translate-x-0 right-0"
                  : "w-[calc(50%-16px)] opacity-0 translate-x-[110%] absolute pointer-events-none -right-10"
              }`}
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 shrink-0">
                <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex justify-between items-center">
                  <span>Đã chọn</span>
                  <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[11px]">
                    {selectedIds.length}
                  </span>
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50/30 scrollbar-hide">
                {selectedIds.map((id) => {
                  const f = friends.find((fr) => fr.id === id);
                  if (!f) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 bg-white p-2.5 rounded-[14px] shadow-sm border border-gray-200/60 group hover:border-red-100 transition-colors"
                    >
                      <img
                        src={
                          f.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            f.fullName || "User",
                          )}&background=E5E7EB&color=374151&rounded=true`
                        }
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] text-gray-900 truncate">
                          {f.fullName}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFriend(id)}
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 relative z-20 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedIds.length < 2 || !name.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-black text-white hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-black/10"
          >
            {loading
              ? "Đang tạo..."
              : `Tạo nhóm (${selectedIds.length + 1} người)`}
          </button>
        </div>
      </div>
    </div>
  );
}
