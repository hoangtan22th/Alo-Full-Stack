"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axiosClient from "@/services/api";
import { messageService, MessageDTO } from "@/services/messageService";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import { toast } from "sonner";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import ChatSummaryButton from "@/components/ui/chatbot/ChatSummaryButton";
import { CallSystemMessage } from "@/components/ui/call/CallSystemMessage";
import { useCall } from "@/components/layout/CallProvider";
import GroupCallSelector from "@/components/ui/call/GroupCallSelector";

import JSZip from "jszip";
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
  CheckCircleIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import BotChatArea from "@/components/ui/BotChatArea";
import StickerPicker from "@/components/ui/StickerPicker";
import ForwardMessageModal from "@/components/ui/ForwardMessageModal";
import { useAuthStore } from "@/store/useAuthStore";
import ChatInfoPanel from "@/components/chat/ChatInfoPanel";

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

const getMediaUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const backendHost =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
    "http://localhost:8888";
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

const BOT_ID = "alo-bot";
const BOT_INFO = {
  id: BOT_ID,
  name: "Trợ lý Alo Chat",
  avatar: "/alochat.png",
  isGroup: false,
  message: "Sẵn sàng hỗ trợ bạn 24/7...",
  online: true,
};

/* ─────────────────────────────────────────
   Page Component
───────────────────────────────────────── */
export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = params?.conversationId as string;

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Audio state for ringtone
  const ringtoneRef = useRef<HTMLAudioElement>(null);

  /* ---------- chat area state ---------- */
  const { user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  // State cho tin nhắn ghim
  const [pinnedMessages, setPinnedMessages] = useState<MessageDTO[]>([]);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showCallMemberSelector, setShowCallMemberSelector] = useState<{isVideo: boolean} | null>(null);
  const [selectedCallMembers, setSelectedCallMembers] = useState<string[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [mediaMessages, setMediaMessages] = useState<MessageDTO[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  // Hover tooltip & context menu & reactions
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(
    null,
  );
  const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("top");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageDTO | null>(null);

  // Reaction viewers

  const [viewingReactions, setViewingReactions] = useState<{
    messageId: string;
    reactions: any[];
    activeTab: string;
  } | null>(null);
  const [userCache, setUserCache] = useState<
    Record<string, { name: string; avatar: string }>
  >({});
  const [isMounted, setIsMounted] = useState(false);
  const fetchingUsersRef = useRef<Set<string>>(new Set());

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const [activeAlbumIndex, setActiveAlbumIndex] = useState<{
    messageId: string;
    index: number;
  } | null>(null);

  // Use global call state
  const {
    callState,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  } = useCall();

  // Chặn triệt để lỗi "createSpan" của Zego SDK — handler sống ở page level
  // để vẫn hoạt động sau khi ZegoCallRoom unmount
  useEffect(() => {
    const zegoErrorHandler = (e: any) => {
      const msg = e.message || e.reason?.message || "";
      if (
        msg.includes("createSpan") ||
        msg.includes("Cannot read properties of null")
      ) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return true;
      }
    };
    window.addEventListener("error", zegoErrorHandler, true);
    window.addEventListener("unhandledrejection", zegoErrorHandler, true);
    return () => {
      // Delay removal để bắt hết lỗi Zego post-destroy
      setTimeout(() => {
        window.removeEventListener("error", zegoErrorHandler, true);
        window.removeEventListener(
          "unhandledrejection",
          zegoErrorHandler,
          true,
        );
      }, 5000);
    };
  }, []);

  // Ringtone is now handled by CallProvider

  // Helper lấy kích thước ảnh tự nhiên trước khi upload
  const getImageDimensions = (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(file);
    });
  };

  // Helper lấy tên người dùng ưu tiên dữ liệu "trực tiếp" (senderName trong msg, currentUser, conversationInfo) trước khi dùng cache
  const getSenderDisplayName = (userId: string, msg?: MessageDTO) => {
    if (msg?.senderName) return msg.senderName;
    if (!userId) return "Người dùng";
    const currentMyId =
      currentUser?.id || currentUser?._id || currentUser?.userId;
    if (String(userId) === String(currentMyId)) {
      return currentUser?.fullName || "Tôi";
    }

    if (conversationInfo) {
      if (!conversationInfo.isGroup) {
        const otherMember = conversationInfo.members?.find(
          (m: any) => String(m.userId) === String(userId),
        );
        if (otherMember && String(userId) === String(otherMember.userId)) {
          return conversationInfo.displayName || "Người dùng";
        }
      } else {
        const member = conversationInfo.members?.find(
          (m: any) =>
            String(m.userId) === String(userId) ||
            String(m._id) === String(userId),
        );
        if (member) {
          const name = member.fullName || member.displayName || (member as any).name;
          if (name) return name;
        }
      }
    }

    return userCache[userId]?.name || "Người dùng";
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchUserInfo = async (userId: string) => {
    if (userCache[userId] || !userId || fetchingUsersRef.current.has(userId))
      return;

    if (userId === BOT_ID) {
      setUserCache((prev) => ({
        ...prev,
        [BOT_ID]: {
          name: BOT_INFO.name,
          avatar: BOT_INFO.avatar,
        },
      }));
      return;
    }

    fetchingUsersRef.current.add(userId);
    try {
      const res: any = await axiosClient.get(`/users/${userId}`);
      const u = res?.data?.data || res?.data || res;
      if (u) {
        setUserCache((prev) => ({
          ...prev,
          [userId]: {
            name:
              u.fullName ||
              (u as any).username ||
              (u as any).name ||
              "Người dùng",
            avatar: u.avatar || "",
          },
        }));
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin user " + userId, error);
      fetchingUsersRef.current.delete(userId); // remove from fetching so it can retry
    }
  };

  // Đảm bảo userCache luôn có thông tin user cho các tin nhắn ghim (bao gồm cả chính mình)
  useEffect(() => {
    if (!pinnedMessages.length) return;
    const allPinnedSenders = Array.from(
      new Set(pinnedMessages.map((m) => m.senderId)),
    );
    allPinnedSenders.forEach((id) => {
      if (id && !userCache[id]) fetchUserInfo(id);
    });
  }, [pinnedMessages, userCache]);

  // Đồng bộ thông tin của mình vào userCache để các phần reply/hiển thị luôn có tên chính xác
  useEffect(() => {
    const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
    if (myId) {
      setUserCache((prev) => {
        if (prev[myId]) return prev;
        return {
          ...prev,
          [myId]: {
            name: currentUser?.fullName || "Tôi",
            avatar: currentUser?.avatar || "",
          },
        };
      });
    }
  }, [currentUser]);

  // Fetch thông tin cho tất cả thành viên trong nhóm
  useEffect(() => {
    if (conversationInfo?.isGroup && conversationInfo.members) {
      conversationInfo.members.forEach((m: any) => {
        if (m.userId && !userCache[m.userId]) {
          fetchUserInfo(m.userId);
        }
      });
    }
  }, [conversationInfo, userCache]);

  const EMOJI_MAP: Record<string, string> = {
    like: "👍",
    heart: "❤️",
    haha: "😂",
    wow: "😮",
    cry: "😢",
    angry: "😡",
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingHistoryRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track conversationId in a ref so socket callback always has latest value
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
    setIsInitialLoad(true); // Reset on change
  }, [conversationId]);

  /* ─── Fetch messages for current conversation ─── */
  const fetchMessages = useCallback(async () => {
    if (!conversationId || conversationId === BOT_ID) return;
    setLoadingMessages(true);
    setHasMore(true);
    try {
      const msgs = await messageService.getMessageHistory(
        conversationId,
        50,
        0,
      );
      setMessages(msgs);
      if (msgs.length < 50) setHasMore(false);

      // Lấy tất cả tin nhắn ghim
      const pinned = msgs.filter((m) => m.isPinned);
      setPinnedMessages(pinned);
      // Đánh dấu đã đọc (fire-and-forget)
      messageService.markAsRead(conversationId);
    } catch (err) {
      console.error("Lỗi lấy tin nhắn:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId]);

  const loadMoreHistory = useCallback(async () => {
    if (
      !conversationId ||
      !hasMore ||
      loadingMoreHistory ||
      loadingMessages ||
      conversationId === BOT_ID
    )
      return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const oldScrollHeight = container.scrollHeight;
    setLoadingMoreHistory(true);
    isLoadingHistoryRef.current = true;

    try {
      const olderMsgs = await messageService.getMessageHistory(
        conversationId,
        50,
        messages.length,
      );

      if (olderMsgs.length === 0) {
        setHasMore(false);
        return;
      }

      if (olderMsgs.length < 50) setHasMore(false);

      setMessages((prev) => [...olderMsgs, ...prev]);

      // Adjust scroll position after messages are prepended
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight;
        }
        isLoadingHistoryRef.current = false;
      }, 0);
    } catch (err) {
      console.error("Lỗi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [
    conversationId,
    hasMore,
    loadingMoreHistory,
    loadingMessages,
    messages.length,
  ]);

  const fetchMediaHistory = useCallback(async () => {
    if (!conversationId || conversationId === BOT_ID) return;
    try {
      // Tải 200 tin nhắn gần nhất để trích xuất media cho InfoPanel
      const msgs = await messageService.getMessageHistory(
        conversationId,
        200,
        0,
      );
      const filtered = msgs.filter(
        (m) => m.type === "image" || m.type === "file",
      );
      console.log("[DEBUG] msgs directly from API:", msgs.length, "filtered:", filtered.length);
      setMediaMessages(filtered);
    } catch (err) {
      console.error("Lỗi lấy lịch sử media cho InfoPanel:", err);
    }
  }, [conversationId]);

  /* ─── Fetch conversation info ─── */
  const fetchConversationInfo = useCallback(async () => {
    if (!conversationId || conversationId === BOT_ID) return;
    try {
      const data: any = await groupService.getGroupById(conversationId);
      const g = data?.data || data;
      if (!g) return;

      let displayName = g.name;
      let displayAvatar = g.groupAvatar;

      const currentUserId =
        currentUser?.id || currentUser?._id || currentUser?.userId;
      if (!g.isGroup && currentUserId && g.members) {
        const other = g.members.find((m: any) => m.userId !== currentUserId);
        if (other) {
          try {
            const res: any = await axiosClient.get(`/users/${other.userId}`);
            const u = res?.data?.data || res?.data || res;
            if (u) {
              displayName =
                u.fullName ||
                (u as any).displayName ||
                (u as any).username ||
                (u as any).name ||
                "Người dùng";
              displayAvatar = u.avatar || displayAvatar;
            }
          } catch (error) {
            console.error("Lỗi lấy thông tin other user trong 1-1 chat", error);
          }
        }
      }

      setConversationInfo({ ...g, displayName, displayAvatar });
      // Fetch media history specifically for InfoPanel
      fetchMediaHistory();
    } catch (err) {
      console.error("Lỗi lấy thông tin cuộc hội thoại:", err);
    }
  }, [conversationId, currentUser, fetchMediaHistory]);

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
            (m) => m._id === newMsg._id || m._id.startsWith("temp_"),
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

        // Cập nhật media/files cho InfoPanel
        if (newMsg.type === "image" || newMsg.type === "file") {
          setMediaMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [newMsg, ...prev];
          });
        }

        // Nếu tin từ người khác → đánh dấu đã đọc
        const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
        if (myId && String(newMsg.senderId) !== String(myId)) {
          messageService.markAsRead(activeConvoId).catch(console.error);
        }
      }
    });

    // Lắng nghe đối phương đã đọc
    socketService.off("messages-read");
    socketService.onMessagesRead((data) => {
      if (String(data.conversationId) === String(conversationIdRef.current)) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });

    // Lắng nghe thay đổi cảm xúc
    socketService.off("message-reaction-updated");
    socketService.onMessageReactionUpdated((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    });

    // Lắng nghe thu hồi tin nhắn
    socketService.off("message-revoked");
    socketService.onMessageRevoked((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? {
              ...m,
              isRevoked: true,
              revokedAt: data.revokedAt || new Date().toISOString(),
            }
            : m,
        ),
      );
    });

    // Lắng nghe ghim/bỏ ghim tin nhắn real-time
    socketService.off("message-pinned");
    socketService.onMessagePinned((data: any) => {
      // data: { messageId, isPinned, conversationId }
      if (String(data.conversationId) === String(conversationIdRef.current)) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m,
          ),
        );
      }
    });

    // Lắng nghe cập nhật tin nhắn (VD: thu hồi 1 ảnh trong album)
    socketService.off("message-updated");
    socketService.onMessageUpdated((newMsg: any) => {
      if (String(newMsg.conversationId) === String(conversationIdRef.current)) {
        setMessages((prev) =>
          prev.map((m) => (m._id === newMsg._id ? newMsg : m)),
        );
      }
    });

    // --- REALTIME INFO PANEL & CONVERSATION SYNC ---
    // Lắng nghe cập nhật thông tin nhóm/cuộc trò chuyện
    socketService.off("GROUP_UPDATED");
    socketService.onGroupUpdated((data: any) => {
      const activeConvoId = conversationIdRef.current;
      const updatedConvoId = data._id || data.conversationId || data.id;
      if (String(updatedConvoId) === String(activeConvoId)) {
        console.log("🔄 [Realtime] Group updated, refreshing info...");
        fetchConversationInfo();
      }
    });

    socketService.off("CONVERSATION_UPDATED");
    socketService.onConversationUpdated((data: any) => {
      const activeConvoId = conversationIdRef.current;
      const updatedConvoId = data._id || data.conversationId || data.id;
      if (String(updatedConvoId) === String(activeConvoId)) {
        console.log("🔄 [Realtime] Conversation updated, refreshing info...");
        fetchConversationInfo();
      }
    });

    // Lắng nghe giải tán nhóm hoặc bị mời ra khỏi nhóm
    socketService.off("CONVERSATION_REMOVED");
    socketService.onConversationRemoved((data: any) => {
      const activeConvoId = conversationIdRef.current;
      if (String(data.conversationId) === String(activeConvoId)) {
        const reason = data.reason || "removed";
        const groupName = data.groupName || "cuộc trò chuyện";

        if (reason === "leave") return; // Tự rời thì đã handle ở button click

        toast.info(
          reason === "delete"
            ? `Nhóm "${groupName}" đã được giải tán`
            : `Bạn đã không còn là thành viên của nhóm "${groupName}"`,
        );
        router.replace("/chat");
      }
    });

    return () => {
      socketService.off("message-received");
      socketService.off("messages-read");
      socketService.off("message-reaction-updated");
      socketService.off("message-revoked");
      socketService.off("message-pinned");
      socketService.off("message-updated");
      socketService.off("GROUP_UPDATED");
      socketService.off("CONVERSATION_UPDATED");
      socketService.off("CONVERSATION_REMOVED");
    };
  }, [conversationId, currentUser]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  // Khi messages thay đổi, cập nhật pinnedMessages nếu có
  useEffect(() => {
    const pinned = messages.filter((m) => m.isPinned);
    setPinnedMessages(pinned);
  }, [messages]);
  // Xử lý ghim/bỏ ghim tin nhắn
  // Ghim/bỏ ghim: chỉ bỏ ghim tin này, không giới hạn 1 tin ghim
  const handlePinMessage = async (msg: MessageDTO) => {
    setActiveMenu(null);
    if (msg.isPinned) {
      const updated = await messageService.pinMessage(msg._id, false);
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, isPinned: false } : m)),
        );
      }
    } else {
      const updated = await messageService.pinMessage(msg._id, true);
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, isPinned: true } : m)),
        );
      }
    }
  };

  useEffect(() => {
    if (conversationId && currentUser) {
      fetchConversationInfo();
    }
  }, [conversationId, currentUser, fetchConversationInfo]);

  const handleStartCall = useCallback(
    (isVideo: boolean, forcedInviteeIds?: string[]) => {
      if (conversationInfo?.isGroup && !forcedInviteeIds) {
        setShowCallMemberSelector({ isVideo });
        setSelectedCallMembers([]);
        return;
      }

      startCall(
        conversationId, 
        isVideo, 
        !!conversationInfo?.isGroup,
        conversationInfo?.displayName,
        conversationInfo?.displayAvatar,
        forcedInviteeIds,
        conversationInfo?.members
      );
    },
    [conversationId, conversationInfo, startCall],
  );

  const confirmGroupCall = (selectedIds: string[]) => {
    const isVideo = showCallMemberSelector?.isVideo || false;
    setShowCallMemberSelector(null);
    handleStartCall(isVideo, selectedIds);
  };

  // Handle call query param
  useEffect(() => {
    const callParam = searchParams.get("call");
    if (
      !callParam ||
      callState.active ||
      !conversationId ||
      !currentUser ||
      !myId
    )
      return;

    if (callParam === "video") {
      handleStartCall(true);
      router.replace(`/chat/${conversationId}`);
    } else if (callParam === "audio") {
      handleStartCall(false);
      router.replace(`/chat/${conversationId}`);
    }
  }, [
    searchParams,
    callState.active,
    conversationId,
    currentUser,
    myId,
    handleStartCall,
    router,
  ]);

  /* ─── Fetch user info for group members who sent messages ─── */
  useEffect(() => {
    if (conversationInfo?.isGroup) {
      const currentUserId =
        currentUser?.id || currentUser?._id || currentUser?.userId;
      const uniqueSenders = Array.from(
        new Set(messages.map((m) => m.senderId)),
      );
      uniqueSenders.forEach((id) => {
        if (id && id !== currentUserId) fetchUserInfo(id);
      });
    }
  }, [messages, conversationInfo?.isGroup, currentUser]);

  /* ─── Auto scroll to bottom ─── */
  useEffect(() => {
    if (!messagesEndRef.current || messages.length === 0 || isLoadingHistoryRef.current) return;

    if (isInitialLoad) {
      // Nhảy ngay lập tức cho lần đầu
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        setIsInitialLoad(false);
      }, 100);
    } else {
      // Chỉ tự động cuộn xuống nếu đang ở gần đáy (trong khoảng 200px)
      const container = scrollContainerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        // Kiểm tra xem có đang ở gần đáy không
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages, isInitialLoad]);

  /* ─── Infinite Scroll Observer ─── */
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !hasMore || isInitialLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreHistory) {
          loadMoreHistory();
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMoreHistory, loadMoreHistory, isInitialLoad]);

  const handleImageLoad = useCallback(() => {
    if (isInitialLoad || isLoadingHistoryRef.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 300;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  /* ─── Reactions ─── */
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMenu(null);
    try {
      await messageService.reactToMessage(messageId, emoji);
    } catch (error) {
      console.error("Lỗi toggle cảm xúc:", error);
    }
  };

  /* ─── Revoke Message (Thu hồi) ─── */
  const handleRevoke = async (messageId: string) => {
    setActiveMenu(null);
    try {
      const ok = await messageService.revokeMessage(messageId);
      if (ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isRevoked: true, revokedAt: new Date().toISOString() }
              : m,
          ),
        );
      }
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
    }
  };

  /* ─── Delete Message For Me (Xóa 1 phía) ─── */
  const handleDeleteForMe = async (messageId: string) => {
    setActiveMenu(null);
    try {
      // Optimistic Update: Xóa ngay ở local UI
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      await messageService.deleteMessageForMe(messageId);
    } catch (error) {
      console.error("Lỗi xóa tin nhắn phía tôi:", error);
    }
  };

  // /* ─── Download File/Image ─── */
  // const handleDownload = async (url: string, fileName: string) => {
  //   try {
  //     const response = await fetch(url);
  //     const blob = await response.blob();
  //     const blobUrl = window.URL.createObjectURL(blob);
  //     const link = document.createElement("a");
  //     link.href = blobUrl;
  //     link.download = fileName || "download";
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(blobUrl);
  //   } catch (error) {
  //     console.error("Lỗi tải tệp:", error);
  //   }
  // };

  /* ─── Download File/Image ─── */
  const handleDownload = async (url: string, fileName: string) => {
    try {
      // Thêm { cache: 'no-cache' } hoặc thêm một tham số ngẫu nhiên vào URL
      const response = await fetch(`${url}?t=${new Date().getTime()}`, {
        method: "GET",
        cache: "no-cache", // Ép trình duyệt không dùng cache cũ
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Lỗi tải tệp:", error);
    }
  };

  /* ─── Download Album as ZIP ─── */
  const handleDownloadAlbum = async (msg: MessageDTO) => {
    if (!msg.metadata?.imageGroup) return;
    const myId =
      currentUser?.id || currentUser?._id || currentUser?.userId || "me";
    const availableImages = (msg.metadata!.imageGroup as any[]).filter(
      (img: any) => !img.isRevoked && !img.deletedByUsers?.includes(myId),
    );
    if (availableImages.length === 0) {
      alert("Không có ảnh nào khả dụng để tải!");
      return;
    }

    try {
      const zip = new JSZip();

      // Fetch tất cả ảnh song song
      const results = await Promise.all(
        availableImages.map(async (img: any, i: number) => {
          const fileName = img.fileName || `image_${i + 1}.png`;
          const response = await fetch(`${img.url}?t=${Date.now()}`, {
            method: "GET",
            cache: "no-cache",
          });
          if (!response.ok) return null;
          const blob = await response.blob();
          return { fileName, blob };
        }),
      );

      // Thêm vào ZIP
      results.forEach((r) => {
        if (r) zip.file(r.fileName, r.blob);
      });

      // Tạo và tải file ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `album_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi tải album:", err);
      alert("Không thể tải album. Vui lòng thử lại.");
    }
  };

  /* ─── Clear History & Group Management ─── */
  const handleClearHistory = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch sử trò chuyện này?")) return;
    try {
      await groupService.clearConversation(conversationId);
      setMessages([]);
      alert("Đã xóa lịch sử trò chuyện.");
    } catch (err) {
      console.error("Lỗi xóa lịch sử:", err);
      alert("Không thể xóa lịch sử trò chuyện.");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Bạn có chắc chắn muốn rời khỏi nhóm này?")) return;
    try {
      const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
      if (!myId) return;
      await groupService.removeMember(conversationId, myId);
      alert("Đã rời nhóm.");
      router.push("/chat");
    } catch (err) {
      console.error("Lỗi rời nhóm:", err);
      alert("Không thể rời nhóm.");
    }
  };

  const handleDisbandGroup = async () => {
    if (
      !confirm(
        "CẢNH BÁO: Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      )
    )
      return;
    try {
      await groupService.deleteGroup(conversationId);
      alert("Nhóm đã bị giải tán.");
      router.push("/chat");
    } catch (err) {
      console.error("Lỗi giải tán nhóm:", err);
      alert("Không thể giải tán nhóm.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Xác nhận mời thành viên này ra khỏi nhóm?")) return;
    try {
      await groupService.removeMember(conversationId, userId);
      toast.success("Đã mời thành viên ra khỏi nhóm");
      handleRefreshData();
    } catch (err) {
      console.error("Lỗi xóa thành viên:", err);
      toast.error("Không thể xóa thành viên.");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await groupService.updateRole(conversationId, userId, newRole);
      toast.success("Đã cập nhật vai trò thành công");
      handleRefreshData();
    } catch (err) {
      console.error("Lỗi cập nhật vai trò:", err);
      toast.error("Không thể cập nhật vai trò.");
    }
  };

  const handleAssignLeader = async (userId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho người này? Bạn sẽ trở thành thành viên thường.",
      )
    )
      return;
    try {
      await groupService.assignLeader(conversationId, userId);
      toast.success("Đã chuyển quyền trưởng nhóm thành công");
      handleRefreshData();
    } catch (err) {
      console.error("Lỗi chuyển trưởng nhóm:", err);
      toast.error("Không thể chuyển quyền trưởng nhóm.");
    }
  };

  const handleRefreshData = useCallback(async () => {
    await fetchConversationInfo();
  }, [fetchConversationInfo]);

  /* ─── Send message ─── */
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !conversationId || sending) return;

    const myId =
      currentUser?.id || currentUser?._id || currentUser?.userId || "me";

    setSending(true);
    setMessageText("");
    const currentReply = replyingTo;
    setReplyingTo(null);

    // Optimistic UI — thêm tin tạm thời ngay lập tức
    const tempId = `temp_${Date.now()}`;
    const tempMsg: MessageDTO = {
      _id: tempId,
      conversationId,
      senderId: myId,
      senderName: currentUser?.fullName || "Tôi",
      type: "text",
      content: text,
      isRead: false,
      replyTo: currentReply
        ? {
          messageId: currentReply._id,
          senderId: currentReply.senderId,
          senderName: getSenderDisplayName(
            currentReply.senderId,
            currentReply,
          ),
          content:
            currentReply.type === "file"
              ? currentReply.metadata?.fileName || currentReply.content
              : currentReply.content,
          type: currentReply.type,
        }
        : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await messageService.sendMessage({
        conversationId,
        content: text,
        type: "text",
        senderName: currentUser?.fullName || "Tôi",
        replyTo: currentReply
          ? {
            messageId: currentReply._id,
            senderId: currentReply.senderId,
            senderName: getSenderDisplayName(
              currentReply.senderId,
              currentReply,
            ),
            content:
              currentReply.type === "file"
                ? currentReply.metadata?.fileName || currentReply.content
                : currentReply.content,
            type: currentReply.type,
          }
          : undefined,
      });
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setMessageText(text);
      setReplyingTo(currentReply);
    } finally {
      setSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // ─── Handle file upload ───
  const handleFileButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleImageButtonClick = () => {
    if (imageInputRef.current) imageInputRef.current.value = "";
    imageInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (
      !filesList ||
      filesList.length === 0 ||
      !conversationId ||
      uploadingFile
    )
      return;
    if (filesList.length > 20) {
      alert("Chỉ được gửi tối đa 20 file mỗi lần!");
      return;
    }

    const files = Array.from(filesList);
    // Kiểm tra từng file dưới 100MB
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) {
        alert(
          `File "${file.name}" vượt quá 100MB, vui lòng chọn file nhỏ hơn.`,
        );
        return;
      }
    }

    setUploadingFile(true);
    const myId =
      currentUser?.id || currentUser?._id || currentUser?.userId || "me";
    const currentReply = replyingTo;
    setReplyingTo(null);

    // Tách ảnh và file
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const otherFiles = files.filter((f) => !f.type.startsWith("image/"));

    try {
      // 1. Xử lý gửi ALBUM ảnh (nếu có nhiều hơn 1 ảnh)
      if (imageFiles.length > 1) {
        const tempId = `temp_album_${Date.now()}`;
        const dimensions = await Promise.all(
          imageFiles.map((f) => getImageDimensions(f)),
        );
        const widths = dimensions.map((d) => d.width);
        const heights = dimensions.map((d) => d.height);

        const tempMsg: MessageDTO = {
          _id: tempId,
          conversationId,
          senderId: myId,
          senderName: currentUser?.fullName || "Tôi",
          type: "image",
          content: "[Album Ảnh]",
          isRead: false,
          metadata: {
            imageGroup: imageFiles.map((f, i) => ({
              url: URL.createObjectURL(f), // preview local
              width: widths[i],
              height: heights[i],
              fileName: f.name,
              isRevoked: false,
              deletedByUsers: [],
            })),
          },
          replyTo: currentReply
            ? {
              messageId: currentReply._id,
              senderId: currentReply.senderId,
              senderName: getSenderDisplayName(
                currentReply.senderId,
                currentReply,
              ),
              content:
                currentReply.type === "file"
                  ? currentReply.metadata?.fileName || currentReply.content
                  : currentReply.content,
              type: currentReply.type,
            }
            : undefined,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, tempMsg]);

        try {
          await messageService.uploadImages(
            conversationId,
            imageFiles,
            widths,
            heights,
            currentReply,
            currentUser?.fullName || "Tôi",
          );
        } catch (err) {
          console.error("Lỗi gửi album ảnh:", err);
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } else if (imageFiles.length === 1) {
        // Gửi 1 ảnh lẻ như cũ hoặc dùng album 1 ảnh
        otherFiles.unshift(imageFiles[0]);
      }

      // 2. Xử lý các file còn lại (gửi lẻ từng tin như cũ)
      for (let i = 0; i < otherFiles.length; i++) {
        const file = otherFiles[i];
        const tempId = `temp_file_${Date.now()}_${i}`;
        const tempMsg: MessageDTO = {
          _id: tempId,
          conversationId,
          senderId: myId,
          senderName: currentUser?.fullName || "Tôi",
          type: file.type.startsWith("image/") ? "image" : "file",
          content: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
          isRead: false,
          replyTo: currentReply
            ? {
              messageId: currentReply._id,
              senderId: currentReply.senderId,
              senderName: getSenderDisplayName(
                currentReply.senderId,
                currentReply,
              ),
              content:
                currentReply.type === "file"
                  ? currentReply.metadata?.fileName || currentReply.content
                  : currentReply.content,
              type: currentReply.type,
            }
            : undefined,
          createdAt: new Date().toISOString(),
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
        };
        setMessages((prev) => [...prev, tempMsg]);
        try {
          await messageService.uploadFile(
            conversationId,
            file,
            currentReply,
            currentUser?.fullName || "Tôi",
          );
        } catch (err) {
          console.error("Lỗi gửi file:", err);
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };


  /* ─── Send sticker ─── */
  const handleSendSticker = async (stickerUrl: string) => {
    if (!stickerUrl || !conversationId || sending) return;

    const myId =
      currentUser?.id || currentUser?._id || currentUser?.userId || "me";

    setSending(true);
    const currentReply = replyingTo;
    setReplyingTo(null);

    // Optimistic UI
    const tempId = `temp_sticker_${Date.now()}`;
    const tempMsg: MessageDTO = {
      _id: tempId,
      conversationId,
      senderId: myId,
      senderName:
        currentUser?.fullName ||
        "Tôi",
      type: "image",
      content: stickerUrl,
      isRead: false,
      metadata: { isSticker: true },
      replyTo: currentReply
        ? {
          messageId: currentReply._id,
          senderId: currentReply.senderId,
          senderName: getSenderDisplayName(
            currentReply.senderId,
            currentReply,
          ),
          content:
            currentReply.type === "file"
              ? currentReply.metadata?.fileName || currentReply.content
              : currentReply.content,
          type: currentReply.type,
        }
        : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await messageService.sendMessage({
        conversationId,
        content: stickerUrl,
        type: "image",
        senderName:
          currentUser?.fullName ||
          "Tôi",
        metadata: { isSticker: true },
        replyTo: currentReply
          ? {
            messageId: currentReply._id,
            senderId: currentReply.senderId,
            senderName: getSenderDisplayName(
              currentReply.senderId,
              currentReply,
            ),
            content:
              currentReply.type === "file"
                ? currentReply.metadata?.fileName || currentReply.content
                : currentReply.content,
            type: currentReply.type,
          }
          : undefined,
      });
    } catch (err) {
      console.error("Lỗi gửi sticker:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ─── Group messages: cùng sender + cách nhau < 5 phút = 1 group ───
  interface MsgGroup {
    isMine: boolean;
    senderId: string;
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

      const isSystem = (msg.type as any) === "system";
      const lastIsSystem = (lastMsg?.type as any) === "system";

      // Nhóm theo SENDER ID để tránh gộp nhiều người khác vào 1 khối trong group chat
      // Không gộp nếu là tin nhắn hệ thống hoặc tin nhắn trước đó là hệ thống
      if (
        last &&
        last.senderId === msg.senderId &&
        gap < FIVE_MIN &&
        !isSystem &&
        !lastIsSystem
      ) {
        last.messages.push(msg);
      } else {
        groups.push({ isMine, senderId: msg.senderId, messages: [msg] });
      }
    }
    return groups;
  }, [messages, myId]);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */

  const avatarMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(userCache).map(([k, v]) => [k, v.avatar]),
      ),
    [userCache],
  );

  return (
    <>
      {conversationId === BOT_ID ? (
        <BotChatArea currentUser={currentUser} />
      ) : (
        <>
          {/* ═══ CỘT GIỮA: NỘI DUNG CHAT ═══ */}
          <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
            {/* Chat Header */}
            <div className="h-19 px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conversationInfo?.displayAvatar ? (
                    <img
                      src={getMediaUrl(conversationInfo.displayAvatar)}
                      alt={conversationInfo.displayName || ""}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : conversationInfo?.isGroup ? (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-[15px]">
                      {(
                        conversationInfo?.displayName ||
                        conversationInfo?.name ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[15px]">
                      {(
                        conversationInfo?.displayName ||
                        conversationInfo?.name ||
                        "?"
                      )
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
                <button
                  onClick={() => handleStartCall(false)}
                  className="hover:text-black transition"
                >
                  <PhoneIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleStartCall(true)}
                  className="hover:text-black transition"
                >
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

            {/* Pinned Messages (nếu có) */}
            {pinnedMessages.length === 1 && (
              <div className="px-6 pt-3 pb-1">
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 shadow-sm">
                  <MapPinIcon className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-yellow-800 truncate">
                      {pinnedMessages[0].type === "text"
                        ? pinnedMessages[0].content
                        : pinnedMessages[0].type === "file"
                          ? pinnedMessages[0].metadata?.fileName ||
                          "Tệp đính kèm"
                          : pinnedMessages[0].type === "image"
                            ? "[Ảnh]"
                            : "[Tin nhắn hệ thống]"}
                    </div>
                    <div className="text-[11px] text-yellow-700">
                      {getSenderDisplayName(pinnedMessages[0].senderId)} •{" "}
                      {formatTime(pinnedMessages[0].createdAt)}
                    </div>
                  </div>
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
                    title="Bỏ ghim"
                    onClick={() => handlePinMessage(pinnedMessages[0])}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {pinnedMessages.length > 1 && (
              <div className="px-6 pt-3 pb-1">
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 shadow-sm">
                  <MapPinIcon className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-yellow-800 truncate">
                      {pinnedMessages[0].type === "text"
                        ? pinnedMessages[0].content
                        : pinnedMessages[0].type === "file"
                          ? pinnedMessages[0].metadata?.fileName ||
                          "Tệp đính kèm"
                          : pinnedMessages[0].type === "image"
                            ? "[Ảnh]"
                            : "[Tin nhắn hệ thống]"}
                    </div>
                    <div className="text-[11px] text-yellow-700">
                      {getSenderDisplayName(pinnedMessages[0].senderId)} •{" "}
                      {formatTime(pinnedMessages[0].createdAt)}
                    </div>
                  </div>
                  <button
                    className="ml-2 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold hover:bg-yellow-200"
                    onClick={() => setShowPinnedModal(true)}
                  >
                    Xem {pinnedMessages.length} tin nhắn đã ghim
                  </button>
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
                    title="Bỏ ghim"
                    onClick={() => handlePinMessage(pinnedMessages[0])}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Modal xem tất cả tin nhắn ghim */}
            {showPinnedModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
                  <button
                    className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
                    onClick={() => setShowPinnedModal(false)}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5 text-yellow-500" /> Tin nhắn
                    đã ghim
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pinnedMessages.map((msg) => (
                      <div
                        key={msg._id}
                        className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-yellow-800 truncate">
                            {msg.type === "text"
                              ? msg.content
                              : msg.type === "file"
                                ? msg.metadata?.fileName || "Tệp đính kèm"
                                : msg.type === "image"
                                  ? "[Ảnh]"
                                  : "[Tin nhắn hệ thống]"}
                          </div>
                          <div className="text-[11px] text-yellow-700">
                            {getSenderDisplayName(msg.senderId)} •{" "}
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                        <button
                          className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
                          title="Bỏ ghim"
                          onClick={() => handlePinMessage(msg)}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal chọn thành viên gọi nhóm */}
            <GroupCallSelector 
              isOpen={!!showCallMemberSelector}
              onClose={() => setShowCallMemberSelector(null)}
              onConfirm={confirmGroupCall}
              members={conversationInfo?.members || []}
              myId={myId || ""}
              userCache={userCache}
              isVideo={showCallMemberSelector?.isVideo || false}
            />

            {/* Floating Chat Summary Button */}
            {conversationId !== "alo-bot" && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex justify-center w-full">
                <div className="pointer-events-auto">
                  <ChatSummaryButton
                    conversationId={conversationId}
                    userId={myId || ""}
                    messages={messages}
                  />
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide"
            >
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
                  {/* Top Sentinel for Infinite Scroll */}
                  <div ref={topSentinelRef} className="h-4 w-full" />

                  {/* Loading History Spinner */}
                  {loadingMoreHistory && (
                    <div className="flex justify-center p-4">
                      <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  )}

                  {messageGroups.map((group, groupIdx) => {
                    const { isMine, messages: gMsgs, senderId } = group;

                    // Tin cuối cùng của nhóm — để lấy senderName/avatar và timestamp + trạng thái
                    const lastMsg = gMsgs[gMsgs.length - 1];

                    if (
                      lastMsg.type === "system" &&
                      !lastMsg.metadata?.callType
                    ) {
                      return (
                        <div
                          key={`group-${groupIdx}`}
                          className="flex justify-center my-4 w-full px-10"
                        >
                          <div className="flex flex-col items-center gap-1.5 max-w-full">
                            {gMsgs.map((msg) => (
                              <div
                                key={msg._id}
                                className="bg-gray-100 px-4 py-1.5 rounded-full shadow-sm border border-gray-200/50 max-w-full"
                              >
                                <span className="text-[12px] text-gray-500 font-bold text-center block">
                                  {msg.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    const senderName = getSenderDisplayName(senderId, lastMsg);
                    let senderAvatar = "";

                    if (conversationInfo?.isGroup && !isMine) {
                      senderAvatar = userCache[senderId]?.avatar || "";
                    } else {
                      senderAvatar = conversationInfo?.displayAvatar || "";
                    }

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
                              id={`msg-${msg._id}`}
                              className={`flex items-center gap-1.5 transition-colors duration-500 ${isMine ? "flex-row-reverse" : "flex-row"
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
                                setActiveMenu(null);
                              }}
                            >
                              {/* Avatar placeholder */}
                              <div className="w-8 shrink-0">
                                {!isMine &&
                                  isLast &&
                                  (senderAvatar ? (
                                    <img
                                      src={senderAvatar}
                                      alt={senderName}
                                      title={senderName}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px]"
                                      title={senderName}
                                    >
                                      {senderName.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                              </div>
                              {/* Bubble */}
                              <div
                                className={`relative max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}
                              >
                                {/* System messages (General & Call) */}
                                {(msg.type as any) === "system" ? (
                                  msg.metadata?.callType ? (
                                    <CallSystemMessage
                                      isMine={isMine}
                                      metadata={msg.metadata as any}
                                      createdAt={msg.createdAt}
                                      onCallAgain={(isVideo) =>
                                        handleStartCall(isVideo)
                                      }
                                    />
                                  ) : (
                                    <div className="flex justify-center w-full my-4 px-10">
                                      <div className="bg-gray-100/50 backdrop-blur-sm text-gray-500 text-[11px] font-bold py-1.5 px-4 rounded-full border border-gray-200/50 shadow-sm text-center uppercase tracking-tight">
                                        {msg.content}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div
                                    className={`relative max-w-full flex flex-col p-1.5 px-2 border shadow-sm ${isMine
                                      ? "bg-blue-50/80 border-blue-100 shadow-blue-900/5 items-end"
                                      : "bg-white border-gray-100 shadow-gray-900/5 items-start"
                                      } ${bubbleRadius}`}
                                  >
                                    {/* Reply Quote Box */}
                                    {msg.replyTo &&
                                      msg.replyTo.messageId &&
                                      !isRevoked && (
                                        <div
                                          className={`mb-2 px-3 py-2 border-l-[3px] border-blue-600 ${isMine
                                            ? "bg-white/50"
                                            : "bg-blue-50/50"
                                            } rounded-r-lg text-left cursor-pointer hover:bg-white/80 transition-colors w-full min-w-[150px] max-w-full overflow-hidden`}
                                          onClick={() => {
                                            const targetMsg =
                                              document.getElementById(
                                                `msg-${msg.replyTo?.messageId}`,
                                              );
                                            targetMsg?.scrollIntoView({
                                              behavior: "smooth",
                                              block: "center",
                                            });
                                            targetMsg?.classList.add(
                                              "bg-yellow-100/50",
                                            );
                                            setTimeout(
                                              () =>
                                                targetMsg?.classList.remove(
                                                  "bg-yellow-100/50",
                                                ),
                                              2000,
                                            );
                                          }}
                                        >
                                          <div className="flex gap-2.5 items-center">
                                            {msg.replyTo.type === "image" && (
                                              <img
                                                src={msg.replyTo.content}
                                                alt="reply"
                                                className="w-10 h-10 object-cover rounded-md shrink-0 border border-gray-100"
                                              />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[13px] font-bold text-gray-800 truncate">
                                                {getSenderDisplayName(
                                                  msg.replyTo.senderId,
                                                )}
                                              </p>
                                              <p className="text-[13px] text-gray-500 line-clamp-1 leading-tight mt-0.5 whitespace-normal">
                                                {msg.replyTo.type === "image"
                                                  ? "[Hình ảnh]"
                                                  : msg.replyTo.type === "file"
                                                    ? msg.replyTo.content.startsWith(
                                                      "http",
                                                    )
                                                      ? "[Tệp tin]"
                                                      : msg.replyTo.content
                                                    : msg.replyTo.content}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                    {msg.type === "image" && msg.metadata?.isSticker ? (
                                      /* RENDER STICKER */
                                      <div className="p-1">
                                        <img
                                          src={msg.content}
                                          alt="sticker"
                                          className="w-[150px] h-[150px] object-contain"
                                        />
                                      </div>
                                    ) : msg.type === "image" ? (
                                      <div className="w-full">

                                        {msg.metadata?.imageGroup ? (
                                          (() => {
                                            // 1. Lọc ra danh sách ảnh thực sự đang được hiển thị
                                            const visibleImages = (
                                              msg.metadata?.imageGroup || []
                                            ).filter(
                                              (img: any) =>
                                                !img.deletedByUsers?.includes(
                                                  myId,
                                                ),
                                            );

                                            if (visibleImages.length === 0)
                                              return null;

                                            const firstImg = visibleImages[0];
                                            const count = visibleImages.length;
                                            const isPortrait = firstImg
                                              ? firstImg.height > firstImg.width
                                              : false;

                                            // 2. Logic số cột linh hoạt dựa trên số ảnh THỰC TẾ đang có
                                            let numCols = 2;
                                            let gridCols = "grid-cols-2";
                                            if (count === 1) {
                                              gridCols = "grid-cols-1";
                                              numCols = 1;
                                            } else if (count === 3) {
                                              gridCols = "grid-cols-3";
                                              numCols = 3;
                                            } else if (
                                              count >= 4 &&
                                              isPortrait
                                            ) {
                                              gridCols = "grid-cols-4";
                                              numCols = 4;
                                            } else if (
                                              count >= 4 &&
                                              !isPortrait
                                            ) {
                                              gridCols = "grid-cols-2";
                                              numCols = 2;
                                            }

                                            // Tỷ lệ khung hình: giới hạn để không quá dài/dẹp
                                            let aspectR = 1;
                                            if (
                                              firstImg &&
                                              firstImg.width &&
                                              firstImg.height
                                            ) {
                                              aspectR =
                                                firstImg.width /
                                                firstImg.height;
                                              if (count > 1) {
                                                aspectR = Math.max(
                                                  0.7,
                                                  Math.min(aspectR, 1.5),
                                                );
                                              }
                                            }

                                            // Tính width cố định cho grid dựa trên kích thước ảnh gốc
                                            // Chỉ dùng khi TẤT CẢ ảnh đều bị thu hồi (placeholder)
                                            const allRevoked =
                                              msg.isRevoked ||
                                              visibleImages.every(
                                                (img: any) => img.isRevoked,
                                              );
                                            const baseImgW =
                                              firstImg?.width || 200;
                                            const baseImgH =
                                              firstImg?.height || 200;
                                            const cellHeight = Math.min(
                                              200,
                                              baseImgH,
                                            );
                                            const cellWidth =
                                              cellHeight *
                                              (baseImgW / baseImgH);
                                            const gap = 4;
                                            let computedGridWidth =
                                              cellWidth * numCols +
                                              gap * (numCols - 1);
                                            if (count === 1 && isPortrait)
                                              computedGridWidth = Math.min(
                                                computedGridWidth,
                                                280,
                                              );
                                            computedGridWidth = Math.min(
                                              computedGridWidth,
                                              420,
                                            );

                                            return (
                                              <div
                                                className={`grid gap-1 ${allRevoked ? "" : "w-full"} ${gridCols}`}
                                                style={{
                                                  ...(allRevoked
                                                    ? {
                                                      width: `${computedGridWidth}px`,
                                                      maxWidth: "100%",
                                                    }
                                                    : {
                                                      maxWidth:
                                                        count === 1 &&
                                                          isPortrait
                                                          ? "280px"
                                                          : "100%",
                                                    }),
                                                  maxHeight: "420px",
                                                  overflow: "hidden",
                                                }}
                                              >
                                                {visibleImages.map(
                                                  (img: any, idx: number) => {
                                                    // Rock-solid: Một tấm ảnh bị coi là thu hồi nếu:
                                                    // 1. Cả tin nhắn bị thu hồi (msg.isRevoked = true)
                                                    // 2. HOẶC chính nó bị thu hồi lẻ (img.isRevoked = true)
                                                    const shouldShowPlaceholder =
                                                      msg.isRevoked ||
                                                      img.isRevoked;

                                                    // Tìm lại index nguyên thủy trong mảng gốc
                                                    const originalIdx =
                                                      msg.metadata?.imageGroup?.findIndex(
                                                        (orig: any) =>
                                                          orig.url === img.url,
                                                      );

                                                    // CHÌA KHÓA: Giữ đúng kích thước gốc bằng aspectRatio của từng tấm
                                                    const itemAspect =
                                                      img.width && img.height
                                                        ? `${img.width}/${img.height}`
                                                        : aspectR;

                                                    return (
                                                      <div
                                                        key={idx}
                                                        className="relative group/img rounded-lg overflow-hidden bg-gray-200 cursor-pointer flex items-center justify-center w-full"
                                                        style={{
                                                          aspectRatio:
                                                            itemAspect,
                                                        }}
                                                        onClick={() =>
                                                          !shouldShowPlaceholder &&
                                                          setActiveAlbumIndex({
                                                            messageId: msg._id,
                                                            index:
                                                              originalIdx ?? 0,
                                                          })
                                                        }
                                                      >
                                                        {shouldShowPlaceholder ? (
                                                          <div className="text-center text-gray-400">
                                                            <PhotoIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                                            <span className="text-xs font-medium">
                                                              Đã thu hồi
                                                            </span>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            <img
                                                              src={getMediaUrl(
                                                                img.url,
                                                              )}
                                                              alt={`album-${idx}`}
                                                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                              onLoad={handleImageLoad}
                                                            />
                                                            {/* Individual actions overlay */}
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col gap-1">
                                                              {isMine &&
                                                                !img.isRevoked && (
                                                                  <button
                                                                    onClick={async (
                                                                      e,
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      if (
                                                                        confirm(
                                                                          "Thu hồi ảnh này?",
                                                                        )
                                                                      ) {
                                                                        // Optimistic Update
                                                                        setMessages(
                                                                          (
                                                                            prev,
                                                                          ) =>
                                                                            prev.map(
                                                                              (
                                                                                m,
                                                                              ) =>
                                                                                m._id ===
                                                                                  msg._id
                                                                                  ? {
                                                                                    ...m,
                                                                                    metadata:
                                                                                    {
                                                                                      ...m.metadata,
                                                                                      imageGroup:
                                                                                        m.metadata?.imageGroup?.map(
                                                                                          (
                                                                                            ig: any,
                                                                                            i: number,
                                                                                          ) =>
                                                                                            i ===
                                                                                              originalIdx
                                                                                              ? {
                                                                                                ...ig,
                                                                                                isRevoked: true,
                                                                                                revokedAt:
                                                                                                  new Date().toISOString(),
                                                                                              }
                                                                                              : ig,
                                                                                        ),
                                                                                    },
                                                                                  }
                                                                                  : m,
                                                                            ),
                                                                        );

                                                                        await messageService.revokeImageInGroup(
                                                                          msg._id,
                                                                          originalIdx ??
                                                                          0,
                                                                        );
                                                                      }
                                                                    }}
                                                                    className="p-1 bg-black/50 rounded text-white hover:bg-black/70"
                                                                    title="Thu hồi"
                                                                  >
                                                                    <ArrowUturnLeftIcon className="w-3 h-3" />
                                                                  </button>
                                                                )}
                                                              <button
                                                                onClick={async (
                                                                  e,
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  if (
                                                                    confirm(
                                                                      "Xóa ảnh này phía bạn?",
                                                                    )
                                                                  ) {
                                                                    await messageService.deleteImageInGroupForMe(
                                                                      msg._id,
                                                                      originalIdx ??
                                                                      0,
                                                                    );
                                                                    // Local update
                                                                    setMessages(
                                                                      (prev) =>
                                                                        prev.map(
                                                                          (
                                                                            m,
                                                                          ) =>
                                                                            m._id ===
                                                                              msg._id
                                                                              ? {
                                                                                ...m,
                                                                                metadata:
                                                                                {
                                                                                  ...m.metadata,
                                                                                  imageGroup:
                                                                                    m.metadata?.imageGroup?.map(
                                                                                      (
                                                                                        ig: any,
                                                                                        i: number,
                                                                                      ) =>
                                                                                        i ===
                                                                                          originalIdx
                                                                                          ? {
                                                                                            ...ig,
                                                                                            deletedByUsers:
                                                                                              [
                                                                                                ...(ig.deletedByUsers ||
                                                                                                  []),
                                                                                                myId,
                                                                                              ],
                                                                                          }
                                                                                          : ig,
                                                                                    ),
                                                                                },
                                                                              }
                                                                              : m,
                                                                        ),
                                                                    );
                                                                  }
                                                                }}
                                                                className="p-1 bg-black/50 rounded text-white hover:bg-black/70"
                                                                title="Xóa phía tôi"
                                                              >
                                                                <TrashIcon className="w-3 h-3" />
                                                              </button>
                                                            </div>
                                                          </>
                                                        )}
                                                      </div>
                                                    );
                                                  },
                                                )}
                                              </div>
                                            );
                                          })()
                                        ) : /* RENDER SINGLE IMAGE */
                                          isRevoked ? (
                                            (() => {
                                              const imgW =
                                                msg.metadata?.width || 300;
                                              const imgH =
                                                msg.metadata?.height || 200;
                                              const displayH = Math.min(
                                                420,
                                                imgH,
                                              );
                                              const displayW =
                                                displayH * (imgW / imgH);
                                              const isPortraitSingle =
                                                imgH > imgW;
                                              return (
                                                <div
                                                  className="bg-gray-200 rounded-lg flex items-center justify-center"
                                                  style={{
                                                    width: `${Math.min(displayW, isPortraitSingle ? 280 : 420)}px`,
                                                    maxWidth: "100%",
                                                    aspectRatio: `${imgW}/${imgH}`,
                                                  }}
                                                >
                                                  <div className="text-center text-gray-400">
                                                    <PhotoIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                                    <span className="text-xs font-medium">
                                                      Đã thu hồi
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })()
                                          ) : (
                                            <img
                                              src={getMediaUrl(msg.content)}
                                              alt="img"
                                              className="object-cover max-h-[420px] rounded-lg cursor-pointer"
                                              onLoad={handleImageLoad}
                                              onClick={() => {
                                                // For legacy single images, we can also use the album preview logic if we want
                                                // but let's keep it simple for now or set a dummy album
                                                setActiveAlbumIndex({
                                                  messageId: msg._id,
                                                  index: 0,
                                                });
                                              }}
                                            />
                                          )}
                                      </div>
                                    ) : isRevoked ? (
                                      <div className="flex items-center gap-2 group/revoked px-2 py-1">
                                        <span className="italic text-[12px] text-gray-400 block w-fit">
                                          Tin nhắn đã được thu hồi
                                        </span>
                                      </div>
                                    ) : (msg.type as any) === "system" &&
                                      msg.metadata
                                        ?.callType ? null /* Rendered outside bubble wrapper above */ : msg.type ===
                                          "file" ? (
                                      <div
                                        className={`flex items-center justify-between gap-4 px-2 py-1 transition w-80 max-w-full group`}
                                      >
                                        <div
                                          className="flex items-center gap-3 flex-1 min-w-0"
                                          onClick={() =>
                                            window.open(
                                              getMediaUrl(msg.content),
                                              "_blank",
                                            )
                                          }
                                        >
                                          <div className="w-10 h-12 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                                            <DocumentIcon className="w-6 h-6 text-white" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[14px] font-bold text-gray-800 truncate leading-tight">
                                              {msg.metadata?.fileName ||
                                                "Tệp đính kèm"}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(
                                              getMediaUrl(msg.content),
                                              msg.metadata?.fileName || "file",
                                            );
                                          }}
                                          className="w-8 h-8 bg-white border border-gray-100 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition"
                                        >
                                          <ArrowDownTrayIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className={`px-2 py-1 text-[15px] font-medium leading-relaxed text-gray-900 break-words whitespace-pre-wrap ${isMine ? "text-right" : "text-left"}`}
                                      >
                                        {msg.content}
                                      </div>
                                    )}

                                    {/* end: system call bypasses bubble wrapper */}
                                    {/* Hover Controls (Reaction & Menu & Redo) */}
                                    <div
                                      className={`absolute bottom-0 ${isMine ? "right-full pr-2" : "left-full pl-2"} flex items-center gap-1 z-[1000] ${hoveredMsgId === msg._id
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-2 pointer-events-none"
                                        } transition-all duration-200`}
                                    >
                                      {/* 1. Reaction Button */}
                                      {!msg.isRevoked && (
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenu(null);
                                              const rect =
                                                e.currentTarget.getBoundingClientRect();
                                              setMenuPosition(
                                                rect.top < window.innerHeight / 2
                                                  ? "bottom"
                                                  : "top",
                                              );
                                              setActiveReactionMenu(
                                                activeReactionMenu === msg._id
                                                  ? null
                                                  : msg._id,
                                              );
                                            }}
                                            className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                                          >
                                            <FaceSmileIcon className="w-4 h-4" />
                                          </button>

                                          {activeReactionMenu === msg._id && (
                                            <div
                                              className={`absolute z-50 flex gap-1 items-center p-1.5 bg-white rounded-full shadow-2xl border border-gray-100 right-0 ${menuPosition === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
                                              onMouseLeave={() =>
                                                setActiveReactionMenu(null)
                                              }
                                            >
                                              {msg.reactions?.some(
                                                (r: any) =>
                                                  String(r.userId) ===
                                                  String(
                                                    currentUser?.id ||
                                                    currentUser?._id ||
                                                    currentUser?.userId,
                                                  ),
                                              ) && (
                                                  <button
                                                    onClick={async () => {
                                                      setActiveReactionMenu(null);
                                                      await messageService.clearReactions(
                                                        msg._id,
                                                      );
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all rounded-full text-gray-400"
                                                  >
                                                    <XMarkIcon className="w-5 h-5" />
                                                  </button>
                                                )}
                                              {Object.entries(EMOJI_MAP).map(
                                                ([key, icon]) => (
                                                  <button
                                                    key={key}
                                                    onClick={() =>
                                                      handleToggleReaction(
                                                        msg._id,
                                                        key,
                                                      )
                                                    }
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 hover:scale-125 transition-all rounded-full text-lg"
                                                  >
                                                    {icon}
                                                  </button>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* 2. Reply Button */}
                                      {!msg.isRevoked && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(msg);
                                            inputRef.current?.focus();
                                          }}
                                          className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                                          title="Trả lời"
                                        >
                                          <ArrowUturnLeftIcon className="w-4 h-4" />
                                        </button>
                                      )}

                                      {/* 3. Context Menu Button */}
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveReactionMenu(null);
                                            const rect =
                                              e.currentTarget.getBoundingClientRect();
                                            setMenuPosition(
                                              rect.top < window.innerHeight / 2
                                                ? "bottom"
                                                : "top",
                                            );
                                            setActiveMenu(
                                              activeMenu === msg._id
                                                ? null
                                                : msg._id,
                                            );
                                          }}
                                          className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                                        >
                                          <EllipsisHorizontalIcon className="w-4 h-4" />
                                        </button>

                                        {activeMenu === msg._id && (
                                          <div
                                            className={`absolute z-50 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden right-0 ${menuPosition === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
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
                                            {!msg.isRevoked && (
                                              <button
                                                onClick={() => {
                                                  setActiveMenu(null);
                                                  setForwardingMessage(msg);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-green-600 hover:bg-green-50 transition text-left"
                                              >
                                                <PaperAirplaneIcon className="w-4 h-4 shrink-0" />
                                                Chuyển tiếp
                                              </button>
                                            )}
                                            {!msg.isRevoked && (
                                              <button
                                                onClick={() =>
                                                  handlePinMessage(msg)
                                                }
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-yellow-700 hover:bg-yellow-50 transition text-left"
                                              >
                                                <MapPinIcon
                                                  className={`w-4 h-4 shrink-0 ${msg.isPinned ? "text-yellow-500" : "text-gray-400"}`}
                                                />
                                                {msg.isPinned
                                                  ? "Bỏ ghim tin nhắn"
                                                  : "Ghim tin nhắn"}
                                              </button>
                                            )}
                                            {!msg.isRevoked &&
                                              (msg.type === "image" ||
                                                msg.type === "file") && (
                                                <button
                                                  onClick={() => {
                                                    setActiveMenu(null);
                                                    if (msg.metadata?.imageGroup) {
                                                      // Tải toàn bộ album ảnh (chỉ ảnh chưa bị thu hồi/xóa)
                                                      handleDownloadAlbum(msg);
                                                    } else {
                                                      handleDownload(
                                                        msg.content,
                                                        msg.metadata?.fileName ||
                                                        (msg.type === "image"
                                                          ? "image.png"
                                                          : "file"),
                                                      );
                                                    }
                                                  }}
                                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition text-left"
                                                >
                                                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                                                  {msg.metadata?.imageGroup
                                                    ? `Lưu tất cả ảnh`
                                                    : "Lưu về máy"}
                                                </button>
                                              )}
                                            {isMine &&
                                              !msg.isRevoked &&
                                              new Date().getTime() -
                                              new Date(msg.createdAt).getTime() <
                                              86400000 && (
                                                <button
                                                  onClick={() =>
                                                    handleRevoke(msg._id)
                                                  }
                                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-orange-500 hover:bg-orange-50 transition text-left"
                                                >
                                                  <ArrowUturnLeftIcon className="w-4 h-4 shrink-0" />
                                                  Thu hồi tin nhắn
                                                </button>
                                              )}
                                            <button
                                              onClick={() =>
                                                handleDeleteForMe(msg._id)
                                              }
                                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition text-left"
                                            >
                                              <TrashIcon className="w-4 h-4 shrink-0" />
                                              Xóa chỉ ở phía tôi
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* 4. Redo Button */}
                                      {isMounted &&
                                        isMine &&
                                        msg.isRevoked &&
                                        msg.revokedAt &&
                                        new Date().getTime() -
                                        new Date(msg.revokedAt).getTime() <
                                        60000 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMessageText(msg.content);
                                            }}
                                            className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition"
                                            title="Sửa nhanh (Hoàn tác)"
                                          >
                                            <PencilIcon className="w-4 h-4" />
                                          </button>
                                        )}
                                    </div>
                                    {/* Hiển thị các cảm xúc đã thả */}
                                    {(() => {
                                      if (
                                        msg.type === "image" &&
                                        msg.metadata?.imageGroup
                                      ) {
                                        // Cả nhóm bị thu hồi → ẩn
                                        if (isRevoked) return false;
                                        // Tất cả ảnh lẻ đều bị thu hồi → ẩn
                                        const allImgsRevoked = (
                                          msg.metadata!.imageGroup as any[]
                                        ).every(
                                          (img: any) => img.isRevoked === true,
                                        );
                                        if (allImgsRevoked) return false;
                                        // Còn ít nhất 1 ảnh chưa thu hồi → hiện
                                        return true;
                                      }
                                      return !isRevoked;
                                    })() &&
                                      msg.reactions &&
                                      msg.reactions.length > 0 && (
                                        <div
                                          className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}
                                        >
                                          {Array.from(
                                            new Set(
                                              msg.reactions.map(
                                                (r: any) => r.emoji,
                                              ),
                                            ),
                                          ).map((emojiKey: any) => {
                                            const peopleReacted =
                                              msg.reactions!.filter(
                                                (r: any) => r.emoji === emojiKey,
                                              );
                                            return (
                                              <div
                                                key={emojiKey}
                                                onClick={() => {
                                                  setViewingReactions({
                                                    messageId: msg._id,
                                                    reactions: msg.reactions!,
                                                    activeTab: "all",
                                                  });
                                                  msg.reactions!.forEach((r: any) =>
                                                    fetchUserInfo(r.userId),
                                                  );
                                                }}
                                                onMouseEnter={() => {
                                                  peopleReacted.forEach((r: any) =>
                                                    fetchUserInfo(r.userId),
                                                  );
                                                }}
                                                title={peopleReacted
                                                  .map((r) =>
                                                    getSenderDisplayName(r.userId),
                                                  )
                                                  .join(", ")}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] cursor-pointer transition ${msg.reactions!.some(
                                                  (r: any) =>
                                                    r.emoji === emojiKey &&
                                                    String(r.userId) ===
                                                    String(
                                                      currentUser?.id ||
                                                      currentUser?._id ||
                                                      currentUser?.userId,
                                                    ),
                                                )
                                                  ? "bg-blue-100 text-blue-600 border border-blue-200"
                                                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                  }`}
                                              >
                                                <span>
                                                  {EMOJI_MAP[emojiKey as string] ||
                                                    emojiKey}
                                                </span>
                                                <span className="font-bold">
                                                  {peopleReacted.reduce(
                                                    (acc, r: any) =>
                                                      acc + (r.count || 1),
                                                    0,
                                                  )}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Footer: timestamp + trạng thái của nhóm — hiện 1 lần */}
                        <div
                          className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end pr-10" : "pl-10"
                            }`}
                        >
                          <span className="text-[10px] font-bold text-gray-400">
                            {formatTime(lastMsg.createdAt)}
                          </span>
                          {isMine && (
                            <span
                              className={`text-[10px] font-bold ${lastMsg.isRead
                                ? "text-blue-500"
                                : "text-gray-400"
                                }`}
                            >
                              {lastMsg.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )
              }
            </div>

            {/* Floating tooltip ─ hiện gần con trỏ khi hover tin nhắn */}
            {hoveredMsgId &&
              (() => {
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

            {/* Message Input Container */}
            <div className="bg-white border-t border-gray-200 shrink-0">
              {/* Hidden file input — chỉ chọn file (không phải ảnh) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="application/*,text/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.avi,.mov,.mkv"
              />
              {/* Hidden image input — chỉ chọn ảnh */}
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*"
              />
              {/* Toolbar Section */}
              <div className="flex items-center gap-1 px-4 py-2">
                {/* 1. Sticker placeholder — giữ icon cũ, chưa có sự kiện */}
                {/* <button
                  className="p-2 text-gray-500 rounded-md transition cursor-default"
                  title="Sticker (sắp ra mắt)"
                >
                  <FaceSmileIcon className="w-5 h-5" />
                </button> */}
                {/* 2. Sticker picker — gửi sticker thật */}
                <StickerPicker onStickerSelect={handleSendSticker} />
                {/* 3. Đính kèm ảnh */}
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                  onClick={handleImageButtonClick}
                  title="Gửi ảnh"
                >
                  <PhotoIcon className="w-5 h-5" />
                </button>
                {/* 4. Đính kèm file */}
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                  onClick={handleFileButtonClick}
                  title="Gửi file"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Reply Preview Section */}
              {replyingTo && (
                <div className="mx-4 mb-2 p-3 bg-[#F0F2F5] border-l-[3px] border-blue-600 rounded-sm flex items-center gap-3 animate-in slide-in-from-bottom-1 duration-200 w-fit max-w-[75%]">
                  {replyingTo.type === "image" && (
                    <img
                      src={replyingTo.content}
                      alt="reply"
                      className="w-10 h-10 object-cover rounded-md shrink-0 border border-gray-200"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-gray-500"
                      >
                        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9125 16 16.0171 16H19.0171C20.1217 16 21.0171 16.8954 21.0171 18V21M14.017 21H21.0171M14.017 21C12.9125 21 12.017 20.1046 12.017 19V15M3.01709 21H10.0171M10.0171 21V18C10.0171 16.8954 10.9125 16 12.0171 16H15.0171M10.0171 21C8.91253 21 8.01709 20.1046 8.01709 19V15M12.017 15V13C12.017 11.8954 12.9125 11 14.0171 11H17.0171C18.1217 11 19.0171 11.8954 19.0171 13V15M12.017 15C10.9125 15 10.0171 14.1046 10.0171 13V9M3.01709 15H10.0171M10.0171 15V12C10.0171 10.8954 10.9125 10 12.0171 10H15.0171M10.0171 15C8.91253 15 8.01709 14.1046 8.01709 13V9" />
                        <path
                          d="M11.1892 5.07107C10.0175 3.8994 8.11805 3.8994 6.94639 5.07107C5.77473 6.24274 5.77473 8.14224 6.94639 9.31391L11.1892 13.5567L15.432 9.31391C16.6037 8.14224 16.6037 6.24274 15.432 5.07107C14.2603 3.8994 12.3608 3.8994 11.1892 5.07107Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/* Using the text character directly is often more faithful to these chat UIs */}
                      <span className="text-[14px] text-gray-500 font-medium">
                        Trả lời{" "}
                        <span className="font-bold text-gray-800">
                          {getSenderDisplayName(
                            replyingTo.senderId,
                            replyingTo,
                          )}
                        </span>
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-600 truncate ml-1">
                      {replyingTo.type === "image"
                        ? "[Hình ảnh]"
                        : replyingTo.type === "file"
                          ? replyingTo.metadata?.fileName || "[Tệp tin]"
                          : replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Input section */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      replyingTo
                        ? `Nhập @, tin nhắn tới ${userCache[replyingTo.senderId]?.name || "người dùng"}`
                        : "Nhập tin nhắn..."
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium placeholder:text-gray-400 py-2"
                  />
                  <div className="flex items-center gap-1">
                    {messageText.trim() ? (
                      <button
                        onClick={handleSend}
                        disabled={sending}
                        className="p-2 text-blue-600 hover:text-blue-700 transition active:scale-95 disabled:opacity-40"
                      >
                        <PaperAirplaneIcon className="w-6 h-6" />
                      </button>
                    ) : (
                      <button className="p-2 text-yellow-500 hover:text-yellow-600 transition active:scale-90">
                        {/* This matches the Like/Thumb icon in the image */}
                        <span className="text-2xl">👍</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reaction Modal */}
            {viewingReactions && (
              <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setViewingReactions(null)}
                />
                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Cảm xúc tin nhắn</h3>
                    <button
                      onClick={() => setViewingReactions(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Emoji Tabs */}
                    {(() => {
                      const rList = viewingReactions.reactions;
                      const totalCount = rList.reduce(
                        (acc, r) => acc + (r.count || 1),
                        0,
                      );
                      const groupedCount = rList.reduce(
                        (acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + (r.count || 1);
                          return acc;
                        },
                        {} as Record<string, number>,
                      );
                      const sortedGrouped = (
                        Object.entries(groupedCount) as [string, number][]
                      ).sort((a, b) => b[1] - a[1]);

                      // Right Column Users
                      const activeFilters =
                        viewingReactions.activeTab === "all"
                          ? rList
                          : rList.filter(
                            (r) => r.emoji === viewingReactions.activeTab,
                          );

                      // Group by user for the right column
                      const userEmoteMap = activeFilters.reduce(
                        (acc, r) => {
                          const uid = String(r.userId);
                          if (!acc[uid]) acc[uid] = { total: 0, emotes: [] };
                          acc[uid].total += r.count || 1;

                          // Group similar emojis if user clicked multiple times
                          const existingEmote = acc[uid].emotes.find(
                            (e: any) => e.emoji === r.emoji,
                          );
                          if (existingEmote)
                            existingEmote.count += r.count || 1;
                          else
                            acc[uid].emotes.push({
                              emoji: r.emoji,
                              count: r.count || 1,
                            });

                          return acc;
                        },
                        {} as Record<
                          string,
                          {
                            total: number;
                            emotes: { emoji: string; count: number }[];
                          }
                        >,
                      );

                      const sortedUsers = (
                        Object.entries(userEmoteMap) as [string, any][]
                      ).sort((a, b) => b[1].total - a[1].total);

                      return (
                        <>
                          <div className="w-1/3 border-r border-gray-100 p-2 overflow-y-auto bg-white max-h-[60vh]">
                            <button
                              onClick={() =>
                                setViewingReactions({
                                  ...viewingReactions,
                                  activeTab: "all",
                                })
                              }
                              className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === "all" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                            >
                              <span className="font-semibold text-sm">
                                Tất cả
                              </span>
                              <span className="text-gray-500 text-sm font-medium">
                                {totalCount}
                              </span>
                            </button>
                            {sortedGrouped.map(([emojiKey, count]) => (
                              <button
                                key={emojiKey}
                                onClick={() =>
                                  setViewingReactions({
                                    ...viewingReactions,
                                    activeTab: emojiKey,
                                  })
                                }
                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === emojiKey ? "bg-gray-100" : "hover:bg-gray-50"}`}
                              >
                                <span className="text-2xl">
                                  {EMOJI_MAP[emojiKey] || emojiKey}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">
                                  {count}
                                </span>
                              </button>
                            ))}
                          </div>

                          <div className="w-2/3 p-2 overflow-y-auto bg-[#F9FAFB] max-h-[60vh]">
                            {sortedUsers.map(([uid, uData]) => {
                              const uInfo = userCache[uid] || {
                                name: `User #${uid.substring(0, 4)}`,
                                avatar: "",
                              };
                              return (
                                <div
                                  key={uid}
                                  className="flex items-center gap-3 p-3 mb-1 bg-white rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition"
                                >
                                  <div className="relative">
                                    {uInfo.avatar ? (
                                      <img
                                        src={uInfo.avatar}
                                        alt={uInfo.name}
                                        className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm uppercase">
                                        {uInfo.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[14px] truncate text-gray-900">
                                      {uInfo.name}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {uData.emotes.map(
                                        (em: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex items-center text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5"
                                          >
                                            <span className="text-[14px] mr-1">
                                              {EMOJI_MAP[em.emoji] || em.emoji}
                                            </span>
                                            {em.count > 1 && (
                                              <span className="font-black text-gray-600">
                                                x{em.count}
                                              </span>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col justify-center">
                                    <span className="text-[20px] font-black text-gray-200 leading-none">
                                      {uData.total}
                                    </span>
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
          <ChatInfoPanel
            show={showInfoPanel}
            conversationId={conversationId}
            conversationInfo={conversationInfo}
            messages={mediaMessages}
            currentUser={currentUser}
            onClose={() => setShowInfoPanel(false)}
            onClearHistory={handleClearHistory}
            onLeaveGroup={handleLeaveGroup}
            onDisbandGroup={handleDisbandGroup}
            onViewAllMedia={() => {
              /* Future: Open media gallery */
            }}
            onViewAllFiles={() => {
              /* Future: Open file list */
            }}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
            onAssignLeader={handleAssignLeader}
            onRefreshData={handleRefreshData}
            userCache={userCache}
          />

          {/* ALBUM PREVIEW MODAL */}
          {activeAlbumIndex && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-200">
              <button
                className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-10"
                onClick={() => setActiveAlbumIndex(null)}
              >
                <XMarkIcon className="w-8 h-8" />
              </button>

              {(() => {
                const msg = messages.find(
                  (m) => m._id === activeAlbumIndex.messageId,
                );
                if (!msg) return null;

                const images = msg.metadata?.imageGroup || [
                  { url: msg.content, isRevoked: msg.isRevoked },
                ];
                const currentImg = images[activeAlbumIndex.index];

                const next = () => {
                  const nextIdx = (activeAlbumIndex.index + 1) % images.length;
                  setActiveAlbumIndex({ ...activeAlbumIndex, index: nextIdx });
                };
                const prev = () => {
                  const prevIdx =
                    (activeAlbumIndex.index - 1 + images.length) %
                    images.length;
                  setActiveAlbumIndex({ ...activeAlbumIndex, index: prevIdx });
                };

                return (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    {/* Navigation Buttons */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prev();
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition"
                        >
                          <ChevronLeftIcon className="w-12 h-12" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            next();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition"
                        >
                          <ChevronRightIcon className="w-12 h-12" />
                        </button>
                      </>
                    )}

                    <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
                      {currentImg?.isRevoked ? (
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <ArrowUturnLeftIcon className="w-20 h-20 mb-4 opacity-20" />
                          <p className="text-xl font-bold">
                            Hình ảnh này đã được thu hồi
                          </p>
                        </div>
                      ) : (
                        currentImg && (
                          <img
                            src={getMediaUrl(currentImg.url)}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                            alt="preview"
                          />
                        )
                      )}

                      {currentImg && (
                        <div className="mt-6 flex flex-col items-center gap-2">
                          <p className="text-white/60 text-sm font-medium">
                            {activeAlbumIndex.index + 1} / {images.length}
                          </p>
                          {!currentImg.isRevoked && (
                            <button
                              onClick={() =>
                                handleDownload(
                                  getMediaUrl(currentImg.url),
                                  currentImg.fileName || "image.png",
                                )
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              Lưu về máy
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          isOpen={true}
          onClose={() => setForwardingMessage(null)}
          message={forwardingMessage}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
