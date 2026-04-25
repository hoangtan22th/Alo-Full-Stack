"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axiosClient from "@/services/api";
import { messageService, MessageDTO } from "@/services/messageService";
import { groupService } from "@/services/groupService";
import { contactService } from "@/services/contactService";
import { socketService } from "@/services/socketService";
import { toast } from "sonner";
import { useCall } from "@/components/layout/CallProvider";
import JSZip from "jszip";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useShallow } from "zustand/react/shallow";

import { formatTime, getMediaUrl } from "@/components/chat/ChatPage/utils";

const BOT_ID = "alo-bot";
const EMPTY_ARRAY: any[] = [];
const BOT_INFO = {
  id: BOT_ID,
  name: "Trợ lý Alo Chat",
  avatar: "/alochat.png",
  isGroup: false,
  message: "Sẵn sàng hỗ trợ bạn 24/7...",
  online: true,
};

export const useChatLogic = () => {
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
  const [pinnedMessages, setPinnedMessages] = useState<MessageDTO[]>([]);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [activePollId, setActivePollId] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveOptions, setLeaveOptions] = useState({
    isSilent: false,
    preventReinvite: false,
  });
  const [isStranger, setIsStranger] = useState(false);
  const [relationStatus, setRelationStatus] = useState<string>("NOT_FRIEND");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [shouldShowSummary, setShouldShowSummary] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [summaryDismissed, setSummaryDismissed] = useState<Record<string, boolean>>({});
  const [showCallMemberSelector, setShowCallMemberSelector] = useState<{ isVideo: boolean } | null>(null);
  const [selectedCallMembers, setSelectedCallMembers] = useState<string[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [mediaMessages, setMediaMessages] = useState<MessageDTO[]>([]);
  const [messageText, setMessageText] = useState("");
  const [conversationInfo, setConversationInfo] = useState<any>(null);

  // Group Link Info Cache
  const [groupLinkCache, setGroupLinkCache] = useState<Record<string, any>>({});

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const myRole = useMemo(() => {
    if (!conversationInfo || !myId) return "MEMBER";
    const member = conversationInfo.members?.find(
      (m: any) => String(m.userId) === String(myId) || String(m._id) === String(myId)
    );
    return member?.role?.toUpperCase() || "MEMBER";
  }, [conversationInfo, myId]);

  // Modal tham gia nhóm có câu hỏi
  const [joinGroupModal, setJoinGroupModal] = useState<{
    groupId: string;
    question: string;
    needApproval: boolean;
  } | null>(null);
  const [groupInfoModal, setGroupInfoModal] = useState<any>(null);
  const [joinGroupAnswer, setJoinGroupAnswer] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);

  // Optimized selector
  const typingForThisConvo = useChatStore((state) => state.typingUsers[conversationId] || EMPTY_ARRAY);
  const { isReportSelectionMode, selectedMessagesForReport, toggleMessageForReport, clearReportSelection } = useChatStore(
    useShallow((s) => ({
      isReportSelectionMode: s.isReportSelectionMode,
      selectedMessagesForReport: s.selectedMessagesForReport,
      toggleMessageForReport: s.toggleMessageForReport,
      clearReportSelection: s.clearReportSelection,
    }))
  );
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const [sending, setSending] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  
  // Hover & UI state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("top");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [fixedMenuPos, setFixedMenuPos] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageDTO | null>(null);
  const [forwardingMessages, setForwardingMessages] = useState<MessageDTO[]>([]);

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const selectedMessages = useMemo(() => {
    return messages.filter((m) => selectedMessageIds.has(m._id));
  }, [messages, selectedMessageIds]);

  const canBulkRevoke = useMemo(() => {
    if (selectedMessages.length === 0) return false;
    return selectedMessages.every((msg) => {
      const isMine = String(msg.senderId) === String(myId);
      const isWithinTime = new Date().getTime() - new Date(msg.createdAt).getTime() < 86400000;
      return isMine && isWithinTime && !msg.isRevoked;
    });
  }, [selectedMessages, myId]);

  const [viewingReactions, setViewingReactions] = useState<{
    messageId: string;
    reactions: any[];
    activeTab: string;
  } | null>(null);
  const [userCache, setUserCache] = useState<Record<string, { name: string; avatar: string }>>({});

  // @Mention state
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const adminIds = useMemo<Set<string>>(() => {
    return new Set(
      conversationInfo?.members
        ?.filter((m: any) => m.role?.toUpperCase() === "LEADER" || m.role?.toUpperCase() === "DEPUTY")
        .map((m: any) => String(m.userId || m._id)) || []
    );
  }, [conversationInfo]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState(0);

  const [isMounted, setIsMounted] = useState(false);
  const fetchingUsersRef = useRef<Set<string>>(new Set());

  const [activeAlbumIndex, setActiveAlbumIndex] = useState<{
    messageId: string;
    index: number;
  } | null>(null);

  const [mentionToScrollId, setMentionToScrollId] = useState<string | null>(null);
  const [showMentionIndicator, setShowMentionIndicator] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingHistoryRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationIdRef = useRef(conversationId);
  
  // SCROLL STATES
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [unreadScrollCount, setUnreadScrollCount] = useState(0);
  const isNearBottomRef = useRef(true);

  const { callState, incomingCall, startCall, acceptCall, declineCall, endCall } = useCall();

  const EMOJI_MAP: Record<string, string> = {
    like: "👍",
    heart: "❤️",
    haha: "😂",
    wow: "😮",
    cry: "😢",
    angry: "😡",
  };

  const isMine = useCallback((senderId: string) => String(senderId) === String(myId), [myId]);

  const handleCopy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép tin nhắn");
  }, []);

  const confirmGroupCall = useCallback((members: string[]) => {
    if (!showCallMemberSelector) return;
    startCall(
      conversationId,
      showCallMemberSelector.isVideo,
      true,
      conversationInfo?.displayName,
      conversationInfo?.displayAvatar,
      members,
      conversationInfo?.members
    );
    setShowCallMemberSelector(null);
  }, [conversationId, conversationInfo, showCallMemberSelector, startCall]);

  /* ---------- Logic Functions ---------- */

  const fetchUserInfo = useCallback(async (userId: string) => {
    if (userCache[userId] || !userId || fetchingUsersRef.current.has(userId)) return;

    if (userId === BOT_ID) {
      setUserCache((prev) => ({
        ...prev,
        [BOT_ID]: { name: BOT_INFO.name, avatar: BOT_INFO.avatar },
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
            name: u.fullName || (u as any).username || (u as any).name || "Người dùng",
            avatar: u.avatar || "",
          },
        }));
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin user " + userId, error);
      fetchingUsersRef.current.delete(userId);
    }
  }, [userCache]);

  const getSenderDisplayName = useCallback((userId: string, msg?: MessageDTO) => {
    if (msg?.senderName) return msg.senderName;
    if (!userId) return "Người dùng";
    if (String(userId) === String(myId)) return currentUser?.fullName || "Tôi";

    if (conversationInfo) {
      if (!conversationInfo.isGroup) {
        const otherMember = conversationInfo.members?.find((m: any) => String(m.userId) === String(userId));
        if (otherMember && String(userId) === String(otherMember.userId)) {
          return conversationInfo.displayName || "Người dùng";
        }
      } else {
        const member = conversationInfo.members?.find(
          (m: any) => String(m.userId) === String(userId) || String(m._id) === String(myId)
        );
        if (member) return member.fullName || member.displayName || (member as any).name || "Người dùng";
      }
    }
    return userCache[userId]?.name || "Người dùng";
  }, [myId, currentUser, conversationInfo, userCache]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      isNearBottomRef.current = true;
      setShowScrollBottomButton(false);
      setUnreadScrollCount(0);
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNear = scrollHeight - scrollTop - clientHeight < 50;
    isNearBottomRef.current = isNear;
    
    if (isNear) {
      setShowScrollBottomButton(false);
      setUnreadScrollCount(0);
    } else {
      setShowScrollBottomButton(true);
    }
  }, []);

  const fetchMediaHistory = useCallback(async () => {
    if (!conversationId || conversationId === BOT_ID) return;
    try {
      const msgs = await messageService.getMessageHistory(conversationId, 200, 0);
      const filtered = msgs.filter((m) => m.type === "image" || m.type === "file");
      setMediaMessages(filtered);
    } catch (err) {
      console.error("Lỗi lấy lịch sử media:", err);
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async (shouldScroll = false) => {
    if (!conversationId || conversationId === BOT_ID) return;
    setLoadingMessages(true);
    setHasMore(true);
    try {
      const msgs = await messageService.getMessageHistory(conversationId, 50, 0);
      const reversed = [...msgs].reverse();
      setMessages(reversed);
      if (msgs.length < 50) setHasMore(false);
      setPinnedMessages(reversed.filter((m) => m.isPinned));
      messageService.markAsRead(conversationId);
    } catch (err) {
      console.error("Lỗi lấy tin nhắn:", err);
    } finally {
      setLoadingMessages(false);
      if (shouldScroll) {
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [conversationId, scrollToBottom]);

  const loadMoreHistory = useCallback(async () => {
    if (!conversationId || !hasMore || loadingMoreHistory || loadingMessages || conversationId === BOT_ID) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const oldScrollHeight = container.scrollHeight;
    setLoadingMoreHistory(true);
    isLoadingHistoryRef.current = true;

    try {
      const olderMsgs = await messageService.getMessageHistory(conversationId, 50, messages.length);
      if (olderMsgs.length === 0) {
        setHasMore(false);
        return;
      }
      const reversedOlder = [...olderMsgs].reverse();
      if (olderMsgs.length < 50) setHasMore(false);
      setMessages((prev) => [...reversedOlder, ...prev]);

      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - oldScrollHeight;
        }
        isLoadingHistoryRef.current = false;
      }, 0);
    } catch (err) {
      console.error("Lỗi tải thêm tin nhắn:", err);
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [conversationId, hasMore, loadingMoreHistory, loadingMessages, messages.length]);

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !conversationId || sending) return;

    setSending(true);
    setMessageText("");
    const currentReply = replyingTo;
    setReplyingTo(null);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: MessageDTO = {
      _id: tempId,
      conversationId,
      senderId: myId!,
      senderName: currentUser?.fullName || "Tôi",
      type: "text",
      content: text,
      isRead: false,
      replyTo: currentReply ? {
        messageId: currentReply._id,
        senderId: currentReply.senderId,
        senderName: getSenderDisplayName(currentReply.senderId, currentReply),
        content: currentReply.type === "file" ? currentReply.metadata?.fileName || currentReply.content : currentReply.content,
        type: currentReply.type,
      } : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await messageService.sendMessage({
        conversationId,
        content: text,
        type: "text",
        senderName: currentUser?.fullName || "Tôi",
        replyTo: currentReply ? {
          messageId: currentReply._id,
          senderId: currentReply.senderId,
          senderName: getSenderDisplayName(currentReply.senderId, currentReply),
          content: currentReply.type === "file" ? currentReply.metadata?.fileName || currentReply.content : currentReply.content,
          type: currentReply.type,
        } : undefined,
      });
      if (isStranger) groupService.updateConversationFolder(conversationId, "priority").catch(console.error);
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setMessageText(text);
      setReplyingTo(currentReply);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [messageText, conversationId, sending, currentUser, replyingTo, getSenderDisplayName, isStranger, myId]);

  const handleSelectMention = useCallback((user: any) => {
    if (!user) return;
    const textBefore = messageText.slice(0, mentionPosition);
    const textAfter = messageText.slice(mentionPosition + (mentionSearch?.length || 0) + 1);
    const newText = textBefore + `@${user.fullName || user.displayName} ` + textAfter;
    setMessageText(newText);
    setMentionSearch(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [messageText, mentionPosition, mentionSearch]);

  const filteredMentions = useMemo(() => {
    if (mentionSearch === null || !conversationInfo?.members) return [];
    const search = mentionSearch.toLowerCase();
    return conversationInfo.members.filter((m: any) =>
      (m.fullName || m.displayName || "").toLowerCase().includes(search)
    );
  }, [mentionSearch, conversationInfo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mentionSearch !== null) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionSearch(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % Math.max(1, filteredMentions.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % Math.max(1, filteredMentions.length));
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  }, [mentionSearch, filteredMentions, mentionIndex, handleSend, handleSelectMention]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessageText(val);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1 && (lastAt === 0 || textBeforeCursor[lastAt - 1] === " ")) {
      const search = textBeforeCursor.slice(lastAt + 1);
      if (!search.includes(" ")) {
        setMentionSearch(search);
        setMentionPosition(lastAt);
        setMentionIndex(0);
        return;
      }
    }
    setMentionSearch(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !conversationId) return;

    setUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = file.type.startsWith("image/") ? "image" : "file";
        await messageService.uploadFile(conversationId, file, undefined, currentUser?.fullName || "Tôi");
      }
      if (isStranger) groupService.updateConversationFolder(conversationId, "priority").catch(console.error);
    } catch (error) {
      console.error("Lỗi gửi file:", error);
      toast.error("Gửi file thất bại");
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleFileButtonClick = () => fileInputRef.current?.click();
  const handleImageButtonClick = () => imageInputRef.current?.click();

  const fetchConversationInfo = useCallback(async () => {
    if (!conversationId || conversationId === BOT_ID) return;
    try {
      const data: any = await groupService.getGroupById(conversationId);
      const g = data?.data || data;
      if (!g) return;

      let displayName = g.name;
      let displayAvatar = g.groupAvatar;

      const isDirect = !g.isGroup || g.type === "DIRECT" || (g.members?.length === 2 && !g.isGroup);

      if (isDirect && myId && g.members) {
        const otherMember = g.members.find((m: any) => {
          const mId = m.userId || m._id || m;
          return mId && String(mId) !== String(myId);
        });
        const otherId = otherMember?.userId || otherMember?._id || (typeof otherMember === "string" ? otherMember : null);

        if (otherId) {
          setOtherUserId(otherId);
          const [userRes, relRes]: any = await Promise.all([
            axiosClient.get(`/users/${otherId}`),
            axiosClient.get(`/contacts/relation-status`, { params: { targetUserId: otherId } }),
          ]);

          const u = userRes?.data?.data || userRes?.data || userRes;
          const currentStatus = relRes?.data?.relationStatus || relRes?.relationStatus || "NOT_FRIEND";
          setRelationStatus(currentStatus);
          if (u) {
            displayName = u.fullName || u.displayName || u.username || u.name || "Người dùng";
            displayAvatar = u.avatar || displayAvatar;
          }
        }
      } else {
        setIsStranger(false);
        setOtherUserId(null);
      }

      setConversationInfo({ ...g, displayName, displayAvatar });
      fetchMediaHistory();
    } catch (err) {
      console.error("Lỗi lấy thông tin cuộc hội thoại:", err);
    }
  }, [conversationId, myId, fetchMediaHistory]);

  const handleRefreshData = useCallback(() => {
    fetchConversationInfo();
    fetchMessages();
    fetchMediaHistory();
  }, [fetchConversationInfo, fetchMessages, fetchMediaHistory]);

  const handleSendSticker = async (stickerUrl: string) => {
    if (!stickerUrl || !conversationId || sending) return;
    setSending(true);
    const currentReply = replyingTo;
    setReplyingTo(null);

    try {
      await messageService.sendMessage({
        conversationId,
        content: stickerUrl,
        type: "image",
        senderName: currentUser?.fullName || "Tôi",
        metadata: { isSticker: true },
        replyTo: currentReply ? {
          messageId: currentReply._id,
          senderId: currentReply.senderId,
          senderName: getSenderDisplayName(currentReply.senderId, currentReply),
          content: currentReply.type === "file" ? currentReply.metadata?.fileName || currentReply.content : currentReply.content,
          type: currentReply.type,
        } : undefined,
      });
    } catch (err) {
      console.error("Lỗi gửi sticker:", err);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (msg: any) => {
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleForward = (msg: any) => {
    setForwardingMessage(msg);
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    setActiveReactionMenu(null);
    try {
      await messageService.reactToMessage(msgId, emoji);
    } catch (error) {
      console.error("Lỗi toggle cảm xúc:", error);
    }
  };

  const handleRevoke = async (messageId: string) => {
    setActiveMenu(null);
    try {
      await messageService.revokeMessage(messageId);
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    setActiveMenu(null);
    try {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      await messageService.deleteMessageForMe(messageId);
    } catch (error) {
      console.error("Lỗi xóa tin nhắn:", error);
    }
  };

  const handlePinMessage = async (msg: MessageDTO) => {
    setActiveMenu(null);
    try {
      await messageService.pinMessage(msg._id, !msg.isPinned);
    } catch (error) {
      console.error("Lỗi ghim tin nhắn:", error);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { method: "GET", cache: "no-cache" });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement("a"));
      link.href = blobUrl;
      link.download = fileName || "download";
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Lỗi tải tệp:", error);
    }
  };

  const handleDownloadAlbum = async (msg: MessageDTO) => {
    if (!msg.metadata?.imageGroup) return;
    const availableImages = (msg.metadata!.imageGroup as any[]).filter(
      (img: any) => !img.isRevoked && !img.deletedByUsers?.includes(myId)
    );
    if (availableImages.length === 0) return;

    try {
      const zip = new JSZip();
      await Promise.all(
        availableImages.map(async (img: any, i: number) => {
          const res = await fetch(`${img.url}?t=${Date.now()}`, { method: "GET", cache: "no-cache" });
          if (res.ok) zip.file(img.fileName || `image_${i + 1}.png`, await res.blob());
        })
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.body.appendChild(document.createElement("a"));
      link.href = URL.createObjectURL(zipBlob);
      link.download = `album_${Date.now()}.zip`;
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Lỗi tải album:", err);
    }
  };

  const clearMessageSelection = () => {
    setSelectedMessageIds(new Set());
    setIsMultiSelectMode(false);
  };

  const handleBulkCopy = () => {
    if (selectedMessages.length === 0) return;
    const text = selectedMessages.map((m) => m.content).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép");
  };

  const handleBulkForward = () => {
    if (selectedMessages.length === 0) return;
    setForwardingMessages(selectedMessages);
  };

  const handleBulkRevoke = async () => {
    const ids = selectedMessages.map((m) => m._id);
    if (await messageService.bulkRevokeMessages(ids)) {
      toast.success("Đã thu hồi");
      setIsMultiSelectMode(false);
      setSelectedMessageIds(new Set());
    }
  };

  const handleBulkDeleteForMe = async () => {
    const ids = selectedMessages.map((m) => m._id);
    if (await messageService.bulkDeleteMessagesForMe(ids)) {
      toast.success("Đã xóa");
      setMessages((prev) => prev.filter((m) => !selectedMessageIds.has(m._id)));
      setIsMultiSelectMode(false);
      setSelectedMessageIds(new Set());
    }
  };

  const toggleMessageSelection = (msg: MessageDTO) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msg._id)) next.delete(msg._id);
      else next.add(msg._id);
      return next;
    });
  };

  const handleClearHistory = async () => {
    if (!confirm("Xóa lịch sử?")) return;
    try {
      await groupService.clearConversation(conversationId);
      setMessages([]);
      toast.success("Đã xóa.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      await groupService.removeMember(conversationId, targetUserId);
      toast.success("Đã xóa thành viên");
      fetchConversationInfo();
    } catch (error) {
      toast.error("Không thể xóa thành viên");
    }
  };

  const handleUpdateRole = async (targetUserId: string, role: string) => {
    try {
      await groupService.updateRole(conversationId, targetUserId, role);
      toast.success("Đã cập nhật quyền");
      fetchConversationInfo();
    } catch (error) {
      toast.error("Không thể cập nhật quyền");
    }
  };

  const handleAssignLeader = async (targetUserId: string) => {
    try {
      await groupService.assignLeader(conversationId, targetUserId);
      toast.success("Đã chuyển quyền trưởng nhóm");
      fetchConversationInfo();
    } catch (error) {
      toast.error("Không thể chuyển quyền");
    }
  };

  const confirmLeaveGroup = async () => {
    if (!myId) return;
    try {
      await groupService.removeMember(conversationId, myId, leaveOptions);
      router.push("/chat");
    } catch (err: any) {
      alert("Lỗi rời nhóm");
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupModal && !groupInfoModal) return;
    const gid = joinGroupModal?.groupId || groupInfoModal?.groupId;
    if (!gid) return;
    setJoiningGroup(true);
    try {
      const res = await groupService.requestJoinGroup(gid, joinGroupAnswer.trim() || undefined);
      if (res.joined) router.push(`/chat/${gid}`);
      else toast.success("Đã gửi yêu cầu");
      setJoinGroupModal(null);
      setGroupInfoModal(null);
    } catch (err) {
      toast.error("Lỗi");
    } finally {
      setJoiningGroup(false);
    }
  };

  const handleStartCall = useCallback((isVideo: boolean, forcedInviteeIds?: string[]) => {
    if (conversationInfo?.isGroup && !forcedInviteeIds) {
      setShowCallMemberSelector({ isVideo });
      setSelectedCallMembers([]);
      return;
    }
    startCall(conversationId, isVideo, !!conversationInfo?.isGroup, conversationInfo?.displayName, conversationInfo?.displayAvatar, forcedInviteeIds, conversationInfo?.members);
  }, [conversationId, conversationInfo, startCall]);

  /* ---------- Effects ---------- */

  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (conversationId) {
      fetchMessages(true);
      fetchConversationInfo();
    }
  }, [conversationId, fetchMessages, fetchConversationInfo]);

  useEffect(() => {
    setIsMounted(true);
    const zegoErrorHandler = (e: any) => {
      const msg = e.message || e.reason?.message || "";
      if (msg.includes("createSpan") || msg.includes("Cannot read properties of null")) {
        if (e.preventDefault) e.preventDefault();
        return true;
      }
    };
    window.addEventListener("error", zegoErrorHandler, true);
    window.addEventListener("unhandledrejection", zegoErrorHandler, true);

    const handleGlobalClick = () => {
      setActiveMenu(null);
      setActiveReactionMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      setTimeout(() => {
        window.removeEventListener("error", zegoErrorHandler, true);
        window.removeEventListener("unhandledrejection", zegoErrorHandler, true);
      }, 5000);
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    socketService.joinRoom(conversationId);
    const unsubs = [
      socketService.onMessageReceived((data) => {
        const newMsg = data.message || data;
        if (String(newMsg.conversationId || newMsg.roomId) === String(conversationIdRef.current)) {
          setMessages((prev) => {
            // Tránh tin nhắn trùng lặp bằng cách lọc sạch các tin nhắn có cùng ID hoặc tin nhắn tạm tương ứng
            const filtered = prev.filter((m) => {
              const isSameId = m._id === newMsg._id;
              const isMatchTemp = m._id.startsWith("temp_") && m.content === newMsg.content && String(m.senderId) === String(newMsg.senderId);
              return !isSameId && !isMatchTemp;
            });
            return [...filtered, newMsg];
          });
          if (newMsg.type === "image" || newMsg.type === "file") setMediaMessages((prev) => [newMsg, ...prev.filter(m => m._id !== newMsg._id)]);
          if (myId && String(newMsg.senderId) !== String(myId)) messageService.markAsRead(conversationIdRef.current);
          
          const isFromMe = String(newMsg.senderId) === String(myId);
          if (isNearBottomRef.current || isFromMe) {
            setTimeout(() => {
               if (scrollContainerRef.current) {
                 scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                 isNearBottomRef.current = true;
                 setShowScrollBottomButton(false);
                 setUnreadScrollCount(0);
               }
            }, 100);
          } else {
            setUnreadScrollCount(prev => prev + 1);
          }
        }
      }),
      socketService.onMessagesRead((data) => {
        if (String(data.conversationId) === String(conversationIdRef.current)) {
          setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
        }
      }),
      socketService.onMessageReactionUpdated((data) => {
        setMessages((prev) => prev.map((m) => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
      }),
      socketService.onMessageRevoked((data) => {
        setMessages((prev) => prev.map((m) => m._id === data.messageId ? { ...m, isRevoked: true, revokedAt: data.revokedAt || new Date().toISOString() } : m));
      }),
      socketService.onMessagePinned((data: any) => {
        if (String(data.conversationId) === String(conversationIdRef.current)) {
          setMessages((prev) => prev.map((m) => m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m));
        }
      }),
      socketService.onPollUpdated((data: any) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.type === "poll" && m.metadata?.pollId === data.pollId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], updatedAt: new Date().toISOString() };
          return updated;
        });
      }),
      socketService.onConversationUpdated((data: any) => {
        if (String(data._id || data.id) === String(conversationIdRef.current)) fetchConversationInfo();
      }),
      socketService.onGroupUpdated((data: any) => {
        if (String(data._id || data.id || data.conversationId || data.groupId) === String(conversationIdRef.current)) {
          fetchConversationInfo();
        }
      }),
      socketService.onAddedToGroup((data: any) => {
        if (String(data.groupId || data.conversationId) === String(conversationIdRef.current)) {
          fetchConversationInfo();
        }
      }),
      socketService.onConversationRemoved((data: any) => {
        if (String(data.conversationId) === String(conversationIdRef.current)) {
          if (data.reason !== "leave") {
            toast.info(`Nhóm đã giải tán hoặc bạn bị mời ra`);
            router.replace("/chat");
          }
        }
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [conversationId, myId, fetchConversationInfo, router]);

  useEffect(() => {
    if (!hasMore || loadingMessages || loadingMoreHistory) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreHistory();
        }
      },
      { 
        root: scrollContainerRef.current,
        threshold: 0.1 
      }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMessages, loadingMoreHistory, loadMoreHistory]);

  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      const myName = currentUser.fullName || "";
      const mentionMsg = [...messages].reverse().find(m => m.type === "text" && !m.isRead && String(m.senderId) !== String(myId) && (m.content.includes(`@${myName}`) || m.content.includes("@Tất cả")));
      if (mentionMsg) {
        setMentionToScrollId(mentionMsg._id);
        setShowMentionIndicator(true);
      }
    }
  }, [messages, currentUser, myId]);

  /* ---------- Helpers ---------- */

  const messageGroups = useMemo(() => {
    // Deduplicate by ID just in case
    const uniqueMessages = Array.from(new Map(messages.map(m => [m._id, m])).values());
    const FIVE_MIN = 5 * 60 * 1000;
    const groups: any[] = [];
    for (const msg of uniqueMessages) {
      const last = groups[groups.length - 1];
      const lastMsg = last?.messages[last?.messages.length - 1];
      const gap = lastMsg ? new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime() : Infinity;
      if (last && last.senderId === msg.senderId && gap < FIVE_MIN && msg.type !== "poll" && lastMsg?.type !== "poll" && (msg.type as any) !== "system") {
        last.messages.push(msg);
      } else {
        groups.push({ isMine: msg.senderId === myId, senderId: msg.senderId, messages: [msg] });
      }
    }
    return groups;
  }, [messages, myId]);

  return {
    conversationId, conversationInfo, currentUser, myId, myRole,
    messages, pinnedMessages, mediaMessages, messageGroups,
    loadingMessages, hasMore, loadingMoreHistory, sending,
    messageText, setMessageText, replyingTo, setReplyingTo,
    forwardingMessage, setForwardingMessage, forwardingMessages, setForwardingMessages,
    showInfoPanel, setShowInfoPanel,
    showPinnedModal, setShowPinnedModal,
    showMembersModal, setShowMembersModal,
    showLeaveModal, setShowLeaveModal, leaveOptions, setLeaveOptions,
    showProfileModal, setShowProfileModal, otherUserId, relationStatus,
    isStranger, viewingReactions, setViewingReactions, EMOJI_MAP,
    userCache, activeAlbumIndex, setActiveAlbumIndex,
    mentionSearch, setMentionSearch, mentionIndex, setMentionIndex, mentionPosition,
    isMultiSelectMode, setIsMultiSelectMode, selectedMessageIds, setSelectedMessageIds,
    canBulkRevoke, selectedMessages,
    joinGroupModal, setJoinGroupModal, groupInfoModal, setGroupInfoModal, joinGroupAnswer, setJoinGroupAnswer, joiningGroup,
    showCallMemberSelector, setShowCallMemberSelector, selectedCallMembers, setSelectedCallMembers,
    mentionToScrollId, setMentionToScrollId, showMentionIndicator, setShowMentionIndicator,
    activeMenu, setActiveMenu, activeReactionMenu, setActiveReactionMenu,
    menuPosition, setMenuPosition, hoveredMsgId, setHoveredMsgId, mousePos, setMousePos, fixedMenuPos, setFixedMenuPos,
    isReportSelectionMode, selectedMessagesForReport, toggleMessageForReport, clearReportSelection,
    
    // Refs
    fileInputRef, imageInputRef, messagesEndRef, topSentinelRef, scrollContainerRef, inputRef,

    // Handlers
    handleSend, handleSendSticker, handleToggleReaction, handleRevoke, handleDeleteForMe,
    handlePinMessage, handleDownload, handleDownloadAlbum,
    handleBulkCopy, handleBulkForward, handleBulkRevoke, handleBulkDeleteForMe,
    toggleMessageSelection, clearMessageSelection, handleClearHistory, confirmLeaveGroup, handleJoinGroup,
    handleStartCall, handleRefreshData, fetchConversationInfo,
    getSenderDisplayName, fetchUserInfo,
    handleFileButtonClick, handleImageButtonClick, handleSelectMention,
    handleFileChange, handleInputChange, handleKeyDown, filteredMentions,
    handleRemoveMember, handleUpdateRole, handleAssignLeader,
    handleReply, handleForward,
    isMine, handleCopy, confirmGroupCall, formatTime, getMediaUrl, BOT_ID,
    activePollId, setActivePollId, adminIds,
    handleReaction: handleToggleReaction,
    lastMentionMsgId: mentionToScrollId,
    scrollToBottom,
    handleScroll,
    showScrollBottomButton,
    unreadScrollCount,
  };
};
