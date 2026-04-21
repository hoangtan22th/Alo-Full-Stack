"use client";
import { useState, useEffect } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { contactService } from "@/services/contactService";
import { groupService } from "@/services/groupService";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NewDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated?: () => void;
}

export default function NewDirectChatModal({
  isOpen,
  onClose,
  onChatCreated,
}: NewDirectChatModalProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.userId);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null); // userId đang tạo
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await contactService.getFriendsList();
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Không tải được danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (friend: any) => {
    const targetUserId =
      friend.requesterId === currentUserId
        ? friend.recipientId
        : friend.requesterId;

    if (!targetUserId) {
      toast.error("Không xác định được người dùng");
      return;
    }

    setCreating(targetUserId);
    try {
      const conversation = await groupService.createDirectConversation(
        targetUserId,
      );
      // Backend có thể trả về trực tiếp object hoặc { data: ... }
      const convoId =
        conversation?._id ||
        conversation?.id ||
        conversation?.data?._id ||
        conversation?.data?.id;

      if (!convoId) {
        toast.error("Không tạo được cuộc hội thoại");
        return;
      }

      onClose();
      if (onChatCreated) onChatCreated();
      router.push(`/chat/${convoId}`);
    } catch (error) {
      toast.error("Lỗi khi tạo cuộc hội thoại");
    } finally {
      setCreating(null);
    }
  };

  const filtered = friends.filter((f) => {
    const name =
      f.requesterName || f.recipientName || f.fullName || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col max-h-[70vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">
            Tin nhắn mới
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition"
          >
            <XMarkIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-50 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm bạn bè..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] rounded-xl pl-9 pr-4 py-2 text-[13px] font-medium outline-none focus:bg-white focus:ring-1 focus:ring-black/10 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
              <p className="text-[13px] font-medium">Đang tải bạn bè...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ChatBubbleLeftRightIcon className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-[13px] font-medium">
                {searchQuery ? "Không tìm thấy kết quả" : "Chưa có bạn bè nào"}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filtered.map((friend, idx) => {
                // Xác định ID và tên của người bên kia
                const isRequester = friend.requesterId === currentUserId;
                const friendId = isRequester
                  ? friend.recipientId
                  : friend.requesterId;
                const friendName = isRequester
                  ? friend.recipientName
                  : friend.requesterName;
                const friendAvatar = isRequester
                  ? friend.recipientAvatar
                  : friend.requesterAvatar;
                const isCreating = creating === friendId;

                return (
                  <button
                    key={friend.id || idx}
                    onClick={() => handleStartChat(friend)}
                    disabled={!!creating}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {friendAvatar ? (
                        <img
                          src={friendAvatar}
                          alt={friendName}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-[15px]">
                          {(friendName || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[14px] font-bold text-gray-900 truncate">
                        {friendName || "Người dùng"}
                      </p>
                      <p className="text-[12px] text-gray-400 font-medium">
                        Nhắn tin
                      </p>
                    </div>

                    {/* Action icon */}
                    {isCreating ? (
                      <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                    ) : (
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
