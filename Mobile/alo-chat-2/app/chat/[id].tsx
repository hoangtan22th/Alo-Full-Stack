import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Clipboard,
} from "react-native";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowUturnRightIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { groupService } from "../../services/groupService";
import { MessageDTO, messageService } from "../../services/messageService";
import { UserProfileDTO, userService } from "../../services/userService";
import { contactService } from "../../services/contactService";

// Import custom components and constants
import { EMOJI_MAP } from "../../constants/Chat";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { MessageItem } from "../../components/chat/MessageItem";
import { ChatInput } from "../../components/chat/ChatInput";
import { GalleryViewerModal } from "../../components/chat/GalleryViewer";
import { PinnedMessageBar } from "../../components/chat/PinnedMessageBar";
import { ReactionDetailsSheet } from "../../components/chat/ReactionDetailsSheet";
import { MessageContextMenu } from "../../components/chat/MessageContextMenu";
import { ReportModal } from "../../components/ReportModal";
import { ReportTargetModal } from "../../components/ReportTargetModal";
import { SendContactCardModal } from "../../components/chat/SendContactCardModal";
import { StickerPickerModal } from "../../components/chat/StickerPickerModal";
import { TargetType } from "../../services/reportService";
import { CallMemberSelectorModal } from "../../components/call/CallMemberSelectorModal";
import { useCall } from "../../contexts/CallContext";
import { getMessageTextContent } from "../../utils/messageUtils";

export default function GlobalChatScreen() {
  const {
    id,
    name,
    avatar,
    membersCount,
    isGroup,
    targetUserId: paramsTargetUserId,
    selectionMode,
    initialSelectedIds,
  } = useLocalSearchParams();
  const isGroupChat =
    isGroup !== undefined
      ? isGroup === "true"
      : Boolean(
          membersCount &&
          membersCount !== "undefined" &&
          membersCount !== "null",
        );
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId;

  const messageRefs = useRef<Record<string, View>>({});
  const flatListRef = useRef<FlatList>(null);

  const [showCallMemberSelector, setShowCallMemberSelector] = useState<{
    isVideo: boolean;
  } | null>(null);
  const { startCall } = useCall();

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [inputText, setInputText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMsgLayout, setSelectedMsgLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [reactionDetailMsgId, setReactionDetailMsgId] = useState<string | null>(
    null,
  );
  const [showExtensionMenu, setShowExtensionMenu] = useState(false);
  const [expandedTimeMsgId, setExpandedTimeMsgId] = useState<string | null>(
    null,
  );
  const [targetScrollMsgId, setTargetScrollMsgId] = useState<string | null>(
    null,
  );
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewUnseenMessages, setHasNewUnseenMessages] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserProfileDTO>>(
    {},
  );
  const [resolvedConversationId, setResolvedConversationId] = useState<
    string | null
  >(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);

  const handleOpenGallery = useCallback((imagesList: any[], index: number) => {
    setGalleryImages(imagesList);
    setViewerIndex(index);
  }, []);
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  // Mention State
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionToScrollId, setMentionToScrollId] = useState<string | null>(
    null,
  );
  const [showMentionIndicator, setShowMentionIndicator] = useState(false);

  const filteredMentions = useMemo(() => {
    if (!isGroupChat || mentionSearch === null) return [];

    const allOption = { id: "all", name: "Tất cả", avatar: "" };
    const members = (groupDetails?.members || [])
      .map((m: any) => ({
        id: String(m.userId || m._id),
        name:
          userCache[String(m.userId || m._id)]?.fullName ||
          m.fullName ||
          m.displayName ||
          (m as any).name ||
          "Thành viên",
        avatar: userCache[String(m.userId || m._id)]?.avatar || m.avatar || "",
      }))
      .filter((m: any) => m.id !== String(currentUserId));

    const combined = [allOption, ...members];

    // Find already mentioned names using the exact matching logic
    const mentionedSet = new Set<string>();
    if (inputText) {
      const sortedNames = [...combined.map((m) => m.name)].sort(
        (a, b) => b.length - a.length,
      );
      const regexStr = sortedNames
        .map((n) => n.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&"))
        .join("|");
      const regex = new RegExp(`@(${regexStr})`, "g");
      let match;
      while ((match = regex.exec(inputText)) !== null) {
        mentionedSet.add(match[1]);
      }
    }

    const notMentionedYet = combined.filter((m) => !mentionedSet.has(m.name));

    if (mentionSearch === "") return notMentionedYet;
    return notMentionedYet.filter((m) =>
      m.name.toLowerCase().includes(mentionSearch.toLowerCase()),
    );
  }, [
    isGroupChat,
    mentionSearch,
    groupDetails,
    userCache,
    currentUserId,
    inputText,
  ]);

  const handleSelectMention = (item: { id: string; name: string }) => {
    const textBefore = inputText.substring(0, mentionPosition);
    const textAfter = inputText.substring(
      mentionPosition + (mentionSearch?.length || 0) + 1,
    );
    const newText = `${textBefore}@${item.name} ${textAfter}`;

    // Programmatic text changes may not trigger onSelectionChange immediately.
    // Update cursor position manually to stay in sync.
    setCursorPosition(textBefore.length + item.name.length + 2);

    setInputText(newText);
    setMentionSearch(null);
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };

  const handleSelectionChange = (e: any) => {
    setCursorPosition(e.nativeEvent.selection.start);
  };

  useEffect(() => {
    if (!isGroupChat) return;

    // React Native's onSelectionChange can be stale by 1 character when typing fast.
    // If the cursor is at or very close to the end, trust the full text.
    const isCursorNearEnd = inputText.length - cursorPosition <= 1;
    const textBefore = isCursorNearEnd
      ? inputText
      : inputText.substring(0, cursorPosition);

    const match = textBefore.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      setMentionSearch(match[1]);
      setMentionPosition(textBefore.lastIndexOf("@"));
      setMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  }, [inputText, cursorPosition, isGroupChat]);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isSendContactModalVisible, setIsSendContactModalVisible] =
    useState(false);
  const [isStickerModalVisible, setIsStickerModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: TargetType;
    id: string;
    name: string;
  } | null>(null);
  const [reportMessageIds, setReportMessageIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(
    selectionMode === "true",
  );
  const [selectionPurpose, setSelectionPurpose] = useState<
    "REPORT" | "GENERAL"
  >("REPORT");
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>(() => {
    if (initialSelectedIds) {
      try {
        const ids =
          typeof initialSelectedIds === "string"
            ? JSON.parse(initialSelectedIds)
            : initialSelectedIds;
        return Array.isArray(ids) ? ids : [];
      } catch (e) {
        console.error("Error parsing initialSelectedIds:", e);
      }
    }
    return [];
  });

  const chatInputRef = useRef<any>(null);
  const replyingToRef = useRef<MessageDTO | null>(null);
  const fetchingRef = useRef(false); // V3: Strict protection against concurrent fetches

  const toggleMessageSelection = React.useCallback((msgId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(msgId)
        ? prev.filter((id) => id !== msgId)
        : [...prev, msgId],
    );
  }, []);

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
  const [realtimeGroupName, setRealtimeGroupName] = useState<string>(
    (name as string) || "",
  );
  const [realtimeAvatar, setRealtimeAvatar] = useState<string>(
    (avatar as string) || "",
  );
  const [realtimeMembersCount, setRealtimeMembersCount] = useState<string>(
    (membersCount as string) || "0",
  );
  const [pinnedMessages, setPinnedMessages] = useState<MessageDTO[]>([]);

  const handleStartGroupCall = useCallback(
    (isVideo: boolean, forcedInviteeIds?: string[]) => {
      if (isGroupChat && !forcedInviteeIds) {
        setShowCallMemberSelector({ isVideo });
        return;
      }

      const mappedMembers = (groupDetails?.members || []).map((m: any) => {
        const uId = String(m.userId || m._id);
        const cached = userCache[uId];
        return {
          ...m,
          userId: uId,
          fullName: cached?.fullName || m.fullName,
          avatar: cached?.avatar || m.avatar,
        };
      });

      startCall(
        String(id),
        isVideo,
        isGroupChat,
        realtimeGroupName || `Nhóm ${id}`,
        realtimeAvatar,
        forcedInviteeIds,
        mappedMembers,
      );
    },
    [
      id,
      isGroupChat,
      realtimeGroupName,
      realtimeAvatar,
      groupDetails,
      userCache,
      startCall,
    ],
  );

  const confirmGroupCall = (selectedIds: string[]) => {
    const isVideo = showCallMemberSelector?.isVideo || false;
    setShowCallMemberSelector(null);
    handleStartGroupCall(isVideo, selectedIds);
  };

  const chatImages = useMemo(() => {
    return messages.filter((m) => m.type === "image" && !m.isRevoked);
  }, [messages]);

  const getAutoSelectedMessageIds = useCallback(() => {
    if (isGroupChat) return [];
    const valid = messages.filter(
      (m) =>
        !m.isRevoked &&
        (m.type === "text" || m.type === "image" || m.type === "file"),
    );
    if (valid.length <= 40) {
      return valid.map((m) => m._id);
    } else {
      const first20 = valid.slice(0, 20).map((m) => m._id);
      const last20 = valid.slice(-20).map((m) => m._id);
      return Array.from(new Set([...first20, ...last20]));
    }
  }, [messages, isGroupChat]);

  // Detect unread mentions
  useEffect(() => {
    if (!messages || messages.length === 0 || !user) return;
    const myName = user.fullName || "";

    const mentionMsg = [...messages].reverse().find((m) => {
      if (
        m.type !== "text" ||
        !m.content ||
        m.isRead ||
        String(m.senderId) === String(currentUserId)
      )
        return false;
      return m.content.includes(`@${myName}`) || m.content.includes("@Tất cả");
    });

    if (mentionMsg) {
      setMentionToScrollId(mentionMsg._id);
      setShowMentionIndicator(true);
    }
  }, [messages, user, currentUserId]);

  useEffect(() => {
    if (name && name !== "undefined" && name !== "null")
      setRealtimeGroupName(name as string);
    if (avatar && avatar !== "undefined" && avatar !== "null")
      setRealtimeAvatar(avatar as string);
    if (membersCount && membersCount !== "undefined" && membersCount !== "null")
      setRealtimeMembersCount(membersCount as string);
  }, [name, avatar, membersCount]);

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
    const sIndex = selectedImageIndex;
    closeModal();

    if (
      sIndex !== null &&
      sIndex !== undefined &&
      selectedMsg.type === "image" &&
      selectedMsg.metadata?.imageGroup
    ) {
      const ok = await messageService.revokeImageInGroup(msgId, sIndex);
      if (ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === msgId && m.metadata?.imageGroup) {
              const newGroup = [...m.metadata.imageGroup];
              if (newGroup[sIndex]) {
                newGroup[sIndex] = { ...newGroup[sIndex], isRevoked: true };
              }
              const allRevoked = newGroup.every((img: any) => img.isRevoked);
              return {
                ...m,
                isRevoked: allRevoked,
                metadata: { ...m.metadata, imageGroup: newGroup },
              };
            }
            return m;
          }),
        );
      }
    } else {
      const ok = await messageService.deleteMessage(msgId);
      if (ok) {
        setMessages((prev) =>
          prev.map((m) => {
            let updated = m;
            if (m._id === msgId) {
              updated = { ...m, isRevoked: true };
            }
            if (m.replyTo && m.replyTo.messageId === msgId) {
              updated = {
                ...updated,
                replyTo: { ...m.replyTo, content: "[Tin nhắn đã thu hồi]" },
              };
            }
            return updated;
          }),
        );
      }
    }
  };

  const handleDeleteLocal = async () => {
    if (!selectedMsg) return;
    const msgId = selectedMsg._id;
    const sIndex = selectedImageIndex;
    closeModal();

    if (
      sIndex !== null &&
      sIndex !== undefined &&
      selectedMsg.type === "image" &&
      selectedMsg.metadata?.imageGroup
    ) {
      const ok = await messageService.deleteImageInGroupForMe(msgId, sIndex);
      if (ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === msgId && m.metadata?.imageGroup) {
              const newGroup = [...m.metadata.imageGroup];
              if (newGroup[sIndex]) {
                const arr = newGroup[sIndex].deletedByUsers || [];
                newGroup[sIndex] = {
                  ...newGroup[sIndex],
                  deletedByUsers: [...arr, currentUserId],
                };
              }
              return {
                ...m,
                metadata: { ...m.metadata, imageGroup: newGroup },
              };
            }
            return m;
          }),
        );
      }
    } else {
      const ok = await messageService.deleteMessageForMe(msgId);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m._id !== msgId));
      }
    }
  };

  const handleMultiCopy = () => {
    const textMsgs = messages
      .filter(
        (m) =>
          selectedReportIds.includes(m._id) &&
          m.type === "text" &&
          !m.isRevoked,
      )
      .map((m) => m.content)
      .join("\n");
    if (!textMsgs) {
      Alert.alert(
        "Sao chép",
        "Không có tin nhắn văn bản nào được chọn để sao chép.",
      );
      return;
    }
    Clipboard.setString(textMsgs);
    Alert.alert("Sao chép", "Đã sao chép các tin nhắn được chọn.");
    setIsSelectionMode(false);
    setSelectedReportIds([]);
  };

  const handleMultiShare = () => {
    const selectedMsgs = messages
      .filter((m) => selectedReportIds.includes(m._id) && !m.isRevoked)
      .map((m) => ({
        content: m.content,
        type: m.type,
        metadata: m.metadata,
      }));
    if (selectedMsgs.length === 0) {
      Alert.alert("Chia sẻ", "Không có tin nhắn nào hợp lệ để chia sẻ.");
      return;
    }
    setIsSelectionMode(false);
    setSelectedReportIds([]);
    router.push({
      pathname: "/chat/forward",
      params: {
        messages: JSON.stringify(selectedMsgs),
      },
    });
  };

  const handleMultiRevoke = async () => {
    const myMsgs = messages.filter(
      (m) =>
        selectedReportIds.includes(m._id) &&
        m.senderId === currentUserId &&
        !m.isRevoked,
    );
    if (myMsgs.length === 0) {
      Alert.alert("Thu hồi", "Không có tin nhắn nào do bạn gửi để thu hồi.");
      return;
    }

    Alert.alert(
      "Thu hồi nhiều tin nhắn",
      `Bạn có chắc chắn muốn thu hồi ${myMsgs.length} tin nhắn đã chọn?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thu hồi",
          onPress: async () => {
            const promises = myMsgs.map((m) =>
              messageService.deleteMessage(m._id),
            );
            await Promise.all(promises);
            setMessages((prev) =>
              prev.map((m) =>
                selectedReportIds.includes(m._id) &&
                m.senderId === currentUserId
                  ? { ...m, isRevoked: true }
                  : m,
              ),
            );
            setIsSelectionMode(false);
            setSelectedReportIds([]);
          },
        },
      ],
    );
  };

  const handleMultiDelete = () => {
    if (selectedReportIds.length === 0) return;
    Alert.alert(
      "Xóa nhiều tin nhắn",
      `Bạn có chắc chắn muốn xóa ${selectedReportIds.length} tin nhắn đã chọn?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            const ok =
              await messageService.bulkDeleteMessagesForMe(selectedReportIds);
            if (ok) {
              setMessages((prev) =>
                prev.filter((m) => !selectedReportIds.includes(m._id)),
              );
              setIsSelectionMode(false);
              setSelectedReportIds([]);
            }
          },
        },
      ],
    );
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
      const reactionUserIds =
        messages
          .find((m: MessageDTO) => m._id === reactionDetailMsgId)
          ?.reactions?.map((r: any) => r.userId) || [];
      const groupMemberIds =
        groupDetails?.members?.map((m: any) => String(m.userId || m._id)) || [];

      const allIds = Array.from(
        new Set([...messageSenderIds, ...reactionUserIds, ...groupMemberIds]),
      );
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
        }),
      );

      if (Object.keys(newProfiles).length > 0) {
        setUserCache((prev) => ({ ...prev, ...newProfiles }));
      }
    };

    if (messages.length > 0 || reactionDetailMsgId || groupDetails) {
      fetchMissingUsers();
    }
  }, [messages, reactionDetailMsgId, groupDetails]);

  const selectedMsg = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find((m) => m._id === selectedMessageId);
  }, [selectedMessageId, messages]);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  const onLongPressMessage = (msgId: string, albumIndex?: number) => {
    const ref = messageRefs.current[msgId];
    if (ref) {
      ref.measureInWindow((x, y, width, height) => {
        setSelectedMsgLayout({ x, y, width, height });
        setSelectedMessageId(msgId);
        if (albumIndex !== undefined) {
          setSelectedImageIndex(albumIndex);
        }
      });
    }
  };

  const closeModal = () => {
    setSelectedMessageId(null);
    setSelectedMsgLayout(null);
    setSelectedImageIndex(null);
  };

  const targetUserId =
    typeof paramsTargetUserId === "string"
      ? paramsTargetUserId
      : typeof id === "string"
        ? id
        : (id as string[])?.[0];
  const userStatus =
    !isGroupChat && targetUserId ? onlineUsers[targetUserId] : null;
  const isOnline = userStatus?.status === "online";

  const [isStranger, setIsStranger] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      const initialId = Array.isArray(id) ? id[0] : id;
      if (!initialId) return;

      if (initialId.startsWith("temp-")) {
        setResolvedConversationId(initialId);
        return;
      }

      const isGroupVal =
        isGroup !== undefined
          ? isGroup === "true"
          : Boolean(
              membersCount &&
              membersCount !== "undefined" &&
              membersCount !== "null",
            );

      // UUIDs in this project have dashes, Conversation IDs (MongoDB) don't.
      const isUUID = initialId.includes("-");
      const needsResolution = !isGroupVal && isUUID;

      if (needsResolution) {
        try {
          const conversation = await groupService.createDirectConversation(
            initialId,
            true,
          );
          if (conversation && (conversation._id || conversation.id)) {
            setResolvedConversationId(conversation._id || conversation.id);
          } else {
            setResolvedConversationId(`temp-${initialId}`);
          }
        } catch (err) {
          setResolvedConversationId(`temp-${initialId}`);
        }
      } else {
        setResolvedConversationId(initialId);
      }
    };
    resolve();
  }, [id, isGroup, paramsTargetUserId]);

  useEffect(() => {
    if (!isGroupChat && targetUserId && !targetUserId.startsWith("temp-")) {
      const checkStranger = async () => {
        try {
          const [friends, pending, sent] = await Promise.all([
            contactService.getFriendsList(),
            contactService.getPendingRequests(),
            contactService.getSentRequests(),
          ]);

          const isFriend = friends.some(
            (f: any) =>
              String(f.requesterId) === String(targetUserId) ||
              String(f.recipientId) === String(targetUserId),
          );
          const hasPending = pending.some(
            (f: any) =>
              String(f.requesterId) === String(targetUserId) ||
              String(f.recipientId) === String(targetUserId),
          );
          const hasSent = sent.some(
            (f: any) =>
              String(f.requesterId) === String(targetUserId) ||
              String(f.recipientId) === String(targetUserId),
          );

          setIsStranger(!isFriend && !hasPending && !hasSent);
        } catch (e) {
          setIsStranger(false);
        }
      };
      checkStranger();
    } else {
      setIsStranger(false);
    }
  }, [isGroupChat, targetUserId]);

  const fetchMsgs = async (reset = false) => {
    if (
      !resolvedConversationId ||
      resolvedConversationId.startsWith("temp-") ||
      fetchingRef.current
    )
      return;
    fetchingRef.current = true; // Block further calls immediately

    if (reset) {
      setSkip(0);
      setLoadingMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentSkip = reset ? 0 : skip;
      console.log(
        `[Chat] Fetching messages. skip=${currentSkip}, reset=${reset}`,
      );
      const response = await messageService.getMessageHistory(
        resolvedConversationId,
        50,
        currentSkip,
      );
      const newMsgs = response.messages || [];
      const hasMoreData = response.hasMore ?? newMsgs.length >= 50;

      if (reset) {
        setMessages(newMsgs);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m: MessageDTO) => m._id));
          const filteredNew = newMsgs.filter(
            (m: MessageDTO) => !existingIds.has(m._id),
          );
          return [...filteredNew, ...prev];
        });
      }

      setHasMore(hasMoreData);
      setSkip((prev) => (reset ? newMsgs.length : prev + newMsgs.length));
      console.log(
        `[Chat] Fetched ${newMsgs.length} messages. skip=${skip}, hasMore=${hasMoreData}`,
      );

      if (reset) {
        messageService.markAsRead(resolvedConversationId).catch(() => {});
      }
    } catch (e) {
      console.error("Lỗi tải tin nhắn:", e);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false; // Release block
    }
  };

  const fetchPinnedMessages = async () => {
    if (!resolvedConversationId || resolvedConversationId.startsWith("temp-"))
      return;
    try {
      const pins = await messageService.getPinnedMessages(
        resolvedConversationId,
      );
      setPinnedMessages(pins || []);
    } catch (error) {
      console.error("Lỗi lấy tin nhắn ghim:", error);
    }
  };

  const fetchGroupDetails = async () => {
    if (
      !resolvedConversationId ||
      resolvedConversationId.startsWith("temp-") ||
      !isGroupChat
    )
      return;
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
    if (resolvedConversationId && !resolvedConversationId.startsWith("temp-")) {
      fetchMsgs(true);
      fetchPinnedMessages();
      if (isGroupChat) {
        fetchGroupDetails();
      }
    }
  }, [resolvedConversationId, isGroupChat]);

  // Handle selection mode from params (if coming back from ReportModal)
  useEffect(() => {
    const isSelection = selectionMode === "true";
    setIsSelectionMode(isSelection);

    if (isSelection && initialSelectedIds) {
      try {
        const ids =
          typeof initialSelectedIds === "string"
            ? JSON.parse(initialSelectedIds)
            : initialSelectedIds;
        if (Array.isArray(ids)) {
          setSelectedReportIds(ids);
        }
      } catch (e) {
        console.error("Error parsing initialSelectedIds:", e);
      }
    } else if (!isSelection) {
      setSelectedReportIds([]);
    }
  }, [selectionMode, initialSelectedIds]);

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
    if (
      !socket ||
      !resolvedConversationId ||
      resolvedConversationId.startsWith("temp-")
    )
      return;

    const expectedRoomId = isGroupChat ? resolvedConversationId : targetUserId;

    const handleTyping = (data: { roomId: string; actorId: string }) => {
      if (
        data.roomId === expectedRoomId ||
        data.roomId === resolvedConversationId
      ) {
        setTypingUsers((prev) =>
          prev.includes(data.actorId) ? prev : [...prev, data.actorId],
        );
      }
    };

    const handleStopTyping = (data: { roomId: string; actorId: string }) => {
      if (
        data.roomId === expectedRoomId ||
        data.roomId === resolvedConversationId
      ) {
        setTypingUsers((prev) => prev.filter((uid) => uid !== data.actorId));
      }
    };

    socket.emit("joinRoom", resolvedConversationId);

    const handleMessageReceived = (data: any) => {
      const newMsg = data.message ? data.message : data;
      if (newMsg.conversationId === resolvedConversationId) {
        setMessages((prev) =>
          prev.find((m: MessageDTO) => m._id === newMsg._id)
            ? prev
            : [...prev, newMsg],
        );
        if (
          currentUserId &&
          String(newMsg.senderId) !== String(currentUserId)
        ) {
          messageService.markAsRead(resolvedConversationId).catch(() => {});
          setHasNewUnseenMessages(true);
        } else {
          setTimeout(
            () =>
              flatListRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
              }),
            100,
          );
        }
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (
        data.conversationId === resolvedConversationId ||
        data.conversationId === undefined
      ) {
        setMessages((prev) =>
          prev.map((m: MessageDTO) => ({ ...m, isRead: true })),
        );
      }
    };

    const handleReactionUpdated = (data: any) => {
      const msgId = data.messageId || data._id;
      if (data.conversationId === resolvedConversationId || data.messageId) {
        setMessages((prev) =>
          prev.map((m: MessageDTO) =>
            m._id === msgId ? { ...m, reactions: data.reactions } : m,
          ),
        );
      }
    };

    const handleMessagePinned = (data: any) => {
      if (data.conversationId === resolvedConversationId) {
        if (data.isPinned) {
          if (data.message) {
            setPinnedMessages((prev) => {
              if (prev.some((m: MessageDTO) => m._id === data.message._id)) {
                return prev.map((m: MessageDTO) =>
                  m._id === data.message._id ? data.message : m,
                );
              }
              return [...prev, data.message];
            });
          }
        } else {
          setPinnedMessages((prev) =>
            prev.filter((m: MessageDTO) => m._id !== data.messageId),
          );
        }
      }
    };

    const handleMessageRevoked = (data: any) => {
      setMessages((prev: MessageDTO[]) =>
        prev.map((m: MessageDTO) => {
          let updated = m;
          if (m._id === data.messageId) {
            updated = { ...m, isRevoked: true };
          }
          if (m.replyTo && m.replyTo.messageId === data.messageId) {
            updated = {
              ...updated,
              replyTo: { ...m.replyTo, content: "[Tin nhắn đã thu hồi]" },
            };
          }
          return updated;
        }),
      );
      setPinnedMessages((prev: MessageDTO[]) =>
        prev.filter((m: MessageDTO) => m._id !== data.messageId),
      );
    };

    const handleConversationRemoved = (data: {
      conversationId: string;
      groupName: string;
      reason: string;
    }) => {
      if (
        data.conversationId === resolvedConversationId &&
        data.reason !== "leave"
      ) {
        Alert.alert(
          "Thông báo",
          data.reason === "delete"
            ? `Nhóm ${data.groupName} đã được giải tán`
            : `Bạn đã bị mời ra khỏi nhóm ${data.groupName}`,
          [
            {
              text: "OK",
              onPress: () => {
                if (router.canDismiss()) {
                  router.dismissAll();
                }
                router.replace("/(tabs)");
              },
            },
          ],
        );
      }
    };

    const handleGroupUpdated = (data: any) => {
      const updatedGroup = data.group ? data.group : data;
      const updatedId =
        updatedGroup._id || updatedGroup.id || updatedGroup.conversationId;

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
        if (updatedGroup.groupAvatar)
          setRealtimeAvatar(updatedGroup.groupAvatar);
      }
    };
    // Khi có thay đổi bình chọn, di chuyển message poll xuống cuối
    const handlePollUpdated = (data: any) => {
      setMessages((prev: MessageDTO[]) => {
        const idx = prev.findIndex(
          (m: MessageDTO) =>
            m.type === "poll" && (m as any).metadata?.pollId === data.pollId,
        );
        if (idx === -1) return prev;
        const pollMsg = { ...prev[idx], updatedAt: new Date().toISOString() };
        const filtered = prev.filter((_: any, i: number) => i !== idx);
        return [...filtered, pollMsg];
      });
    };

    const handleMessageUpdated = (data: any) => {
      const updatedMsg = data.message || data;
      if (updatedMsg && updatedMsg._id) {
        setMessages((prev: MessageDTO[]) =>
          prev.map((m: MessageDTO) =>
            m._id === updatedMsg._id ? updatedMsg : m,
          ),
        );
        setPinnedMessages((prev: MessageDTO[]) =>
          prev.map((m: MessageDTO) =>
            m._id === updatedMsg._id ? updatedMsg : m,
          ),
        );
      }
    };

    const handleGroupBanned = (data: any) => {
      const updatedId = data.groupId || data.conversationId;
      if (String(updatedId) === String(resolvedConversationId)) {
        setGroupDetails((prev: any) => ({
          ...prev,
          status: data.status,
          isBanned: data.status === "READ_ONLY",
        }));
      }
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("messages-read", handleMessagesRead);
    socket.on("TYPING", handleTyping);
    socket.on("STOP_TYPING", handleStopTyping);
    socket.on("message-pinned", handleMessagePinned);
    socket.on("message-revoked", handleMessageRevoked);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);
    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("GROUP_BANNED", handleGroupBanned);
    socket.on("POLL_UPDATED", handlePollUpdated);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("messages-read", handleMessagesRead);
      socket.off("TYPING", handleTyping);
      socket.off("STOP_TYPING", handleStopTyping);
      socket.off("message-pinned", handleMessagePinned);
      socket.off("message-revoked", handleMessageRevoked);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("GROUP_BANNED", handleGroupBanned);
      socket.off("POLL_UPDATED", handlePollUpdated);
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
    setCursorPosition((prev) => prev + (text.length - inputText.length));
    setInputText(text);
    if (
      !socket ||
      !resolvedConversationId ||
      resolvedConversationId.startsWith("temp-")
    )
      return;
    if (!typingTimeoutRef.current) {
      socket.emit("TYPING", {
        roomId: resolvedConversationId,
        actorId: currentUserId,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("STOP_TYPING", {
        roomId: resolvedConversationId,
        actorId: currentUserId,
      });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleReply = (msg: MessageDTO) => {
    setReplyingToWithRef(msg);
    closeModal();
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const scrollToMessage = async (msgId: string) => {
    const group = messageGroups.find((g) =>
      g.messages.some((m) => m._id === msgId),
    );
    if (group) {
      const reversedGroups = [...messageGroups].reverse();
      const index = reversedGroups.findIndex((g) => g === group);
      if (index !== -1) {
        // Use setTimeout to ensure UI is ready, even if it's already in the list
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
          setHighlightedMsgId(msgId);
          setExpandedTimeMsgId(msgId);
        }, 100);
      }
    } else {
      if (!hasMore || !resolvedConversationId) {
        Alert.alert("Thông báo", "Không tìm thấy tin nhắn.");
        return;
      }

      let currentSkip = skip;
      let found = false;
      let fetchedMessages: MessageDTO[] = [];
      let stillHasMore: boolean = hasMore;
      let attempts = 0;

      setLoadingMore(true);
      while (!found && stillHasMore && attempts < 50) {
        try {
          const res = await messageService.getMessageHistory(
            resolvedConversationId,
            50,
            currentSkip,
          );
          if (res && res.messages && res.messages.length > 0) {
            fetchedMessages.push(...res.messages);
            currentSkip += res.messages.length;
            stillHasMore = res.hasMore ?? res.messages.length >= 50;
            if (res.messages.some((m) => m._id === msgId)) {
              found = true;
            }
          } else {
            stillHasMore = false;
          }
        } catch (e) {
          break;
        }
        attempts++;
      }
      setLoadingMore(false);

      if (fetchedMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const filtered = fetchedMessages.filter(
            (m) => !existingIds.has(m._id),
          );
          return [...filtered, ...prev];
        });
        setSkip(currentSkip);
        setHasMore(stillHasMore);

        if (found) {
          setTargetScrollMsgId(msgId);
        } else {
          Alert.alert(
            "Thông báo",
            "Tin nhắn ở quá khứ quá xa, không thể tự động cuộn tới.",
          );
        }
      } else {
        Alert.alert("Thông báo", "Không tìm thấy tin nhắn.");
      }
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
          : msg.senderName || userCache[msg.senderId]?.fullName || "Người dùng",
      content: content,
      type: msg.type,
    };
  };

  const ensureConversationId = async (): Promise<string | null> => {
    if (!resolvedConversationId) return null;
    if (!resolvedConversationId.startsWith("temp-"))
      return resolvedConversationId;

    try {
      const convo = await groupService.createDirectConversation(
        targetUserId as string,
        false,
      );
      const newId = convo._id || convo.id;
      setResolvedConversationId(newId);
      return newId;
    } catch (e) {
      console.error("Failed to create direct conversation", e);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !resolvedConversationId) return;
    const textToSend = inputText.trim();
    setInputText("");
    const replyData = getReplyData(replyingToRef.current);
    setReplyingToWithRef(null);
    Keyboard.dismiss();

    const actualConversationId = await ensureConversationId();
    if (!actualConversationId) return;

    if (socket)
      socket.emit("STOP_TYPING", {
        roomId: actualConversationId,
        actorId: currentUserId,
      });
    try {
      const sentMessage = await messageService.sendMessage({
        conversationId: actualConversationId,
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
    } catch (e) {}
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

      const actualConversationId = await ensureConversationId();
      if (!actualConversationId) return;

      const replyData = getReplyData(replyingToRef.current);
      setReplyingTo(null);
      const sentMessages: MessageDTO[] = [];
      for (const asset of fileRes.assets) {
        const sentMessage = await messageService.sendFileMessage({
          conversationId: actualConversationId,
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
          const newOnes = sentMessages.filter(
            (sm) => !prev.find((m) => m._id === sm._id),
          );
          return [...prev, ...newOnes];
        });
        setTimeout(
          () =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
          100,
        );
      }
    } catch (e) {
      console.error("Lỗi gửi nhiều file:", e);
    }
  };

  const handleSendImage = async () => {
    if (!resolvedConversationId) return;

    const actualConversationId = await ensureConversationId();
    if (!actualConversationId) return;

    const replyData = getReplyData(replyingToRef.current);
    try {
      const imgRes = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        shouldDownloadFromNetwork: true,
        videoExportPreset: 0,
      } as any);

      if (imgRes.canceled || !imgRes.assets?.length) return;

      setReplyingTo(null);
      const sentMessages: MessageDTO[] = [];
      const assets = imgRes.assets || [];
      const images = assets.filter((a) => a.type === "image");
      const videos = assets.filter((a) => a.type === "video");

      if (images.length > 1) {
        const sentMessage = await messageService.sendImagesMessage({
          conversationId: actualConversationId,
          files: images,
          senderName: currentUserName,
          replyTo: replyData,
        });
        if (sentMessage) {
          sentMessages.push(sentMessage);
        }
      } else if (images.length === 1) {
        const sentMessage = await messageService.sendFileMessage({
          conversationId: actualConversationId,
          file: images[0],
          isImage: true,
          senderName: currentUserName,
          replyTo: replyData,
        });
        if (sentMessage) {
          sentMessages.push(sentMessage);
        }
      }

      for (const videoAsset of videos) {
        const sentMessage = await messageService.sendFileMessage({
          conversationId: actualConversationId,
          file: videoAsset,
          isImage: false,
          senderName: currentUserName,
          replyTo: replyData,
        });
        if (sentMessage) {
          sentMessages.push(sentMessage);
        }
      }

      if (sentMessages.length > 0) {
        setMessages((prev: MessageDTO[]) => {
          const newOnes = sentMessages.filter(
            (sm) => !prev.find((m) => m._id === sm._id),
          );
          return [...prev, ...newOnes];
        });
        setTimeout(
          () =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
          100,
        );
      }
    } catch (e: any) {
      console.error("Lỗi gửi nhiều ảnh:", e);
      if (e.message?.includes("3164")) {
        setTimeout(async () => {
          try {
            const fileRes = await DocumentPicker.getDocumentAsync({
              type: "video/*",
              copyToCacheDirectory: true,
              multiple: true,
            });
            if (fileRes.canceled || !fileRes.assets?.length) return;

            const sentMessages: MessageDTO[] = [];
            for (const asset of fileRes.assets) {
              const sentMessage = await messageService.sendFileMessage({
                conversationId: actualConversationId,
                file: asset,
                isImage: false,
                senderName: currentUserName,
                replyTo: replyData,
              });
              if (sentMessage) {
                sentMessages.push(sentMessage);
              }
            }

            if (sentMessages.length > 0) {
              setMessages((prev: MessageDTO[]) => {
                const newOnes = sentMessages.filter(
                  (sm) => !prev.find((m) => m._id === sm._id),
                );
                return [...prev, ...newOnes];
              });
              setTimeout(
                () =>
                  flatListRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  }),
                100,
              );
            }
          } catch (docErr) {
            console.error("Lỗi gửi video qua DocumentPicker:", docErr);
            Alert.alert("Lỗi", "Không thể chọn hoặc tải tệp tin này.");
          }
        }, 1000);
      } else {
        Alert.alert("Lỗi", "Không thể chọn hoặc gửi tệp tin này.");
      }
    }
  };

  const handleSendAudio = async (uri: string, durationMillis: number) => {
    if (!resolvedConversationId) return;
    
    const actualConversationId = await ensureConversationId();
    if (!actualConversationId) return;

    const replyData = getReplyData(replyingToRef.current);
    setReplyingToWithRef(null);
    try {
      const asset = {
        uri,
        name: `voice_message.m4a`,
        type: "audio/m4a",
      };
      const sentMessage = await messageService.sendFileMessage({
        conversationId: actualConversationId,
        file: asset as any,
        senderName: currentUserName,
        replyTo: replyData,
      });

      if (sentMessage) {
        setMessages((prev: MessageDTO[]) => {
          if (prev.find((m) => m._id === sentMessage._id)) return prev;
          return [...prev, sentMessage];
        });
        setTimeout(
          () =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
          100,
        );
      }
    } catch (e) {
      console.error("Lỗi gửi tin nhắn thoại:", e);
    }
  };

  const handleSendContactCard = async (
    selectedFriends: any[],
    includePhone: boolean,
  ) => {
    if (!resolvedConversationId) return;
    const actualConversationId = await ensureConversationId();
    if (!actualConversationId) return;

    for (const friend of selectedFriends) {
      const tempId = `temp_contact_${Date.now()}_${friend.id}`;
      const tempMsg: MessageDTO = {
        _id: tempId,
        conversationId: actualConversationId,
        senderId: currentUserId as string,
        senderName: currentUserName,
        type: "contact",
        content: friend.id,
        metadata: {
          contactId: friend.id,
          contactName: friend.name,
          contactAvatar: friend.avatar,
          contactPhone: includePhone ? friend.phone : undefined,
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMsg]);

      try {
        const sentMessage = await messageService.sendMessage({
          conversationId: actualConversationId,
          content: friend.id,
          type: "contact",
          senderName: currentUserName,
          metadata: {
            contactId: friend.id,
            contactName: friend.name,
            contactAvatar: friend.avatar,
            contactPhone: includePhone ? friend.phone : undefined,
          },
        });

        if (sentMessage) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? sentMessage : m)),
          );
        }
      } catch (err) {
        console.error("Lỗi gửi danh thiếp:", err);
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    }

    setTimeout(
      () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      100,
    );
  };

  const handleSendSticker = async (stickerUrl: string) => {
    if (!resolvedConversationId) return;
    const actualConversationId = await ensureConversationId();
    if (!actualConversationId) return;

    const tempId = `temp_sticker_${Date.now()}`;
    const tempMsg: MessageDTO = {
      _id: tempId,
      conversationId: actualConversationId,
      senderId: currentUserId as string,
      senderName: currentUserName,
      type: "image",
      content: stickerUrl,
      metadata: { isSticker: true },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const sentMessage = await messageService.sendMessage({
        conversationId: actualConversationId,
        content: stickerUrl,
        type: "image",
        senderName: currentUserName,
        metadata: { isSticker: true },
      });

      if (sentMessage) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? sentMessage : m)),
        );
      }
    } catch (err) {
      console.error("Lỗi gửi sticker:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }

    setTimeout(
      () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      100,
    );
  };

  interface MsgGroup {
    isSender: boolean;
    senderId: string;
    messages: MessageDTO[];
  }
  const messageGroups = useMemo((): MsgGroup[] => {
    const FIVE_MIN = 5 * 60 * 1000;
    const groups: MsgGroup[] = [];
    for (const msg of messages) {
      const isSender = msg.senderId === currentUserId;
      const last = groups[groups.length - 1];
      const lastMsg = last?.messages[last.messages.length - 1];
      const gap = lastMsg
        ? new Date(msg.createdAt).getTime() -
          new Date(lastMsg.createdAt).getTime()
        : Infinity;
      const isSystem = msg.type === "system";
      const lastIsSystem = lastMsg?.type === "system";
      const isPoll = msg.type === "poll";
      const lastIsPoll = lastMsg?.type === "poll";
      if (
        last &&
        last.senderId === msg.senderId &&
        gap < FIVE_MIN &&
        !isSystem &&
        !lastIsSystem &&
        !isPoll &&
        !lastIsPoll
      ) {
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

  useEffect(() => {
    if (targetScrollMsgId && messageGroups.length > 0) {
      const group = messageGroups.find((g) =>
        g.messages.some((m) => m._id === targetScrollMsgId),
      );
      if (group) {
        const reversedGroups = [...messageGroups].reverse();
        const index = reversedGroups.findIndex((g) => g === group);
        if (index !== -1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5,
            });
            setHighlightedMsgId(targetScrollMsgId);
            setExpandedTimeMsgId(targetScrollMsgId);
            setTargetScrollMsgId(null);
          }, 600);
        }
      }
    }
  }, [messageGroups, targetScrollMsgId]);

  const canSendMessage = useMemo(() => {
    if (!isGroupChat) return true;
    if (!groupDetails) return true;

    // Check if group is banned
    if (groupDetails.isBanned) return false;

    const sendPermission = groupDetails.permissions?.sendMessage || "EVERYONE";
    if (sendPermission === "EVERYONE") return true;

    return adminIds.has(String(currentUserId));
  }, [isGroupChat, groupDetails, adminIds, currentUserId]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
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
        setPinnedMessages((prev) =>
          [...prev, selectedMsg].filter(
            (msg: MessageDTO, idx: number, arr: MessageDTO[]) =>
              arr.findIndex((m: MessageDTO) => m._id === msg._id) === idx,
          ),
        );
        Alert.alert("Đã ghim tin nhắn");
      }
    } catch (e) {}
  };

  const handleUnpinMessage = async () => {
    if (!selectedMsg) return;
    closeModal();
    const ok = await messageService.unpinMessage(selectedMsg._id);
    if (ok) {
      setPinnedMessages((prev) =>
        prev.filter((m: MessageDTO) => m._id !== selectedMsg._id),
      );
      Alert.alert("Đã bỏ ghim tin nhắn");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? -(Math.max(insets.bottom, 12) - 12) : 0
      }
    >
      <View
        style={{ paddingTop: insets.top, backgroundColor: "white", zIndex: 10 }}
      >
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
            onBack={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
            onSearchToggle={() => setIsSearchMode(true)}
            onVoiceCall={() => handleStartGroupCall(false)}
            onVideoCall={() => handleStartGroupCall(true)}
            onInfo={() => {
              const autoIds = isGroupChat ? [] : getAutoSelectedMessageIds();
              router.replace({
                pathname: "/chat/info",
                params: {
                  id: id as string,
                  name: realtimeGroupName,
                  avatar: realtimeAvatar,
                  membersCount: realtimeMembersCount,
                  isGroup: isGroupChat ? "true" : "false",
                  targetUserId,
                  selectedMessageIds: JSON.stringify(autoIds),
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
                  pathname: "/profile/timeline",
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

      {isStranger && !isSearchMode && (
        <View className="bg-red-50 px-4 py-3 border-b border-red-100 flex-row items-center">
          <ExclamationTriangleIcon size={20} color="#dc2626" />
          <Text className="text-red-600 text-[12px] font-bold uppercase flex-1 ml-2 tracking-wide">
            Hãy cẩn thận khi nhắn tin với người lạ.
          </Text>
        </View>
      )}

      <View className="flex-1 relative">
        <PinnedMessageBar
          pinnedMessages={pinnedMessages}
          onPressMessage={scrollToMessage}
        />
        <View
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ paddingTop: pinnedMessages.length > 0 ? 64 : 0 }}
        >
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            keyExtractor={(item) => item.messages[0]?._id + "_group"}
            inverted
            onScrollToIndexFailed={(info) => {
              const offset = info.averageItemLength * info.index;
              flatListRef.current?.scrollToOffset({ offset, animated: false });
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }, 200);
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            className="flex-1 px-3"
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: 80,
              paddingBottom: 0,
            }}
            ListHeaderComponent={
              typingUsers.length > 0 ? (
                <View className="mb-6 self-start flex-row items-center px-5 py-3 shadow-sm bg-white rounded-3xl rounded-bl-lg">
                  <Text className="text-gray-500 italic text-sm">
                    {typingUsers.length === 1
                      ? "Có người đang nhắn tin..."
                      : "Nhiều người đang nhắn tin..."}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color="#3b82f6" />
                </View>
              ) : null
            }
            onScroll={(e) => {
              const { contentOffset } = e.nativeEvent;
              const closeToBottom = contentOffset.y < 50;
              setIsAtBottom(closeToBottom);
              if (closeToBottom && hasNewUnseenMessages)
                setHasNewUnseenMessages(false);
            }}
            renderItem={({ item: group }) => {
              const sender = userCache[group.senderId];
              const senderName = sender?.fullName || "Người dùng";
              if (group.messages[0].type === "system") {
                return (
                  <View className="items-center my-3 w-full">
                    {group.messages.map((msg: MessageDTO) => (
                      <View
                        key={msg._id}
                        className="bg-gray-200/80 px-4 py-1.5 rounded-full mb-1"
                      >
                        <Text className="text-[12px] text-gray-600 font-medium text-center">
                          {msg.content}
                        </Text>
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
                      onLongPress={() =>
                        onLongPressMessage(group.messages[0]._id)
                      }
                      openReactionDetails={() =>
                        setReactionDetailMsgId(group.messages[0]._id)
                      }
                      chatImages={chatImages}
                      setViewerIndex={setViewerIndex}
                      onOpenGallery={handleOpenGallery}
                      messageRefs={messageRefs}
                      expandedTimeMsgId={expandedTimeMsgId}
                      setExpandedTimeMsgId={setExpandedTimeMsgId}
                      onReplyClick={scrollToMessage}
                      isHighlighted={group.messages[0]._id === highlightedMsgId}
                      isAdminHighlighted={
                        groupDetails?.isHighlightEnabled &&
                        adminIds.has(String(group.messages[0].senderId))
                      }
                      members={groupDetails?.members || []}
                      userCache={userCache}
                      currentUserId={currentUserId}
                    />
                  </View>
                );
              }
              return (
                <View
                  className={`mb-6 flex-row ${group.isSender ? "justify-end" : "justify-start"}`}
                >
                  {!group.isSender && (
                    <View className="w-10 items-center justify-end mr-2">
                      {sender?.avatar ? (
                        <Image
                          source={{ uri: sender.avatar }}
                          className="w-8 h-8 rounded-full mb-1"
                        />
                      ) : (
                        <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-1">
                          <Text className="text-blue-600 font-bold text-xs">
                            {senderName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View
                    className={`max-w-[90%] ${group.isSender ? "items-end" : "items-start"}`}
                  >
                    {!group.isSender && isGroupChat && (
                      <Text className="text-[11px] font-bold text-gray-500 mb-1 ml-1">
                        {senderName}
                      </Text>
                    )}
                    {group.messages.map((msg: MessageDTO, idx: number) => (
                      <View key={msg._id}>
                        <MessageItem
                          msg={msg}
                          isSender={group.isSender}
                          isLastInBlock={idx === group.messages.length - 1}
                          onLongPress={(albumIndex) =>
                            !isSelectionMode &&
                            onLongPressMessage(msg._id, albumIndex)
                          }
                          onPress={
                            isSelectionMode
                              ? () => toggleMessageSelection(msg._id)
                              : undefined
                          }
                          isSelected={
                            isSelectionMode &&
                            selectedReportIds.includes(msg._id)
                          }
                          openReactionDetails={() =>
                            setReactionDetailMsgId(msg._id)
                          }
                          chatImages={chatImages}
                          setViewerIndex={setViewerIndex}
                          onOpenGallery={handleOpenGallery}
                          messageRefs={messageRefs}
                          expandedTimeMsgId={expandedTimeMsgId}
                          setExpandedTimeMsgId={setExpandedTimeMsgId}
                          onReplyClick={scrollToMessage}
                          isHighlighted={msg._id === highlightedMsgId}
                          isAdminHighlighted={
                            groupDetails?.isHighlightEnabled &&
                            adminIds.has(String(msg.senderId))
                          }
                          members={groupDetails?.members || []}
                          userCache={userCache}
                          currentUserId={currentUserId}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              );
            }}
          />
        </View>

        {isSearchMode && searchQuery.length > 0 && (
          <View
            className="absolute top-0 left-0 right-0 bottom-0 bg-white z-[60]"
            style={{ marginTop: pinnedMessages.length > 0 ? 64 : 0 }}
          >
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
                        <Image
                          source={{ uri: userCache[item.senderId].avatar }}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                          <Text className="text-blue-600 font-bold">
                            {(userCache[item.senderId]?.fullName || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text
                          className="font-bold text-gray-900"
                          numberOfLines={1}
                        >
                          {userCache[item.senderId]?.fullName || "Người dùng"}
                        </Text>
                        <Text className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-gray-600 text-sm" numberOfLines={2}>
                        {getMessageTextContent(item.content)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="p-10 items-center">
                    <Text className="text-gray-400">
                      Không tìm thấy tin nhắn nào
                    </Text>
                  </View>
                }
              />
            ) : (
              <View className="p-10 items-center">
                <Text className="text-gray-400">
                  Không tìm thấy tin nhắn nào
                </Text>
              </View>
            )}
          </View>
        )}

        {!isAtBottom && (
          <View className="absolute bottom-28 left-0 right-0 items-center z-50">
            {hasNewUnseenMessages ? (
              <TouchableOpacity
                onPress={() => {
                  flatListRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  });
                  setHasNewUnseenMessages(false);
                }}
                className="bg-blue-500 flex-row items-center px-4 py-2.5 rounded-full shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-sm mr-2">
                  Tin nhắn mới
                </Text>
                <ChevronDownIcon size={18} color="white" strokeWidth={3} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  flatListRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  })
                }
                className="bg-white p-2.5 rounded-full shadow-md border border-gray-100"
              >
                <ChevronDownIcon size={24} color="#3b82f6" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mention Indicator Badge */}
        {showMentionIndicator && mentionToScrollId && (
          <View className="absolute top-4 right-4 z-50">
            <TouchableOpacity
              onPress={() => {
                const idx = messages.findIndex(
                  (m) => m._id === mentionToScrollId,
                );
                if (idx !== -1) {
                  flatListRef.current?.scrollToIndex({
                    index: idx,
                    animated: true,
                  });
                }
                setShowMentionIndicator(false);
              }}
              className="bg-blue-600 px-4 py-2 rounded-full shadow-lg flex-row items-center"
            >
              <Text className="text-white font-bold text-sm">
                @ Có người nhắc bạn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMentionIndicator(false)}
              className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1"
            >
              <XMarkIcon size={12} color="black" />
            </TouchableOpacity>
          </View>
        )}

        {!isSelectionMode ? (
          <View className="flex-1 justify-end" pointerEvents="box-none">
            {/* Mention Suggestions List */}
            {mentionSearch !== null && filteredMentions.length > 0 && (
              <View className="bg-white border-t border-gray-200 shadow-md max-h-48 rounded-t-xl overflow-hidden">
                <FlatList
                  data={filteredMentions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="always"
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => handleSelectMention(item)}
                      className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${index === mentionIndex ? "bg-blue-50" : ""}`}
                    >
                      {item.avatar ? (
                        <Image
                          source={{ uri: item.avatar }}
                          className="w-8 h-8 rounded-full mr-3 bg-gray-200"
                        />
                      ) : (
                        <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <Text className="text-blue-600 font-bold">
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text className="text-gray-900 font-medium text-[15px]">
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            <ChatInput
              ref={chatInputRef}
              inputText={inputText}
              onInputChange={handleInputChange}
              onSendMessage={sendMessage}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              onSendContact={() => setIsSendContactModalVisible(true)}
              onOpenSticker={() => setIsStickerModalVisible(true)}
              onCreatePoll={async () => {
                const actualId = await ensureConversationId();
                if (actualId) {
                  router.push({
                    pathname: "/chat/create-poll",
                    params: { conversationId: actualId },
                  });
                }
              }}
              isKeyboardVisible={isKeyboardVisible}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingToWithRef(null)}
              canSendMessage={canSendMessage}
              isBanned={
                groupDetails?.isBanned || groupDetails?.status === "READ_ONLY"
              }
              onSelectionChange={handleSelectionChange}
              onSendAudio={handleSendAudio}
            />
          </View>
        ) : (
          <View className="flex-1 justify-end" pointerEvents="box-none">
            {selectionPurpose === "REPORT" ? (
              <View
                className="bg-white border-t border-gray-100 px-6 py-4 flex-row items-center justify-between"
                style={{
                  paddingBottom: Math.max(insets.bottom, 16),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 10,
                }}
              >
                <View>
                  <Text className="text-sm text-gray-500">Đã chọn</Text>
                  <Text
                    className="text-lg font-bold"
                    style={{
                      color:
                        selectedReportIds.length > 0 &&
                        (selectedReportIds.length < 1 ||
                          selectedReportIds.length > 40)
                          ? "#ef4444"
                          : "#111827",
                    }}
                  >
                    {selectedReportIds.length}{" "}
                    <Text className="text-xs font-normal text-gray-400">
                      (tối đa 40)
                    </Text>
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setIsSelectionMode(false);
                      setSelectedReportIds([]);
                    }}
                    className="px-4 py-2 bg-gray-100 rounded-full"
                  >
                    <Text className="font-bold text-gray-600">Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (
                        selectedReportIds.length < 1 ||
                        selectedReportIds.length > 40
                      ) {
                        Alert.alert(
                          "Thông báo",
                          "Vui lòng chọn từ 1 đến 40 tin nhắn làm bằng chứng.",
                        );
                        return;
                      }

                      const selectedIds = JSON.stringify(selectedReportIds);
                      const isGroupStr = isGroupChat ? "true" : "false";

                      let query = `id=${id}&name=${encodeURIComponent(realtimeGroupName)}&avatar=${encodeURIComponent(realtimeAvatar)}&membersCount=${realtimeMembersCount}&isGroup=${isGroupStr}&selectedMessageIds=${encodeURIComponent(selectedIds)}&showReport=true`;

                      if (!isGroupChat && targetUserId) {
                        query += `&targetUserId=${targetUserId}`;
                      }

                      router.replace(`/chat/info?${query}` as any);
                    }}
                    className="px-6 py-2 rounded-full"
                    style={{
                      backgroundColor:
                        selectedReportIds.length >= 1 &&
                        selectedReportIds.length <= 40
                          ? "#2563eb"
                          : "#93c5fd",
                    }}
                  >
                    <Text className="font-bold text-white">Xong</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-center justify-around"
                style={{
                  paddingBottom: Math.max(insets.bottom, 12),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 10,
                }}
              >
                <TouchableOpacity
                  onPress={handleMultiCopy}
                  className="items-center justify-center py-2 px-1"
                >
                  <ClipboardDocumentIcon size={22} color="#4b5563" />
                  <Text className="text-[10px] text-gray-600 mt-1 font-medium">
                    Sao chép
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMultiShare}
                  className="items-center justify-center py-2 px-1"
                >
                  <ArrowUturnRightIcon size={22} color="#4b5563" />
                  <Text className="text-[10px] text-gray-600 mt-1 font-medium">
                    Chia sẻ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMultiRevoke}
                  className="items-center justify-center py-2 px-1"
                >
                  <ArrowUturnLeftIcon size={22} color="#f97316" />
                  <Text className="text-[10px] text-orange-600 mt-1 font-medium">
                    Thu hồi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMultiDelete}
                  className="items-center justify-center py-2 px-1"
                >
                  <TrashIcon size={22} color="#ef4444" />
                  <Text className="text-[10px] text-red-500 mt-1 font-medium">
                    Xóa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsSelectionMode(false);
                    setSelectedReportIds([]);
                  }}
                  className="items-center justify-center py-2 px-1"
                >
                  <XMarkIcon size={22} color="#6b7280" />
                  <Text className="text-[10px] text-gray-500 mt-1 font-medium">
                    Hủy
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <GalleryViewerModal
        images={galleryImages.length > 0 ? galleryImages : chatImages}
        initialIndex={viewerIndex ?? 0}
        onClose={() => {
          setViewerIndex(null);
          setGalleryImages([]);
        }}
        onIndexChange={setViewerIndex}
        visible={viewerIndex !== null}
      />
      <ReactionDetailsSheet
        msgId={reactionDetailMsgId}
        onClose={closeReactionDetails}
        messages={messages}
        userCache={userCache}
      />
      <MessageContextMenu
        visible={!!selectedMessageId && !!selectedMsgLayout}
        selectedMsg={selectedMsg || null}
        layout={selectedMsgLayout}
        selectedImageIndex={selectedImageIndex}
        onClose={closeModal}
        onReact={handleReact}
        onClearReactions={handleClearReactions}
        onCopy={handleCopy}
        onRevoke={handleRevoke}
        onDeleteLocal={handleDeleteLocal}
        onPin={handlePinMessage}
        onUnpin={handleUnpinMessage}
        onReply={handleReply}
        onForward={(msg) => {
          closeModal();
          router.push({
            pathname: "/chat/forward",
            params: {
              content: msg.content,
              type: msg.type,
              metadata: msg.metadata ? JSON.stringify(msg.metadata) : undefined,
            },
          });
        }}
        onSelectMultiple={(msg) => {
          closeModal();
          setIsSelectionMode(true);
          setSelectionPurpose("GENERAL");
          setSelectedReportIds([msg._id]);
        }}
        onReport={(msg) => {
          closeModal();
          setReportTarget({
            type: TargetType.USER,
            id: msg.senderId,
            name: msg.senderName || "Người dùng",
          });
          setReportMessageIds([msg._id]);
          setIsReportModalVisible(true);
        }}
        onEdit={(msg) => {
          closeModal();
          setInputText(msg.content);
        }}
        isPinned={
          !!selectedMessageId &&
          pinnedMessages.some((m: MessageDTO) => m._id === selectedMessageId)
        }
        canPin={canPinMessage}
        currentUserId={currentUserId as string}
      />

      <ReportModal
        visible={isReportModalVisible}
        onClose={() => {
          setIsReportModalVisible(false);
          setReportTarget(null);
          setReportMessageIds([]);
        }}
        targetId={reportTarget ? reportTarget.id : ""}
        targetType={reportTarget ? reportTarget.type : TargetType.USER}
        targetName={reportTarget ? reportTarget.name : "Người dùng"}
        selectedMessageIds={reportMessageIds}
        messages={messages}
        getAvatarForUser={(senderId) => userCache[senderId]?.avatar || ""}
        conversationId={id as string}
        conversationType={isGroup === "true" ? "GROUP" : "ONE_TO_ONE"}
        onSuccess={() => {
          setIsReportModalVisible(false);
          setReportTarget(null);
          setReportMessageIds([]);
        }}
      />

      <SendContactCardModal
        visible={isSendContactModalVisible}
        onClose={() => setIsSendContactModalVisible(false)}
        onSend={handleSendContactCard}
      />

      <StickerPickerModal
        visible={isStickerModalVisible}
        onClose={() => setIsStickerModalVisible(false)}
        onSelectSticker={handleSendSticker}
      />
      {showCallMemberSelector !== null && (
        <CallMemberSelectorModal
          visible={true}
          isVideo={showCallMemberSelector.isVideo}
          members={(groupDetails?.members || []).map((m: any) => {
            const uId = String(m.userId || m._id);
            const cached = userCache[uId];
            return {
              ...m,
              userId: uId,
              fullName: cached?.fullName || m.fullName,
              avatar: cached?.avatar || m.avatar,
            };
          })}
          currentUserId={String(currentUserId)}
          onClose={() => setShowCallMemberSelector(null)}
          onStartCall={confirmGroupCall}
        />
      )}
    </KeyboardAvoidingView>
  );
}
