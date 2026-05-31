"use client";
import { useState, useEffect } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowPathIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { contactService } from "@/services/contactService";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useChatStore } from "@/store/useChatStore";
import { useShallow } from "zustand/react/shallow";

interface SendContactCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (selectedFriends: any[], includePhone: boolean) => Promise<void>;
}

export default function SendContactCardModal({
  isOpen,
  onClose,
  onSend,
}: SendContactCardModalProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includePhone, setIncludePhone] = useState(true);

  const { onlineUsers } = useChatStore(
    useShallow((s) => ({
      onlineUsers: s.onlineUsers,
    }))
  );

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      document.body.style.overflow = "hidden";
      setSelectedIds([]);
      setSearchQuery("");
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await contactService.getFriendsList();
      const friendsList = Array.isArray(data) ? data : [];
      setFriends(friendsList);
    } catch (error) {
      toast.error("Không tải được danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (friendId: string) => {
    setSelectedIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleRemoveSelected = (friendId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== friendId));
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      const selectedFriendsList = friends
        .map((f) => {
          const isRequester = f.requesterId === currentUserId;
          const friendId = isRequester ? f.recipientId : f.requesterId;
          const friendName = isRequester ? f.recipientName : f.requesterName;
          const friendAvatar = isRequester ? f.recipientAvatar : f.requesterAvatar;
          const friendPhone = isRequester ? f.recipientPhone || f.phone : f.requesterPhone || f.phone;
          return {
            id: friendId,
            name: friendName,
            avatar: friendAvatar,
            phone: friendPhone,
          };
        })
        .filter((f) => selectedIds.includes(f.id));

      await onSend(selectedFriendsList, includePhone);
      onClose();
    } catch (error) {
      toast.error("Lỗi khi gửi danh thiếp");
    } finally {
      setSending(false);
    }
  };

  const filtered = friends.filter((f) => {
    const isRequester = f.requesterId === currentUserId;
    const name = isRequester ? f.recipientName : f.requesterName;
    return (name || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getFriendDetails = (f: any) => {
    const isRequester = f.requesterId === currentUserId;
    const id = isRequester ? f.recipientId : f.requesterId;
    const name = isRequester ? f.recipientName : f.requesterName;
    const avatar = isRequester ? f.recipientAvatar : f.requesterAvatar;
    return { id, name, avatar };
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col h-[650px] max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Gửi danh thiếp
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition"
          >
            <XMarkIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-50 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm danh thiếp theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] rounded-xl pl-9 pr-4 py-2.5 text-[13px] font-medium outline-none focus:bg-white focus:ring-1 focus:ring-black/10 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex">
          {/* Left Pane - List of Friends */}
          <div className="flex-1 flex flex-col border-r border-gray-100 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ArrowPathIcon className="w-8 h-8 animate-spin mb-2" />
                <p className="text-[13px] font-medium">Đang tải bạn bè...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <UserIcon className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-[13px] font-medium">
                  {searchQuery ? "Không tìm thấy kết quả" : "Chưa có bạn bè nào"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((friend, idx) => {
                  const { id, name, avatar } = getFriendDetails(friend);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <div
                      key={friend.id || idx}
                      onClick={() => handleToggleSelect(id)}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      {/* Checkbox button */}
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 hover:border-gray-400"
                          }`}
                      >
                        {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="w-11 h-11 rounded-full object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {(name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        {onlineUsers[String(id)]?.status === "online" && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 truncate">
                          {name || "Người dùng"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Pane - Selected Friends */}
          <div className="w-72 bg-gray-50/30 flex flex-col shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-[13px] font-bold text-gray-600">Đã chọn</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black">
                {selectedCount}
              </span>
            </div>

            {/* List of Selected */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-[12px] font-medium text-center">Chưa chọn người dùng nào</p>
                </div>
              ) : (
                friends
                  .map((f) => getFriendDetails(f))
                  .filter((f) => selectedIds.includes(f.id))
                  .map((selected, idx) => (
                    <div
                      key={selected.id || idx}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm shrink-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selected.avatar ? (
                          <img
                            src={selected.avatar}
                            alt={selected.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {(selected.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[13px] font-bold text-gray-800 truncate">
                          {selected.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSelected(selected.id)}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                      >
                        <XMarkIcon className="w-4 h-4 stroke-2" />
                      </button>
                    </div>
                  ))
              )}
            </div>

            {/* Checkbox phone setting */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-2.5 shrink-0">
              <input
                id="includePhone"
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
                className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="includePhone"
                className="text-[13px] font-bold text-gray-700 select-none cursor-pointer"
              >
                Gửi kèm số điện thoại
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 hover:bg-gray-200 rounded-xl text-gray-700 text-[13px] font-bold transition active:opacity-85"
          >
            Hủy
          </button>
          <button
            onClick={handleSend}
            disabled={selectedCount === 0 || sending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-[13px] font-bold transition flex items-center gap-1.5 active:opacity-90"
          >
            {sending && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
            Gửi danh thiếp
          </button>
        </div>
      </div>
    </div>
  );
}
