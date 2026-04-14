"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosClient from "@/services/api";
import { messageService, MessageDTO } from "@/services/messageService";
import { groupService } from "@/services/groupService";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  BellIcon,
  UserIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  FolderIcon,
  NoSymbolIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatListTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─────────────────────────────────────────
   Page Component
───────────────────────────────────────── */
export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;

  /* ---------- sidebar state ---------- */
  const [activeTab, setActiveTab] = useState("Ưu tiên");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  /* ---------- chat area state ---------- */
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [conversationInfo, setConversationInfo] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Fetch conversation list (sidebar) ─── */
  const fetchGroups = useCallback(async () => {
    try {
      setLoadingList(true);
      const userRes: any = await axiosClient.get("/auth/me");
      const user = userRes?.data || userRes;
      if (user) setCurrentUser(user);
      const currentUserId = user?.id || user?._id || user?.userId;

      let groups: any = await axiosClient.get("/groups/me", {
        params: { type: "all" },
      });
      if (groups?.data?.data) groups = groups.data.data;
      else if (groups?.data) groups = groups.data;

      if (Array.isArray(groups)) {
        const formatted = await Promise.all(
          groups.map(async (g: any) => {
            let chatName = g.name;
            let chatAvatar = g.groupAvatar;

            if (!g.isGroup && currentUserId && g.members) {
              const other = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (other) {
                try {
                  const res: any = await axiosClient.get(
                    `/users/${other.userId}`,
                  );
                  const u = res?.data?.data || res?.data || res;
                  if (u) {
                    chatName =
                      u.fullName || u.username || u.name || "Người dùng";
                    chatAvatar = u.avatar || chatAvatar;
                  }
                } catch {}
              }
            }

            return {
              id: g._id || g.id,
              name: chatName || "Nhóm trò chuyện",
              avatar: chatAvatar || "",
              isGroup: g.isGroup,
              time: formatListTime(g.updatedAt),
              message: "Chưa có tin nhắn",
              unread: false,
              online: false,
            };
          }),
        );
        setConversations(formatted);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách nhóm:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  /* ─── Fetch messages for current conversation ─── */
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const res = await messageService.getMessageHistory(conversationId, 50, 0);
      if (res?.messages) {
        setMessages(res.messages);
      }
      // mark as read
      messageService.markAsRead(conversationId);
    } catch (err) {
      console.error("Lỗi lấy tin nhắn:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId]);

  /* ─── Fetch conversation info ─── */
  const fetchConversationInfo = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data: any = await groupService.getGroupById(conversationId);
      const g = data?.data || data;
      if (!g) return;

      let displayName = g.name;
      let displayAvatar = g.groupAvatar;

      const currentUserId =
        currentUser?.id || currentUser?._id || currentUser?.userId;
      if (!g.isGroup && currentUserId && g.members) {
        const other = g.members.find(
          (m: any) => m.userId !== currentUserId,
        );
        if (other) {
          try {
            const res: any = await axiosClient.get(`/users/${other.userId}`);
            const u = res?.data?.data || res?.data || res;
            if (u) {
              displayName =
                u.fullName || u.username || u.name || "Người dùng";
              displayAvatar = u.avatar || displayAvatar;
            }
          } catch {}
        }
      }

      setConversationInfo({ ...g, displayName, displayAvatar });
    } catch (err) {
      console.error("Lỗi lấy thông tin cuộc hội thoại:", err);
    }
  }, [conversationId, currentUser]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (conversationId && currentUser) {
      fetchConversationInfo();
    }
  }, [conversationId, currentUser, fetchConversationInfo]);

  /* ─── Auto scroll to bottom ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─── Send message ─── */
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !conversationId || sending) return;

    setSending(true);
    setMessageText("");

    // Optimistic UI
    const tempMsg: MessageDTO = {
      _id: `temp_${Date.now()}`,
      conversationId,
      senderId: currentUser?.id || currentUser?._id || "me",
      type: "text",
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const sent = await messageService.sendMessage({
        conversationId,
        content: text,
        type: "text",
      });
      if (sent) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMsg._id ? sent : m)),
        );
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      setMessageText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-sans overflow-hidden">

      {/* ═══ CỘT TRÁI: DANH SÁCH CHAT ═══ */}
      <div className="w-full md:w-[320px] lg:w-85 flex flex-col border-r border-gray-100 shrink-0 h-full">
        <div className="p-5 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-black">
              Messages
            </h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              title="Tạo cuộc hội thoại mới"
              className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center hover:bg-gray-800 transition shadow-md active:scale-95"
            >
              <PlusIcon className="w-5 h-5 stroke-2" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] border-transparent rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium outline-none focus:bg-white focus:border-black border transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex gap-5">
              {["Ưu tiên", "Khác"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[13px] font-bold relative ${
                    activeTab === tab
                      ? "text-black"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute -bottom-2.25 left-0 right-0 h-0.5 bg-black rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
            <button className="text-gray-400 hover:text-black">
              <Bars3BottomRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
          {loadingList ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Đang tải danh sách...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <p className="text-[13px]">Không có cuộc trò chuyện nào</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-black text-white text-[12px] font-bold rounded-full hover:bg-gray-800 transition"
              >
                + Tạo mới
              </button>
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  conversationId === chat.id
                    ? "bg-[#F5F5F5]"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative shrink-0">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : chat.isGroup ? (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-bold text-[14px] truncate">
                      {chat.name}
                    </h3>
                    <span className="text-[11px] font-medium text-gray-400 shrink-0">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate font-medium">
                    {chat.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ CỘT GIỮA: NỘI DUNG CHAT ═══ */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">

        {/* Chat Header */}
        <div className="h-19 px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-[16px] font-black tracking-tight">
              {conversationInfo?.displayName ||
                conversationInfo?.name ||
                "Đang tải..."}
            </h2>
            <p className="text-[12px] font-bold text-gray-400 mt-0.5">
              {conversationInfo?.isGroup
                ? `${conversationInfo?.members?.length ?? ""} thành viên`
                : "Đang hoạt động"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-black transition">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="hover:text-black transition">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button className="hover:text-black transition">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className={`transition ${showInfoPanel ? "text-black" : "hover:text-gray-600"}`}
            >
              <InformationCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <FaceSmileIcon className="w-10 h-10 opacity-30" />
              <p className="text-[13px] font-medium">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMine = msg.senderId === myId;
                const isRevoked = msg.isRevoked;

                if (isRevoked) {
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <span className="italic text-[12px] text-gray-400 bg-gray-100 px-4 py-2 rounded-2xl">
                        Tin nhắn đã bị thu hồi
                      </span>
                    </div>
                  );
                }

                if (msg.type === "text") {
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "items-end gap-3"}`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px] shrink-0 mb-1">
                          ?
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMine ? "" : ""}`}>
                        <div
                          className={`p-3.5 rounded-2xl text-[14px] font-medium leading-relaxed ${
                            isMine
                              ? "bg-black text-white rounded-br-sm shadow-md"
                              : "bg-[#F5F5F5] text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span
                          className={`text-[10px] font-bold text-gray-400 mt-1 block ${isMine ? "text-right mr-1" : "ml-1"}`}
                        >
                          {formatTime(msg.createdAt)}
                          {isMine && (
                            <span className="ml-1">
                              {msg.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "image") {
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "items-end gap-3"}`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px] shrink-0 mb-1">
                          ?
                        </div>
                      )}
                      <div className="max-w-[60%]">
                        <img
                          src={msg.content}
                          alt="img"
                          className="rounded-2xl object-cover max-h-64 w-full shadow"
                        />
                        <span
                          className={`text-[10px] font-bold text-gray-400 mt-1 block ${isMine ? "text-right" : ""}`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "file") {
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "items-end gap-3"}`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px] shrink-0 mb-1">
                          ?
                        </div>
                      )}
                      <div className="max-w-[70%]">
                        <a
                          href={msg.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-[#F5F5F5] p-3 rounded-2xl hover:bg-gray-200 transition"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <DocumentIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 truncate">
                              {msg.metadata?.fileName || "Tệp đính kèm"}
                            </p>
                            <p className="text-[11px] font-bold text-gray-400">
                              {msg.metadata?.fileSize
                                ? `${(msg.metadata.fileSize / 1024).toFixed(1)} KB`
                                : ""}
                            </p>
                          </div>
                          <ArrowDownTrayIcon className="w-4 h-4 text-gray-500 shrink-0" />
                        </a>
                        <span
                          className={`text-[10px] font-bold text-gray-400 mt-1 block ${isMine ? "text-right" : ""}`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white shrink-0">
          <div className="flex items-center gap-3 bg-[#F5F5F5] p-2 rounded-full border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
            <button className="p-2 text-gray-400 hover:text-black transition">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Nhập tin nhắn..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium placeholder:text-gray-400 disabled:opacity-60"
            />
            <button className="p-2 text-gray-400 hover:text-black transition">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-4 h-4 -mr-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ CỘT PHẢI: THÔNG TIN CHI TIẾT ═══ */}
      <div
        className={`hidden lg:flex flex-col shrink-0 bg-[#FAFAFA] h-full transition-all duration-300 ease-in-out overflow-hidden ${
          showInfoPanel
            ? "w-[320px] xl:w-85 opacity-100 border-l border-gray-100"
            : "w-0 opacity-0 border-l-0"
        }`}
      >
        <div className="w-[320px] xl:w-85 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-hide">

            {/* Profile Section */}
            <div className="flex flex-col items-center pt-10 pb-8 border-b border-gray-100/60">
              <div className="relative mb-4">
                {conversationInfo?.displayAvatar ? (
                  <img
                    src={conversationInfo.displayAvatar}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-3xl border-4 border-white shadow-lg">
                    {(conversationInfo?.displayName || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight">
                {conversationInfo?.displayName ||
                  conversationInfo?.name ||
                  "..."}
              </h2>
              <p className="text-[12px] font-bold text-gray-400 mt-1">
                {conversationInfo?.isGroup
                  ? `${conversationInfo?.members?.length ?? 0} thành viên`
                  : "Người dùng"}
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                  <UserIcon className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                  <BellIcon className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shared Files */}
            <div className="p-6 border-b border-gray-100/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Shared Files
                </h3>
              </div>
              <div className="space-y-4">
                {messages
                  .filter((m) => m.type === "file")
                  .slice(-5)
                  .map((m) => (
                    <a
                      key={m._id}
                      href={m.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 group-hover:bg-gray-50 transition">
                        <FolderIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">
                          {m.metadata?.fileName || "File"}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400">
                          {m.metadata?.fileType || ""}
                        </p>
                      </div>
                    </a>
                  ))}
                {messages.filter((m) => m.type === "file").length === 0 && (
                  <p className="text-[12px] text-gray-400 font-medium">
                    Chưa có file nào được chia sẻ
                  </p>
                )}
              </div>
            </div>

            {/* Danger Actions */}
            <div className="p-6 space-y-4 pb-10">
              <button className="w-full flex items-center justify-between text-[13px] font-bold text-red-500 hover:bg-red-50 p-2 -mx-2 rounded-lg transition">
                Block User
                <NoSymbolIcon className="w-4 h-4" />
              </button>
              <button className="w-full flex items-center justify-between text-[13px] font-bold text-gray-500 hover:bg-gray-100 p-2 -mx-2 rounded-lg transition">
                Report Conversation
                <ExclamationCircleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal tạo chat 1-1 */}
      <NewDirectChatModal
        isOpen={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          fetchGroups();
        }}
      />
    </div>
  );
}
