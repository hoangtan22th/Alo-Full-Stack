"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import axiosClient from "@/services/api";
import { messageService, MessageDTO } from "@/services/messageService";

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageDTO[];
  currentUser: any;
}

interface ConversationItem {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
}

export default function ForwardMessageModal({
  isOpen,
  onClose,
  messages,
  currentUser,
}: ForwardMessageModalProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const userFetchCache = useRef<Record<string, any>>({});

  const currentUserId =
    currentUser?.id || currentUser?._id || currentUser?.userId;

  // Fetch danh sách conversation khi mở modal
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      let groups: any = await axiosClient.get("/groups/me", {
        params: { type: "all" },
      });
      if (groups?.data?.data) groups = groups.data.data;
      else if (groups?.data) groups = groups.data;

      if (Array.isArray(groups)) {
        const formatted: ConversationItem[] = await Promise.all(
          groups.map(async (g: any) => {
            let chatName = g.name;
            let chatAvatar = g.groupAvatar || "";

            // Resolve tên cho chat 1-1
            if (!g.isGroup && currentUserId && g.members) {
              const other = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (other) {
                try {
                  let otherUser = userFetchCache.current[other.userId];
                  if (!otherUser) {
                    const res: any = await axiosClient.get(
                      `/users/${other.userId}`,
                    );
                    otherUser = res?.data?.data || res?.data || res;
                    if (otherUser)
                      userFetchCache.current[other.userId] = otherUser;
                  }
                  if (otherUser) {
                    chatName =
                      otherUser.fullName ||
                      otherUser.username ||
                      otherUser.name ||
                      "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch {}
              }
            }

            return {
              id: g._id || g.id,
              name: chatName || "Nhóm trò chuyện",
              avatar: chatAvatar,
              isGroup: g.isGroup,
            };
          }),
        );
        setConversations(formatted);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách hội thoại:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      setSelectedIds(new Set());
      setSearchQuery("");
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen, fetchConversations]);

  // Toggle chọn conversation
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Gửi tin nhắn chuyển tiếp
  const handleForward = async () => {
    if (selectedIds.size === 0 || messages.length === 0 || sending) return;
    setSending(true);

    const senderName =
      currentUser?.fullName ||
      currentUser?.name ||
      currentUser?.username ||
      "Tôi";

    try {
      const targets = Array.from(selectedIds);
      // Gửi từng message tới từng target conversation
      await Promise.all(
        targets.flatMap((targetId) =>
          messages.map((msg) =>
            messageService.sendMessage({
              conversationId: targetId,
              content: msg.content,
              type: msg.type as any,
              senderName,
              metadata: msg.metadata?.isSticker
                ? { isSticker: true }
                : msg.type === "file"
                  ? {
                      fileName: msg.metadata?.fileName,
                      fileSize: msg.metadata?.fileSize,
                      fileType: msg.metadata?.fileType,
                    }
                  : {},
            }),
          ),
        ),
      );
      onClose();
    } catch (err) {
      console.error("Lỗi chuyển tiếp tin nhắn:", err);
      alert("Không thể chuyển tiếp. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  // Lọc theo search
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Preview nội dung tin nhắn
  const getPreviewContent = () => {
    if (messages.length === 0) return "";
    if (messages.length > 1) return `[${messages.length} tin nhắn được chọn]`;

    const message = messages[0];
    if (message.metadata?.isSticker) return "[Sticker]";
    if (message.type === "image") return "[Hình ảnh]";
    if (message.type === "file")
      return message.metadata?.fileName || "[Tệp tin]";
    return message.content.length > 80
      ? message.content.substring(0, 80) + "..."
      : message.content;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-gray-900">
            Chuyển tiếp tin nhắn
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Preview tin nhắn đang forward */}
        <div className="mx-5 mt-4 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Nội dung chuyển tiếp
          </p>
          <p className="text-[13px] font-medium text-gray-700 truncate">
            {getPreviewContent()}
          </p>
        </div>

        {/* Search */}
        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Tìm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-black/10 border border-transparent focus:border-gray-200 transition-all"
            />
          </div>
        </div>

        {/* Danh sách conversation */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm font-medium">
              Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm font-medium">
              Không tìm thấy cuộc trò chuyện
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedIds.has(conv.id);
              return (
                <div
                  key={conv.id}
                  onClick={() => toggleSelect(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 mb-1 ${
                    isSelected
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>

                  {/* Avatar */}
                  {conv.avatar ? (
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        conv.isGroup
                          ? "bg-gray-100 text-gray-500"
                          : "bg-blue-50 text-blue-500"
                      }`}
                    >
                      {conv.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Tên */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 truncate">
                      {conv.name}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {conv.isGroup ? "Nhóm" : "Cá nhân"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer — nút Gửi */}
        <div className="p-4 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <p className="text-[12px] font-bold text-gray-400">
            {selectedIds.size > 0
              ? `Đã chọn ${selectedIds.size} cuộc trò chuyện`
              : "Chọn ít nhất 1 cuộc trò chuyện"}
          </p>
          <button
            onClick={handleForward}
            disabled={selectedIds.size === 0 || sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-bold rounded-full hover:bg-blue-700 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}
