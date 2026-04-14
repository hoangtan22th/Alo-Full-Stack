"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosClient from "@/services/api";
import { messageService, MessageDTO } from "@/services/messageService";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
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
  ClipboardDocumentIcon,
  MapPinIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
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
  // Hover tooltip & context menu & reactions
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("top");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Reaction viewers
  const [viewingReactions, setViewingReactions] = useState<{ messageId: string, reactions: any[], activeTab: string } | null>(null);
  const [userCache, setUserCache] = useState<Record<string, { name: string, avatar: string }>>({});

  const fetchUserInfo = async (userId: string) => {
    if (userCache[userId] || !userId) return;
    try {
      const res: any = await axiosClient.get(`/users/${userId}`);
      const u = res?.data?.data || res?.data || res;
      if (u) {
        setUserCache(prev => ({
          ...prev,
          [userId]: {
            name: u.fullName || u.username || u.name || "Người dùng",
            avatar: u.avatar || ""
          }
        }));
      }
    } catch { }
  };

  const EMOJI_MAP: Record<string, string> = {
    like: '👍', heart: '❤️', haha: '😂', wow: '😮', cry: '😢', angry: '😡'
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track conversationId in a ref so socket callback always has latest value
  const conversationIdRef = useRef(conversationId);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

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
                } catch { }
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
      // getMessageHistory trả về MessageDTO[] trực tiếp
      const msgs = await messageService.getMessageHistory(conversationId, 50, 0);
      setMessages(msgs);
      // Đánh dấu đã đọc (fire-and-forget)
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
          } catch { }
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

  /* ─── Socket: connect once on mount, cleanup on unmount ─── */
  // socketService.connect() is now handled globally in AuthProvider
  // We no longer nuke these global listeners here.

  /* ─── Socket: join room + listen messages khi conversationId thay đổi ─── */
  useEffect(() => {
    if (!conversationId) return;

    // Join room mới
    socketService.joinRoom(conversationId);

    // Lắng nghe tin nhắn mới
    socketService.off("message-received"); // remove listener cũ trước khi gắn mới
    socketService.onMessageReceived((newMsg: any) => {
      const activeConvoId = conversationIdRef.current;
      if (String(newMsg.conversationId) === String(activeConvoId)) {
        setMessages((prev) => {
          // Tránh duplicate: nếu tin đã có trong list (do optimistic UI) thì replace
          const existsIdx = prev.findIndex(
            (m) => m._id === newMsg._id || m._id.startsWith("temp_")
          );
          if (existsIdx !== -1 && prev[existsIdx]._id.startsWith("temp_")) {
            // Replace optimistic message bằng message thật từ socket
            const updated = [...prev];
            updated[existsIdx] = newMsg;
            return updated;
          }
          // Duplicate bảo vệ — nếu đã có _id này thì bỏ qua
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        // Nếu tin từ người khác → đánh dấu đã đọc
        const myId =
          currentUser?.id || currentUser?._id || currentUser?.userId;
        if (myId && String(newMsg.senderId) !== String(myId)) {
          messageService.markAsRead(activeConvoId).catch(console.error);
        }
      }
    });

    // Lắng nghe đối phương đã đọc
    socketService.off("messages-read");
    socketService.onMessagesRead((data) => {
      if (String(data.conversationId) === String(conversationIdRef.current)) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, isRead: true }))
        );
      }
    });

    // Lắng nghe thay đổi cảm xúc
    socketService.off("message-reaction-updated");
    socketService.onMessageReactionUpdated((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m
        )
      );
    });

    return () => {
      socketService.off("message-received");
      socketService.off("messages-read");
      socketService.off("message-reaction-updated");
    };
  }, [conversationId, currentUser]);

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

  /* ─── Reactions ─── */
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMenu(null);
    try {
      await messageService.reactToMessage(messageId, emoji);
    } catch (error) {
      console.error("Lỗi toggle cảm xúc:", error);
    }
  };

  /* ─── Send message ─── */
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !conversationId || sending) return;

    const myId =
      currentUser?.id || currentUser?._id || currentUser?.userId || "me";

    setSending(true);
    setMessageText("");

    // Optimistic UI — thêm tin tạm thời ngay lập tức
    const tempId = `temp_${Date.now()}`;
    const tempMsg: MessageDTO = {
      _id: tempId,
      conversationId,
      senderId: myId,
      type: "text",
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      // Gọi REST API — socket sẽ bắn "message-received" về cho mọi người trong room
      // (kể cả người gửi). Socket callback sẽ replace temp_ bằng message thật.
      await messageService.sendMessage({
        conversationId,
        content: text,
        type: "text",
      });
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      // Rollback optimistic nếu gửi thất bại
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setMessageText(text);
    } finally {
      setSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !conversationId) return;

    const fileList = Array.from(files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    setIsUploading(true);
    setUploadCount({ current: 0, total: fileList.length });

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" quá lớn (tối đa 100MB).`);
        continue;
      }

      setUploadCount({ current: i + 1, total: fileList.length });
      setUploadProgress(0);

      try {
        await messageService.uploadFile(
          conversationId as string,
          file,
          (percent) => setUploadProgress(percent)
        );
      } catch (err) {
        console.error("Upload failed for file:", file.name, err);
      }
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;

  // ─── Group messages: cùng sender + cách nhau < 5 phút = 1 group ───
  interface MsgGroup {
    isMine: boolean;
    messages: MessageDTO[];
  }
  const messageGroups = useMemo((): MsgGroup[] => {
    const FIVE_MIN = 5 * 60 * 1000;
    const groups: MsgGroup[] = [];
    for (const msg of messages) {
      const isMine = msg.senderId === myId;
      const last = groups[groups.length - 1];
      const lastMsg = last?.messages[last.messages.length - 1];
      const gap = lastMsg
        ? new Date(msg.createdAt).getTime() -
        new Date(lastMsg.createdAt).getTime()
        : Infinity;
      if (last && last.isMine === isMine && gap < FIVE_MIN) {
        last.messages.push(msg);
      } else {
        groups.push({ isMine, messages: [msg] });
      }
    }
    return groups;
  }, [messages, myId]);

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
                  className={`text-[13px] font-bold relative ${activeTab === tab
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
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${conversationId === chat.id
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
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              {conversationInfo?.displayAvatar ? (
                <img
                  src={conversationInfo.displayAvatar}
                  alt={conversationInfo.displayName || ""}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : conversationInfo?.isGroup ? (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-[15px]">
                  {(conversationInfo?.displayName || conversationInfo?.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[15px]">
                  {(conversationInfo?.displayName || conversationInfo?.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              {/* Online dot — chỉ hiện với chat 1-1 */}
              {!conversationInfo?.isGroup && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Tên & trạng thái */}
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
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
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
            <div className="flex flex-col gap-1">
              {messageGroups.map((group, groupIdx) => {
                const { isMine, messages: gMsgs } = group;
                const senderAvatar = conversationInfo?.displayAvatar;
                const senderName =
                  conversationInfo?.displayName ||
                  conversationInfo?.name ||
                  "?";

                // Tin cuối cùng của nhóm — chỉ đây mới hiện timestamp + avatar + trạng thái
                const lastMsg = gMsgs[gMsgs.length - 1];

                return (
                  <div
                    key={`group-${groupIdx}`}
                    className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"} mb-3`}
                  >
                    {gMsgs.map((msg, msgIdx) => {
                      const isLast = msgIdx === gMsgs.length - 1;
                      const isFirst = msgIdx === 0;
                      const isRevoked = msg.isRevoked;

                      // Bo góc bubble
                      const bubbleRadius = isMine
                        ? [
                          "rounded-2xl",
                          isFirst && !isLast ? "rounded-br-md" : "",
                          !isFirst && !isLast ? "rounded-r-md" : "",
                          !isFirst && isLast ? "rounded-br-sm" : "",
                        ].join(" ")
                        : [
                          "rounded-2xl",
                          isFirst && !isLast ? "rounded-bl-md" : "",
                          !isFirst && !isLast ? "rounded-l-md" : "",
                          !isFirst && isLast ? "rounded-bl-sm" : "",
                        ].join(" ");

                      return (
                        <div
                          key={msg._id}
                          className={`flex items-center gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"
                            }`}
                          onMouseEnter={(e) => {
                            setHoveredMsgId(msg._id);
                            setMousePos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) =>
                            setMousePos({ x: e.clientX, y: e.clientY })
                          }
                          onMouseLeave={() => {
                            setHoveredMsgId(null);
                            // Đóng menu ngay khi rời khỏi tin nhắn
                            setActiveMenu(null);
                          }}
                        >
                          {/* Avatar placeholder */}
                          <div className="w-8 shrink-0">
                            {!isMine && isLast && (
                              senderAvatar ? (
                                <img
                                  src={senderAvatar}
                                  alt={senderName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px]">
                                  {senderName.charAt(0).toUpperCase()}
                                </div>
                              )
                            )}
                          </div>

                          {/* Bubble */}
                          <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                            {/* Wrapper cho Bubble content và Hover controls để nó luôn căn giữa text */}
                            <div className="relative max-w-full">
                              {isRevoked ? (
                                <span className="italic text-[12px] text-gray-400 bg-gray-100 px-4 py-2 rounded-2xl block w-fit">
                                  Tin nhắn đã bị thu hồi
                                </span>
                              ) : msg.type === "image" ? (
                                <img
                                  src={msg.content}
                                  alt="img"
                                  className={`object-cover max-h-64 shadow ${bubbleRadius}`}
                                />
                              ) : msg.type === "file" ? (
                                <a
                                  href={msg.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-3 p-3 hover:opacity-80 transition w-fit max-w-full ${isMine ? "bg-black text-white" : "bg-[#F5F5F5] text-gray-900"
                                    } ${bubbleRadius}`}
                                >
                                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                    <DocumentIcon className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-bold truncate">
                                      {msg.metadata?.fileName || "Tệp đính kèm"}
                                    </p>
                                    <p className="text-[11px] opacity-60">
                                      {msg.metadata?.fileSize
                                        ? `${(msg.metadata.fileSize / 1024).toFixed(1)} KB`
                                        : ""}
                                    </p>
                                  </div>
                                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0 opacity-60" />
                                </a>
                              ) : (
                                <div
                                  className={`px-4 py-2.5 text-[14px] font-medium leading-relaxed w-fit max-w-full ${isMine
                                    ? "bg-black text-white shadow-md"
                                    : "bg-[#F5F5F5] text-gray-900"
                                    } ${bubbleRadius}`}
                                >
                                  {msg.content}
                                </div>
                              )}



                              {/* Hover Controls (Reaction & Menu) đặt cạnh text bubble */}
                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 py-4 ${isMine ? "right-full pr-2" : "left-full pl-2"
                                } ${hoveredMsgId === msg._id ? "opacity-100" : "opacity-0 pointer-events-none"
                                } transition-opacity`}>
                                {/* Nút thả cảm xúc */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenu(null);
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuPosition(rect.top < window.innerHeight / 2 ? "bottom" : "top");
                                      setActiveReactionMenu(activeReactionMenu === msg._id ? null : msg._id);
                                    }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                                  >
                                    <FaceSmileIcon className="w-4 h-4" />
                                  </button>

                                  {/* Emoji Picker */}
                                  {activeReactionMenu === msg._id && (
                                    <div
                                      className={`absolute z-50 flex gap-1 items-center p-1.5 bg-white rounded-full shadow-2xl border border-gray-100 ${isMine ? "right-0" : "left-0"
                                        } ${menuPosition === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
                                      onMouseLeave={() => setActiveReactionMenu(null)}
                                    >
                                      {msg.reactions?.some((r: any) => String(r.userId) === String(currentUser?.id || currentUser?._id || currentUser?.userId)) && (
                                        <div className="border-r border-gray-200 pr-1 flex items-center">
                                          <button
                                            onClick={async () => {
                                              setActiveReactionMenu(null);
                                              await messageService.clearReactions(msg._id);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all rounded-full text-gray-400"
                                            title="Xoá cảm xúc"
                                          >
                                            <XMarkIcon className="w-5 h-5" />
                                          </button>
                                        </div>
                                      )}

                                      {Object.entries(EMOJI_MAP).map(([key, icon]) => (
                                        <button
                                          key={key}
                                          onClick={() => handleToggleReaction(msg._id, key)}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 hover:scale-125 transition-all rounded-full text-lg"
                                        >
                                          {icon}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Nút "..." menu */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveReactionMenu(null);
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuPosition(rect.top < window.innerHeight / 2 ? "bottom" : "top");
                                      setActiveMenu(activeMenu === msg._id ? null : msg._id);
                                    }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                                  >
                                    <EllipsisHorizontalIcon className="w-4 h-4" />
                                  </button>

                                  {/* Context Menu */}
                                  {activeMenu === msg._id && (
                                    <div
                                      className={`absolute z-50 w-46 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden ${isMine ? "right-0" : "left-0"
                                        } ${menuPosition === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
                                      onMouseLeave={() => setActiveMenu(null)}
                                    >
                                      {!msg.isRevoked && msg.type === "text" && (
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(msg.content);
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition text-left"
                                        >
                                          <ClipboardDocumentIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                          Copy tin nhắn
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setActiveMenu(null)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition text-left"
                                      >
                                        <MapPinIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                        Ghim tin nhắn
                                      </button>
                                      <div className="my-1 border-t border-gray-100" />
                                      {isMine && !msg.isRevoked && (
                                        <button
                                          onClick={async () => {
                                            setActiveMenu(null);
                                            const ok = await messageService.deleteMessage(msg._id);
                                            if (ok) {
                                              setMessages((prev) =>
                                                prev.map((m) =>
                                                  m._id === msg._id
                                                    ? { ...m, isRevoked: true, content: "" }
                                                    : m
                                                )
                                              );
                                            }
                                          }}
                                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-orange-500 hover:bg-orange-50 transition text-left"
                                        >
                                          <ArrowUturnLeftIcon className="w-4 h-4 shrink-0" />
                                          Thu hồi tin nhắn
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setActiveMenu(null);
                                          setMessages((prev) =>
                                            prev.filter((m) => m._id !== msg._id)
                                          );
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition text-left"
                                      >
                                        <TrashIcon className="w-4 h-4 shrink-0" />
                                        Xóa tin nhắn
                                      </button>
                                    </div>
                                  )}
                                </div> {/* Nút "..." menu */}
                              </div>

                            </div> {/* Đóng thẻ Wrapper cho nội dung và hover controls */}

                            {/* Hiển thị các cảm xúc đã thả */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emojiKey: any) => {
                                  const peopleReacted = msg.reactions!.filter((r: any) => r.emoji === emojiKey);
                                  return (
                                    <div
                                      key={emojiKey}
                                      onClick={() => {
                                        setViewingReactions({ messageId: msg._id, reactions: msg.reactions!, activeTab: "all" });
                                        msg.reactions!.forEach((r: any) => fetchUserInfo(r.userId));
                                      }}
                                      onMouseEnter={() => {
                                        peopleReacted.forEach((r: any) => fetchUserInfo(r.userId));
                                      }}
                                      title={peopleReacted.map(r => userCache[r.userId]?.name || `User #${r.userId.substring(0, 4)}`).join(", ")}
                                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] cursor-pointer transition ${msg.reactions!.some((r: any) => r.emoji === emojiKey && String(r.userId) === String(currentUser?.id || currentUser?._id || currentUser?.userId))
                                        ? "bg-blue-100 text-blue-600 border border-blue-200"
                                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                        }`}
                                    >
                                      <span>{EMOJI_MAP[emojiKey as string] || emojiKey}</span>
                                      <span className="font-bold">
                                        {peopleReacted.reduce((acc, r: any) => acc + (r.count || 1), 0)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div> {/* Đóng thẻ Bubble */}

                        </div>
                      );
                    })}

                    {/* Footer: timestamp + trạng thái của nhóm — hiện 1 lần */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end pr-10" : "pl-10"
                      }`}>
                      <span className="text-[10px] font-bold text-gray-400">
                        {formatTime(lastMsg.createdAt)}
                      </span>
                      {isMine && (
                        <span className={`text-[10px] font-bold ${lastMsg.isRead ? "text-blue-500" : "text-gray-400"
                          }`}>
                          {lastMsg.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating tooltip ─ hiện gần con trỏ khi hover tin nhắn */}
        {hoveredMsgId && (() => {
          const hMsg = messages.find((m) => m._id === hoveredMsgId);
          return hMsg ? (
            <div
              style={{
                position: "fixed",
                left: mousePos.x + 14,
                top: mousePos.y - 34,
                pointerEvents: "none",
                zIndex: 9999,
              }}
              className="bg-gray-800/90 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg shadow-lg backdrop-blur-sm whitespace-nowrap"
            >
              {formatTime(hMsg.createdAt)}
            </div>
          ) : null;
        })()}

        {/* Message Input */}
        <div className="p-4 bg-white shrink-0 relative">
          {/* Thanh Tiến Trình Upload (Multi-file) */}
          {isUploading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden z-20">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
              <div className="absolute top-2 left-6 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-2 z-30">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-black text-gray-700">
                  Đang gửi tệp {uploadCount.current}/{uploadCount.total} ({uploadProgress}%)
                </span>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-3 bg-[#F5F5F5] p-2 rounded-full border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
            <button
              onClick={handleFileAttach}
              disabled={isUploading}
              className="p-2 text-gray-400 hover:text-black transition disabled:opacity-50"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder={isUploading ? "Đang tải tệp lên..." : "Nhập tin nhắn..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUploading}
              className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium placeholder:text-gray-400 disabled:opacity-50"
            />
            <button className="p-2 text-gray-400 hover:text-black transition">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || sending || isUploading}
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

        {/* Reaction Modal */}
        {viewingReactions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingReactions(null)} />
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg">Cảm xúc tin nhắn</h3>
                <button onClick={() => setViewingReactions(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Emoji Tabs */}
                {(() => {
                  const rList = viewingReactions.reactions;
                  const totalCount = rList.reduce((acc, r) => acc + (r.count || 1), 0);
                  const groupedCount = rList.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + (r.count || 1);
                    return acc;
                  }, {} as Record<string, number>);
                  const sortedGrouped = (Object.entries(groupedCount) as [string, number][]).sort((a, b) => b[1] - a[1]);

                  // Right Column Users
                  const activeFilters = viewingReactions.activeTab === "all" ? rList : rList.filter(r => r.emoji === viewingReactions.activeTab);

                  // Group by user for the right column
                  const userEmoteMap = activeFilters.reduce((acc, r) => {
                    const uid = String(r.userId);
                    if (!acc[uid]) acc[uid] = { total: 0, emotes: [] };
                    acc[uid].total += (r.count || 1);

                    // Group similar emojis if user clicked multiple times
                    const existingEmote = acc[uid].emotes.find((e: any) => e.emoji === r.emoji);
                    if (existingEmote) existingEmote.count += (r.count || 1);
                    else acc[uid].emotes.push({ emoji: r.emoji, count: r.count || 1 });

                    return acc;
                  }, {} as Record<string, { total: number, emotes: { emoji: string, count: number }[] }>);

                  const sortedUsers = (Object.entries(userEmoteMap) as [string, any][]).sort((a, b) => b[1].total - a[1].total);

                  return (
                    <>
                      <div className="w-1/3 border-r border-gray-100 p-2 overflow-y-auto bg-white max-h-[60vh]">
                        <button
                          onClick={() => setViewingReactions({ ...viewingReactions, activeTab: "all" })}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === "all" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                        >
                          <span className="font-semibold text-sm">Tất cả</span>
                          <span className="text-gray-500 text-sm font-medium">{totalCount}</span>
                        </button>
                        {sortedGrouped.map(([emojiKey, count]) => (
                          <button
                            key={emojiKey}
                            onClick={() => setViewingReactions({ ...viewingReactions, activeTab: emojiKey })}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === emojiKey ? "bg-gray-100" : "hover:bg-gray-50"}`}
                          >
                            <span className="text-2xl">{EMOJI_MAP[emojiKey] || emojiKey}</span>
                            <span className="text-gray-500 text-sm font-medium">{count}</span>
                          </button>
                        ))}
                      </div>

                      <div className="w-2/3 p-2 overflow-y-auto bg-[#F9FAFB] max-h-[60vh]">
                        {sortedUsers.map(([uid, uData]) => {
                          const uInfo = userCache[uid] || { name: `User #${uid.substring(0, 4)}`, avatar: "" };
                          return (
                            <div key={uid} className="flex items-center gap-3 p-3 mb-1 bg-white rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition">
                              <div className="relative">
                                {uInfo.avatar ? (
                                  <img src={uInfo.avatar} alt={uInfo.name} className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm uppercase">
                                    {uInfo.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[14px] truncate text-gray-900">{uInfo.name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {uData.emotes.map((em: any, idx: number) => (
                                    <div key={idx} className="flex items-center text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
                                      <span className="text-[14px] mr-1">{EMOJI_MAP[em.emoji] || em.emoji}</span>
                                      {em.count > 1 && <span className="font-black text-gray-600">x{em.count}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right flex flex-col justify-center">
                                <span className="text-[20px] font-black text-gray-200 leading-none">{uData.total}</span>
                              </div>
                            </div>
                          );
                        })}
                        {sortedUsers.length === 0 && (
                          <div className="h-full flex items-center justify-center text-gray-400 font-medium text-sm">
                            Không có cảm xúc nào
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ CỘT PHẢI: THÔNG TIN CHI TIẾT ═══ */}
      <div
        className={`hidden lg:flex flex-col shrink-0 bg-[#FAFAFA] h-full transition-all duration-300 ease-in-out overflow-hidden ${showInfoPanel
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
