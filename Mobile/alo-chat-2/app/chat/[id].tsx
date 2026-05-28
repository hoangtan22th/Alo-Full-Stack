import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  UIManager,
  LayoutAnimation,
  FlatList,
  ActivityIndicator,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { groupService } from "../../services/groupService";
import { MessageDTO, messageService } from "../../services/messageService";
import { UserProfileDTO, userService } from "../../services/userService";

// Import custom components and constants
import { EMOJI_MAP } from "../../constants/Chat";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { MessageItem } from "../../components/chat/MessageItem";
import { ChatInput } from "../../components/chat/ChatInput";
import { GalleryViewerModal } from "../../components/chat/GalleryViewer";
import { PinnedMessageBar } from "../../components/chat/PinnedMessageBar";
import { ReactionDetailsSheet } from "../../components/chat/ReactionDetailsSheet";
import { MessageContextMenu } from "../../components/chat/MessageContextMenu";

export default function GlobalChatScreen() {
  const {
    id,
    name,
    avatar,
    membersCount,
    isGroup,
    targetUserId: paramsTargetUserId,
  } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId;

  const messageRefs = useRef<Record<string, View>>({});
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [inputText, setInputText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMsgLayout, setSelectedMsgLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [reactionDetailMsgId, setReactionDetailMsgId] = useState<string | null>(null);
  const [showExtensionMenu, setShowExtensionMenu] = useState(false);
  const [expandedTimeMsgId, setExpandedTimeMsgId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewUnseenMessages, setHasNewUnseenMessages] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserProfileDTO>>({});
  const [resolvedConversationId, setResolvedConversationId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());


  const chatInputRef = useRef<any>(null);
  const replyingToRef = useRef<MessageDTO | null>(null);
  const fetchingRef = useRef(false); // V3: Strict protection against concurrent fetches

  const setReplyingToWithRef = (msg: MessageDTO | null) => {
    setReplyingTo(msg);
    replyingToRef.current = msg;
  };

  useEffect(() => {
    if (highlightedMsgId) {
      const timer = setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMsgId]);

  // Real-time Group Info
  const [realtimeGroupName, setRealtimeGroupName] = useState<string>((name as string) || "");
  const [realtimeAvatar, setRealtimeAvatar] = useState<string>((avatar as string) || "");
  const [realtimeMembersCount, setRealtimeMembersCount] = useState<string>((membersCount as string) || "0");
  const [pinnedMessages, setPinnedMessages] = useState<MessageDTO[]>([]);

  const chatImages = useMemo(() => {
    return messages.filter((m) => m.type === "image" && !m.isRevoked);
  }, [messages]);

  const closeReactionDetails = () => {
    setReactionDetailMsgId(null);
  };

  const handleCopy = () => {
    if (!selectedMsg || selectedMsg.type !== "text") return;
    closeModal();
    Alert.alert("Sao chép", "Nội dung: " + selectedMsg.content);
  };

  const handleRevoke = async () => {
    if (!selectedMsg) return;
    const msgId = selectedMsg._id;
    closeModal();
    const ok = await messageService.deleteMessage(msgId);
    if (ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId ? { ...m, isRevoked: true, content: "" } : m
        )
      );
    }
  };

  const handleDeleteLocal = () => {
    if (!selectedMsg) return;
    const msgId = selectedMsg._id;
    closeModal();
    setMessages((prev) => prev.filter((m) => m._id !== msgId));
  };

  const handleReact = async (emojiKey: string) => {
    if (!selectedMessageId) return;
    closeModal();
    await messageService.reactToMessage(selectedMessageId, emojiKey);
  };

  const handleClearReactions = async () => {
    if (!selectedMessageId) return;
    closeModal();
    await messageService.clearReactions(selectedMessageId);
  };

  useEffect(() => {
    const fetchMissingUsers = async () => {
      const messageSenderIds = messages.map((m: MessageDTO) => m.senderId);
      const reactionUserIds = messages
        .find((m: MessageDTO) => m._id === reactionDetailMsgId)
        ?.reactions?.map((r: any) => r.userId) || [];

      const allIds = Array.from(new Set([...messageSenderIds, ...reactionUserIds]));
      const missingIds = allIds.filter((id) => id && !userCache[id]);

      if (missingIds.length === 0) return;

      const newProfiles: Record<string, UserProfileDTO> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const profile = await userService.getUserById(id);
            if (profile) newProfiles[id] = profile;
          } catch (err) {
            console.error("Lỗi fetch profile:", id, err);
          }
        })
      );

      if (Object.keys(newProfiles).length > 0) {
        setUserCache((prev) => ({ ...prev, ...newProfiles }));
      }
    };

    if (messages.length > 0 || reactionDetailMsgId) {
      fetchMissingUsers();
    }
  }, [messages, reactionDetailMsgId]);

  const selectedMsg = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find((m) => m._id === selectedMessageId);
  }, [selectedMessageId, messages]);

  const onLongPressMessage = (msgId: string) => {
    const ref = messageRefs.current[msgId];
    if (ref) {
      ref.measureInWindow((x, y, width, height) => {
        setSelectedMsgLayout({ x, y, width, height });
        setSelectedMessageId(msgId);
      });
    }
  };

  const closeModal = () => {
    setSelectedMessageId(null);
    setSelectedMsgLayout(null);
  };

  const isGroupChat = isGroup !== undefined ? isGroup === "true" : Boolean(membersCount && membersCount !== "undefined" && membersCount !== "null");
  const targetUserId = typeof paramsTargetUserId === "string" ? paramsTargetUserId : typeof id === "string" ? id : (id as string[])?.[0];
  const userStatus = !isGroupChat && targetUserId ? onlineUsers[targetUserId] : null;
  const isOnline = userStatus?.status === "online";

  useEffect(() => {
    const resolve = async () => {
      const initialId = Array.isArray(id) ? id[0] : id;
      if (!initialId) return;
      const needsResolution = isGroup === undefined && !paramsTargetUserId;

      if (needsResolution) {
        try {
          const conversation = await groupService.createDirectConversation(initialId);
          if (conversation && (conversation._id || conversation.id)) {
            setResolvedConversationId(conversation._id || conversation.id);
          } else {
            setResolvedConversationId(initialId);
          }
        } catch (err) {
          setResolvedConversationId(initialId);
        }
      } else {
        setResolvedConversationId(initialId);
      }
    };
    resolve();
  }, [id, isGroup, paramsTargetUserId]);

  const fetchMsgs = async (reset = false) => {
    if (!resolvedConversationId || fetchingRef.current) return;
    fetchingRef.current = true; // Block further calls immediately

    if (reset) {
      setSkip(0);
      setLoadingMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentSkip = reset ? 0 : skip;
      console.log(`[Chat] Fetching messages. skip=${currentSkip}, reset=${reset}`);
      const response = await messageService.getMessageHistory(resolvedConversationId, 50, currentSkip);
      const newMsgs = response.messages || [];
      const hasMoreData = response.hasMore ?? newMsgs.length >= 50;

      if (reset) {
        setMessages(newMsgs);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m: MessageDTO) => m._id));
          const filteredNew = newMsgs.filter((m: MessageDTO) => !existingIds.has(m._id));
          return [...filteredNew, ...prev];
        });
      }

      setHasMore(hasMoreData);
      setSkip((prev) => (reset ? newMsgs.length : prev + newMsgs.length));
      console.log(`[Chat] Fetched ${newMsgs.length} messages. skip=${skip}, hasMore=${hasMoreData}`);

      if (reset) {
        messageService.markAsRead(resolvedConversationId).catch(() => { });
      }
    } catch (e) {
      console.error("Lỗi tải tin nhắn:", e);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false; // Release block
    }
  };

  const fetchPinnedMessages = async () => {
    if (!resolvedConversationId) return;
    try {
      const pins = await messageService.getPinnedMessages(resolvedConversationId);
      setPinnedMessages(pins || []);
    } catch (error) {
      console.error("Lỗi lấy tin nhắn ghim:", error);
    }
  };

  const fetchGroupDetails = async () => {
    if (!resolvedConversationId || !isGroupChat) return;
    try {
      const res = await groupService.getGroupById(resolvedConversationId);
      const data = res?.data?.data || res?.data || res;
      if (data) {
        setGroupDetails(data);
        const admins = new Set<string>(
          (data.members || [])
            .filter((m: any) => m.role === "LEADER" || m.role === "DEPUTY")
            .map((m: any) => String(m.userId)),
        );
        setAdminIds(admins);
        if (data.name) setRealtimeGroupName(data.name);
        if (data.groupAvatar) setRealtimeAvatar(data.groupAvatar);
      }
    } catch (e) {
      console.error("Lỗi fetch group details:", e);
    }
  };

  useEffect(() => {
    if (resolvedConversationId) {
      fetchMsgs(true);
      fetchPinnedMessages();
      if (isGroupChat) {
        fetchGroupDetails();
      }
    }
  }, [resolvedConversationId, isGroupChat]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      console.log(`[Chat] Loading more messages... skip=${skip}`);
      fetchMsgs(false);
    }
  };

  const canPinMessage = useMemo(() => {
    if (!isGroupChat) return true;
    if (!groupDetails) return false;

    const pinPermission = groupDetails.permissions?.pinMessages || "EVERYONE";
    if (pinPermission === "EVERYONE") return true;

    // Admin-only: Check if current user is LEADER or DEPUTY
    return adminIds.has(String(currentUserId));
  }, [isGroupChat, groupDetails, adminIds, currentUserId]);


  useEffect(() => {
    if (!socket || !resolvedConversationId) return;

    const expectedRoomId = isGroupChat ? resolvedConversationId : targetUserId;

    const handleTyping = (data: { roomId: string; actorId: string }) => {
      if (data.roomId === expectedRoomId || data.roomId === resolvedConversationId) {
        setTypingUsers((prev) => (prev.includes(data.actorId) ? prev : [...prev, data.actorId]));
      }
    };

    const handleStopTyping = (data: { roomId: string; actorId: string }) => {
      if (data.roomId === expectedRoomId || data.roomId === resolvedConversationId) {
        setTypingUsers((prev) => prev.filter((uid) => uid !== data.actorId));
      }
    };

    socket.emit("joinRoom", resolvedConversationId);

    const handleMessageReceived = (data: any) => {
      const newMsg = data.message ? data.message : data;
      if (newMsg.conversationId === resolvedConversationId) {
        setMessages((prev) => (prev.find((m: MessageDTO) => m._id === newMsg._id) ? prev : [...prev, newMsg]));
        if (currentUserId && String(newMsg.senderId) !== String(currentUserId)) {
          messageService.markAsRead(resolvedConversationId).catch(() => { });
          setHasNewUnseenMessages(true);
        } else {
          setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId === resolvedConversationId || data.conversationId === undefined) {
        setMessages((prev) => prev.map((m: MessageDTO) => ({ ...m, isRead: true })));
      }
    };

    const handleReactionUpdated = (data: any) => {
      const msgId = data.messageId || data._id;
      if (data.conversationId === resolvedConversationId || data.messageId) {
        setMessages((prev) => prev.map((m: MessageDTO) => (m._id === msgId ? { ...m, reactions: data.reactions } : m)));
      }
    };

    const handleMessagePinned = (data: any) => {
      if (data.conversationId === resolvedConversationId) {
        if (data.isPinned) {
          if (data.message) {
            setPinnedMessages((prev) => {
              if (prev.some((m: MessageDTO) => m._id === data.message._id)) {
                return prev.map((m: MessageDTO) => (m._id === data.message._id ? data.message : m));
              }
              return [...prev, data.message];
            });
          }
        } else {
          setPinnedMessages((prev) => prev.filter((m: MessageDTO) => m._id !== data.messageId));
        }
      }
    };

    const handleMessageRevoked = (data: any) => {
      setMessages((prev: MessageDTO[]) => prev.map((m: MessageDTO) => (m._id === data.messageId ? { ...m, isRevoked: true, content: "" } : m)));
      setPinnedMessages((prev: MessageDTO[]) => prev.filter((m: MessageDTO) => m._id !== data.messageId));
    };

    const handleConversationRemoved = (data: { conversationId: string; groupName: string; reason: string }) => {
      if (data.conversationId === resolvedConversationId && data.reason !== "leave") {
        Alert.alert(
          "Thông báo",
          data.reason === "delete"
            ? `Nhóm ${data.groupName} đã được giải tán`
            : `Bạn đã bị mời ra khỏi nhóm ${data.groupName}`,
          [{
            text: "OK", onPress: () => {
              if (router.canDismiss()) {
                router.dismissAll();
              }
              router.replace("/(tabs)");
            }
          }]
        );
      }
    };

    const handleGroupUpdated = (data: any) => {
      const updatedGroup = data.group ? data.group : data;
      const updatedId = updatedGroup._id || updatedGroup.id || updatedGroup.conversationId;
      
      if (String(updatedId) === String(resolvedConversationId)) {
        setGroupDetails(updatedGroup);
        if (updatedGroup.members) {
          const admins = new Set<string>(
            (updatedGroup.members || [])
              .filter((m: any) => m.role === "LEADER" || m.role === "DEPUTY")
              .map((m: any) => String(m.userId)),
          );
          setAdminIds(admins);
        }
        if (updatedGroup.name) setRealtimeGroupName(updatedGroup.name);
        if (updatedGroup.groupAvatar) setRealtimeAvatar(updatedGroup.groupAvatar);
      }
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("messages-read", handleMessagesRead);
    socket.on("TYPING", handleTyping);
    socket.on("STOP_TYPING", handleStopTyping);
    socket.on("message-pinned", handleMessagePinned);
    socket.on("message-revoked", handleMessageRevoked);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);
    socket.on("GROUP_UPDATED", handleGroupUpdated);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("messages-read", handleMessagesRead);
      socket.off("TYPING", handleTyping);
      socket.off("STOP_TYPING", handleStopTyping);
      socket.off("message-pinned", handleMessagePinned);
      socket.off("message-revoked", handleMessageRevoked);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
      socket.off("GROUP_UPDATED", handleGroupUpdated);
    };
  }, [socket, resolvedConversationId, isGroupChat, targetUserId]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || !resolvedConversationId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await messageService.searchMessages(
        resolvedConversationId,
        text.trim(),
      );
      setSearchResults(results);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const closeSearch = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (socket && targetUserId && !isGroupChat) {
      socket.emit("CHECK_USER_STATUS", targetUserId);
    }
  }, [socket, targetUserId, isGroupChat]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!socket || !resolvedConversationId) return;
    if (!typingTimeoutRef.current) {
      socket.emit("TYPING", { roomId: resolvedConversationId, actorId: currentUserId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("STOP_TYPING", { roomId: resolvedConversationId, actorId: currentUserId });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleReply = (msg: MessageDTO) => {
    setReplyingToWithRef(msg);
    closeModal();
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const scrollToMessage = (msgId: string) => {
    const group = messageGroups.find((g) =>
      g.messages.some((m) => m._id === msgId),
    );
    if (group) {
      const reversedGroups = [...messageGroups].reverse();
      const index = reversedGroups.findIndex((g) => g === group);
      if (index !== -1) {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        // Highlight tin nhắn
        setHighlightedMsgId(msgId);
        // Highlight tin nhắn bằng cách mở rộng hiển thị thời gian
        setExpandedTimeMsgId(msgId);
      }
    } else {
      // Nếu không tìm thấy trong history hiện tại, có thể cần load thêm
      // Nhưng hiện tại ta chỉ báo cáo là không tìm thấy
      Alert.alert(
        "Thông báo",
        "Tin nhắn này nằm ở quá khứ xa, vui lòng cuộn lên để tải thêm lịch sử",
      );
    }
  };

  const currentUserName = user?.fullName || user?.displayName || "Người dùng";

  const getReplyData = (msg: MessageDTO | null) => {
    if (!msg || !msg._id) return undefined;
    let content = msg.content;
    if (msg.type === "image") content = "[Hình ảnh]";
    else if (msg.type === "file")
      content = msg.metadata?.fileName || "[Tệp tin]";

    return {
      messageId: msg._id,
      senderId: msg.senderId,
      senderName:
        msg.senderId === currentUserId
          ? "Bạn"
          : msg.senderName ||
            userCache[msg.senderId]?.fullName ||
            "Người dùng",
      content: content,
      type: msg.type,
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !resolvedConversationId) return;
    const textToSend = inputText.trim();
    setInputText("");
    const replyData = getReplyData(replyingToRef.current);
    setReplyingToWithRef(null);
    Keyboard.dismiss();
    if (socket)
      socket.emit("STOP_TYPING", {
        roomId: resolvedConversationId,
        actorId: currentUserId,
      });
    try {
      const sentMessage = await messageService.sendMessage({
        conversationId: resolvedConversationId,
        type: "text",
        content: textToSend,
        senderName: currentUserName,
        replyTo: replyData,
      });
      if (sentMessage) {
        setMessages((prev: MessageDTO[]) =>
          prev.find((m: MessageDTO) => m._id === sentMessage._id)
            ? prev
            : [...prev, sentMessage],
        );
        setTimeout(
          () =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
          100,
        );
      }
    } catch (e) { }
  };

  const handleSendFile = async () => {
    if (!resolvedConversationId) return;
    try {
      const fileRes = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (fileRes.canceled || !fileRes.assets?.length) return;

      const replyData = getReplyData(replyingToRef.current);
      setReplyingTo(null);
      const sentMessages: MessageDTO[] = [];
      for (const asset of fileRes.assets) {
        const sentMessage = await messageService.sendFileMessage({
          conversationId: resolvedConversationId,
          file: asset,
          senderName: currentUserName,
          replyTo: replyData,
        });
        if (sentMessage) {
          sentMessages.push(sentMessage);
        }
      }

      if (sentMessages.length > 0) {
        setMessages((prev: MessageDTO[]) => {
          const newOnes = sentMessages.filter((sm) => !prev.find((m) => m._id === sm._id));
          return [...prev, ...newOnes];
        });
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      }
    } catch (e) {
      console.error("Lỗi gửi nhiều file:", e);
    }
  };

  const handleSendImage = async () => {
    if (!resolvedConversationId) return;
    try {
      const imgRes = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (imgRes.canceled || !imgRes.assets?.length) return;

      const replyData = getReplyData(replyingToRef.current);
      setReplyingTo(null);
      const sentMessages: MessageDTO[] = [];
      for (const asset of imgRes.assets) {
        const sentMessage = await messageService.sendFileMessage({
          conversationId: resolvedConversationId,
          file: asset,
          isImage: true,
          senderName: currentUserName,
          replyTo: replyData,
        });
        if (sentMessage) {
          sentMessages.push(sentMessage);
        }
      }

      if (sentMessages.length > 0) {
        setMessages((prev: MessageDTO[]) => {
          const newOnes = sentMessages.filter((sm) => !prev.find((m) => m._id === sm._id));
          return [...prev, ...newOnes];
        });
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      }
    } catch (e) {
      console.error("Lỗi gửi nhiều ảnh:", e);
    }
  };

  interface MsgGroup { isSender: boolean; senderId: string; messages: MessageDTO[]; }
  const messageGroups = useMemo((): MsgGroup[] => {
    const FIVE_MIN = 5 * 60 * 1000;
    const groups: MsgGroup[] = [];
    for (const msg of messages) {
      const isSender = msg.senderId === currentUserId;
      const last = groups[groups.length - 1];
      const lastMsg = last?.messages[last.messages.length - 1];
      const gap = lastMsg ? new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime() : Infinity;
      const isSystem = msg.type === "system";
      const lastIsSystem = lastMsg?.type === "system";
      const isPoll = msg.type === "poll";
      const lastIsPoll = lastMsg?.type === "poll";
      if (last && last.senderId === msg.senderId && gap < FIVE_MIN && !isSystem && !lastIsSystem && !isPoll && !lastIsPoll) {
        last.messages.push(msg);
      } else {
        groups.push({ isSender, senderId: msg.senderId, messages: [msg] });
      }
    }
    return groups;
  }, [messages, currentUserId]);

  const invertedMessages = useMemo(() => {
    return [...messageGroups].reverse();
  }, [messageGroups]);

  const canSendMessage = useMemo(() => {
    if (!isGroupChat) return true;
    if (!groupDetails) return true;

    const sendPermission = groupDetails.permissions?.sendMessage || "EVERYONE";
    if (sendPermission === "EVERYONE") return true;

    return adminIds.has(String(currentUserId));
  }, [isGroupChat, groupDetails, adminIds, currentUserId]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePinMessage = async () => {
    if (!selectedMsg) return;
    closeModal();
    try {
      const ok = await messageService.pinMessage(selectedMsg._id);
      if (ok) {
        setPinnedMessages((prev) => [...prev, selectedMsg].filter((msg: MessageDTO, idx: number, arr: MessageDTO[]) => arr.findIndex((m: MessageDTO) => m._id === msg._id) === idx));
        Alert.alert("Đã ghim tin nhắn");
      }
    } catch (e) { }
  };

  const handleUnpinMessage = async () => {
    if (!selectedMsg) return;
    closeModal();
    const ok = await messageService.unpinMessage(selectedMsg._id);
    if (ok) {
      setPinnedMessages((prev) => prev.filter((m: MessageDTO) => m._id !== selectedMsg._id));
      Alert.alert("Đã bỏ ghim tin nhắn");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f9fafb" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={{ paddingTop: insets.top, backgroundColor: "white", zIndex: 10 }}>
        {isSearchMode ? (
          <View className="flex-row items-center px-4 py-2 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={closeSearch} className="p-2 -ml-2">
              <XMarkIcon size={24} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3 py-1 ml-2">
              <MagnifyingGlassIcon size={20} color="#9ca3af" />
              <TextInput
                placeholder="Tìm tin nhắn..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                className="flex-1 ml-2 text-sm text-gray-900 py-1"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </View>
        ) : (
          <ChatHeader
            id={id as string}
            name={realtimeGroupName}
            avatar={realtimeAvatar}
            membersCount={realtimeMembersCount}
            isGroupChat={isGroupChat}
            isOnline={isOnline}
            userStatus={userStatus}
            onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            onSearchToggle={() => setIsSearchMode(true)}
            onInfo={() => {
              router.push({
                pathname: "/chat/info",
                params: {
                  id: resolvedConversationId || id,
                  name: realtimeGroupName,
                  avatar: realtimeAvatar,
                  membersCount: realtimeMembersCount,
                  isGroup: isGroupChat ? "true" : "false",
                  targetUserId,
                },
              });
            }}
            onHeaderClick={() => {
              if (isGroupChat) {
                router.push({
                  pathname: "/chat/info",
                  params: {
                    id: resolvedConversationId || id,
                    name: realtimeGroupName,
                    avatar: realtimeAvatar,
                    membersCount: realtimeMembersCount,
                    isGroup: "true",
                    targetUserId,
                  },
                });
              } else {
                router.push({
                  pathname: "/(tabs)/contacts/send-request",
                  params: {
                    userId: targetUserId,
                    from: "chat",
                  },
                });
              }
            }}
          />
        )}
      </View>

      <View className="flex-1 relative">
        <PinnedMessageBar pinnedMessages={pinnedMessages} />
        <View className="absolute top-0 left-0 right-0 bottom-0" style={{ paddingTop: pinnedMessages.length > 0 ? 64 : 0 }}>
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            keyExtractor={(item) => item.messages[0]?._id + "_group"}
            inverted
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            className="flex-1 px-4"
            contentContainerStyle={{ flexGrow: 1, paddingTop: 80, paddingBottom: 0 }}
            ListHeaderComponent={typingUsers.length > 0 ? (
              <View className="mb-6 self-start flex-row items-center px-5 py-3 shadow-sm bg-white rounded-3xl rounded-bl-lg">
                <Text className="text-gray-500 italic text-sm">{typingUsers.length === 1 ? "Có người đang nhắn tin..." : "Nhiều người đang nhắn tin..."}</Text>
              </View>
            ) : null}
            ListFooterComponent={loadingMore ? <View className="py-4 items-center"><ActivityIndicator color="#3b82f6" /></View> : null}
            onScroll={(e) => {
              const { contentOffset } = e.nativeEvent;
              const closeToBottom = contentOffset.y < 50;
              setIsAtBottom(closeToBottom);
              if (closeToBottom && hasNewUnseenMessages) setHasNewUnseenMessages(false);
            }}
            renderItem={({ item: group }) => {
              const sender = userCache[group.senderId];
              const senderName = sender?.fullName || "Người dùng";
              if (group.messages[0].type === "system") {
                return (
                  <View className="items-center my-3 w-full">
                    {group.messages.map((msg: MessageDTO) => (
                      <View key={msg._id} className="bg-gray-200/80 px-4 py-1.5 rounded-full mb-1">
                        <Text className="text-[12px] text-gray-600 font-medium text-center">{msg.content}</Text>
                      </View>
                    ))}
                  </View>
                );
              }
              if (group.messages[0].type === "poll") {
                return (
                  <View className="items-center my-3 w-full">
                    <MessageItem
                      msg={group.messages[0]}
                      isSender={group.isSender}
                      isLastInBlock={true}
                      onLongPress={() => onLongPressMessage(group.messages[0]._id)}
                      openReactionDetails={() => setReactionDetailMsgId(group.messages[0]._id)}
                      chatImages={chatImages}
                      setViewerIndex={setViewerIndex}
                      messageRefs={messageRefs}
                      expandedTimeMsgId={expandedTimeMsgId}
                      setExpandedTimeMsgId={setExpandedTimeMsgId}
                      onReplyClick={scrollToMessage}
                      isHighlighted={group.messages[0]._id === highlightedMsgId}
                      isAdminHighlighted={
                        groupDetails?.isHighlightEnabled &&
                        adminIds.has(String(group.messages[0].senderId))
                      }
                    />
                  </View>
                );
              }
              return (
                <View className={`mb-6 flex-row ${group.isSender ? "justify-end" : "justify-start"}`}>
                  {!group.isSender && (
                    <View className="w-10 items-center justify-end mr-2">
                      {sender?.avatar ? <Image source={{ uri: sender.avatar }} className="w-8 h-8 rounded-full mb-1" /> : <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1"><Text className="text-blue-600 font-bold text-xs">{senderName.charAt(0).toUpperCase()}</Text></View>}
                    </View>
                  )}
                  <View className={`max-w-[80%] ${group.isSender ? "items-end" : "items-start"}`}>
                    {!group.isSender && isGroupChat && <Text className="text-[11px] font-bold text-gray-500 mb-1 ml-1">{senderName}</Text>}
                    {group.messages.map((msg: MessageDTO, idx: number) => (
                      <MessageItem
                        key={msg._id}
                        msg={msg}
                        isSender={group.isSender}
                        isLastInBlock={idx === group.messages.length - 1}
                        onLongPress={() => onLongPressMessage(msg._id)}
                        openReactionDetails={() => setReactionDetailMsgId(msg._id)}
                        chatImages={chatImages}
                        setViewerIndex={setViewerIndex}
                        messageRefs={messageRefs}
                        expandedTimeMsgId={expandedTimeMsgId}
                        setExpandedTimeMsgId={setExpandedTimeMsgId}
                        onReplyClick={scrollToMessage}
                        isHighlighted={msg._id === highlightedMsgId}
                        isAdminHighlighted={
                          groupDetails?.isHighlightEnabled &&
                          adminIds.has(String(msg.senderId))
                        }
                      />
                    ))}
                  </View>
                </View>
              );
            }}
          />
        </View>

        {isSearchMode && searchQuery.length > 0 && (
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-white z-[60]" style={{ marginTop: pinnedMessages.length > 0 ? 64 : 0 }}>
            {isSearching ? (
              <View className="p-10 items-center">
                <ActivityIndicator color="#3b82f6" />
                <Text className="mt-2 text-gray-400">Đang tìm kiếm...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                className="flex-1"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="px-5 py-3 border-b border-gray-50 flex-row items-center"
                    onPress={() => {
                      closeSearch();
                      setTimeout(() => scrollToMessage(item._id), 300);
                    }}
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                      {userCache[item.senderId]?.avatar ? (
                        <Image source={{ uri: userCache[item.senderId].avatar }} className="w-10 h-10 rounded-full" />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                          <Text className="text-blue-600 font-bold">{(userCache[item.senderId]?.fullName || "U").charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-bold text-gray-900" numberOfLines={1}>{userCache[item.senderId]?.fullName || "Người dùng"}</Text>
                        <Text className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text className="text-gray-600 text-sm" numberOfLines={2}>{item.content}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<View className="p-10 items-center"><Text className="text-gray-400">Không tìm thấy tin nhắn nào</Text></View>}
              />
            ) : (
              <View className="p-10 items-center">
                <Text className="text-gray-400">Không tìm thấy tin nhắn nào</Text>
              </View>
            )}
          </View>
        )}

        {!isAtBottom && (
          <View className="absolute bottom-28 left-0 right-0 items-center z-50">
            {hasNewUnseenMessages ? (
              <TouchableOpacity
                onPress={() => {
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  setHasNewUnseenMessages(false);
                }}
                className="bg-blue-500 flex-row items-center px-4 py-2.5 rounded-full shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-sm mr-2">Tin nhắn mới</Text>
                <ChevronDownIcon size={18} color="white" strokeWidth={3} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                className="bg-white p-2.5 rounded-full shadow-md border border-gray-100"
              >
                <ChevronDownIcon size={24} color="#3b82f6" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View className="flex-1 justify-end" pointerEvents="box-none">
          <ChatInput
            ref={chatInputRef}
            inputText={inputText}
            onInputChange={handleInputChange}
            onSendMessage={sendMessage}
            onSendImage={handleSendImage}
            onSendFile={handleSendFile}
            onCreatePoll={() => {
              if (resolvedConversationId) {
                router.push({
                  pathname: "/chat/create-poll",
                  params: { conversationId: resolvedConversationId },
                });
              }
            }}
            isKeyboardVisible={isKeyboardVisible}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingToWithRef(null)}
            canSendMessage={canSendMessage}
          />
        </View>
      </View>

      <GalleryViewerModal images={chatImages} initialIndex={viewerIndex ?? 0} onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex} visible={viewerIndex !== null} />
      <ReactionDetailsSheet msgId={reactionDetailMsgId} onClose={closeReactionDetails} messages={messages} userCache={userCache} />
      <MessageContextMenu
        visible={!!selectedMessageId && !!selectedMsgLayout}
        selectedMsg={selectedMsg || null}
        layout={selectedMsgLayout}
        onClose={closeModal}
        onReact={handleReact}
        onClearReactions={handleClearReactions}
        onCopy={handleCopy}
        onRevoke={handleRevoke}
        onDeleteLocal={handleDeleteLocal}
        onPin={handlePinMessage}
        onUnpin={handleUnpinMessage}
        onReply={handleReply}
        isPinned={!!selectedMessageId && pinnedMessages.some((m: MessageDTO) => m._id === selectedMessageId)}
        canPin={canPinMessage}
        currentUserId={currentUserId as string}
      />
    </KeyboardAvoidingView>
  );
}

