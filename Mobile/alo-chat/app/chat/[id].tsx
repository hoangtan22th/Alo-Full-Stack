import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
// Thêm import cho gửi file
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  Modal,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  ArrowLeftIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  FaceSmileIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { messageService, MessageDTO } from "../../services/messageService";
import { userService, UserProfileDTO } from "../../services/userService";
import { groupService } from "../../services/groupService";

// Cấu hình chiều cao cho Bottom Sheet (Ngoài component để ổn định Reanimated)
const { height: screenHeight } = Dimensions.get("window");
const SNAP_POINTS = {
  CLOSED: screenHeight,
  MID: screenHeight * 0.45,
  TOP: screenHeight * 0.1,
};

const EMOJI_MAP: Record<string, string> = {
  like: "👍",
  heart: "❤️",
  haha: "😂",
  wow: "😮",
  cry: "😢",
  angry: "😡",
};

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
  const scrollViewRef = useRef<ScrollView>(null);
  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId;
  const messageRefs = useRef<Record<string, View>>({});

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<MessageDTO[]>([]);
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
  const [activeReactionTabIdx, setActiveReactionTabIdx] = useState(0);
  const [userCache, setUserCache] = useState<Record<string, UserProfileDTO>>(
    {},
  );
  const reactionScrollViewRef = useRef<ScrollView>(null);
  const [resolvedConversationId, setResolvedConversationId] = useState<
    string | null
  >(null);

  const translateY = useSharedValue(SNAP_POINTS.CLOSED);
  const context = useSharedValue({ y: 0 });

  const closeReactionDetails = () => {
    translateY.value = withTiming(SNAP_POINTS.CLOSED, { duration: 250 });
    setTimeout(() => {
      setReactionDetailMsgId(null);
      setActiveReactionTabIdx(0);
    }, 300);
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [SNAP_POINTS.CLOSED, SNAP_POINTS.MID],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: opacity,
      backgroundColor: "rgba(0,0,0,0.4)",
    };
  });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Cho phép kéo lên thoải mái nhưng giới hạn kéo xuống một chút trước khi snap
      translateY.value = Math.max(
        SNAP_POINTS.TOP,
        context.value.y + event.translationY,
      );
    })
    .onEnd((event) => {
      const velocityY = event.velocityY;
      const currentY = translateY.value;

      // Logic snap
      if (velocityY > 500) {
        // Vuốt mạnh xuống -> Đóng
        runOnJS(closeReactionDetails)();
      } else if (velocityY < -500) {
        // Vuốt mạnh lên -> Lên TOP
        translateY.value = withTiming(SNAP_POINTS.TOP, { duration: 250 });
      } else {
        // Dựa trên vị trị hiện tại để snap
        if (currentY < (SNAP_POINTS.TOP + SNAP_POINTS.MID) / 2) {
          translateY.value = withTiming(SNAP_POINTS.TOP, { duration: 250 });
        } else if (currentY < (SNAP_POINTS.MID + SNAP_POINTS.CLOSED) / 2) {
          translateY.value = withTiming(SNAP_POINTS.MID, { duration: 250 });
        } else {
          runOnJS(closeReactionDetails)();
        }
      }
    });

  const openReactionDetails = (msgId: string) => {
    setReactionDetailMsgId(msgId);
    translateY.value = withTiming(SNAP_POINTS.MID, { duration: 250 });
  };

  const handleReact = async (emojiKey: string) => {
    if (!selectedMessageId) return;
    const msgId = selectedMessageId;
    closeModal();
    await messageService.reactToMessage(msgId, emojiKey);
  };

  const handleClearReactions = async () => {
    if (!selectedMessageId) return;
    const msgId = selectedMessageId;
    closeModal();
    await messageService.clearReactions(msgId);
  };

  const handleCopy = () => {
    if (!selectedMsg || selectedMsg.type !== "text") return;
    closeModal();
    // Fallback nếu chưa cài expo-clipboard
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
          m._id === msgId ? { ...m, isRevoked: true, content: "" } : m,
        ),
      );
    }
  };

  const handleDeleteLocal = () => {
    if (!selectedMsg) return;
    const msgId = selectedMsg._id;
    closeModal();
    setMessages((prev) => prev.filter((m) => m._id !== msgId));
  };

  // Logic xử lý dữ liệu Reaction Details
  const reactionDetailMsg = useMemo(() => {
    return messages.find((m) => m._id === reactionDetailMsgId);
  }, [reactionDetailMsgId, messages]);

  const reactionTabs = useMemo(() => {
    if (!reactionDetailMsg || !reactionDetailMsg.reactions) return [];

    const reactions = reactionDetailMsg.reactions;
    const uniqueEmojis = Array.from(
      new Set(reactions.map((r: any) => r.emoji)),
    );

    // Tab "Tất cả"
    const allUsersMap: Record<string, any> = {};
    reactions.forEach((r: any) => {
      const cached = userCache[r.userId];
      if (!allUsersMap[r.userId]) {
        allUsersMap[r.userId] = {
          userId: r.userId,
          fullName: cached?.fullName || r.fullName || "Người dùng",
          avatar: cached?.avatar || r.avatarUrl || r.avatar,
          emojis: new Set(),
          total: 0,
        };
      }
      allUsersMap[r.userId].emojis.add(r.emoji);
      allUsersMap[r.userId].total += 1;
    });

    const allTabContent = Object.values(allUsersMap).sort(
      (a: any, b: any) => b.total - a.total,
    );

    const tabs = [
      { key: "all", label: "Tất cả", data: allTabContent },
      ...uniqueEmojis.map((emoji) => ({
        key: emoji,
        label: EMOJI_MAP[emoji] || emoji,
        data: reactions.filter((r: any) => r.emoji === emoji),
      })),
    ];

    return tabs;
  }, [reactionDetailMsg, userCache, EMOJI_MAP]);

  // Tự động tải thông tin user khi xem chi tiết reactions
  // Tải thông tin user (sender/reactor) nếu chưa có trong cache
  useEffect(() => {
    const fetchMissingUsers = async () => {
      // 1. Lấy tất cả userId từ tin nhắn và reactions
      const messageSenderIds = messages.map((m) => m.senderId);
      const reactionUserIds =
        reactionDetailMsg?.reactions?.map((r: any) => r.userId) || [];

      const allIds = Array.from(
        new Set([...messageSenderIds, ...reactionUserIds]),
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

    if (messages.length > 0 || reactionDetailMsgId) {
      fetchMissingUsers();
    }
  }, [messages, reactionDetailMsgId, reactionDetailMsg?.reactions]);

  const selectedMsg = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find((m) => m._id === selectedMessageId);
  }, [selectedMessageId, messages]);

  const hasMyReaction = useMemo(() => {
    if (!selectedMsg || !currentUserId) return false;
    return selectedMsg.reactions?.some((r: any) => r.userId === currentUserId);
  }, [selectedMsg, currentUserId]);

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

  const isGroupChat =
    isGroup !== undefined
      ? isGroup === "true"
      : Boolean(
          membersCount &&
          membersCount !== "undefined" &&
          membersCount !== "null",
        );

  const targetUserId =
    typeof paramsTargetUserId === "string"
      ? paramsTargetUserId
      : typeof id === "string"
        ? id
        : (id as string[])?.[0];
  const userStatus =
    !isGroupChat && targetUserId ? onlineUsers[targetUserId] : null;
  const isOnline = userStatus?.status === "online";

  const getOfflineText = (lastActive?: number) => {
    if (!lastActive) return "Chưa truy cập";
    const diff = Math.floor((Date.now() - lastActive) / 60000);
    if (diff < 1) return "Vừa mới truy cập";
    if (diff < 60) return `Hoạt động ${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  };

  const [loadingMessages, setLoadingMessages] = useState(true);

  // Bước 1: Phân giải ID hội thoại thực tế (đặc biệt quan trọng khi đi từ Danh bạ/UserId)
  useEffect(() => {
    const resolve = async () => {
      const initialId = Array.isArray(id) ? id[0] : id;
      if (!initialId) return;

      // Nếu có isGroup hoặc membersCount, ta tin tưởng đây là conversationId
      // Nếu không có, ta coi id là userId và cần lấy/tạo conversationId 1-1
      const needsResolution = isGroup === undefined && !paramsTargetUserId;

      if (needsResolution) {
        try {
          const conversation =
            await groupService.createDirectConversation(initialId);
          if (conversation && (conversation._id || conversation.id)) {
            setResolvedConversationId(conversation._id || conversation.id);
          } else {
            setResolvedConversationId(initialId);
          }
        } catch (err) {
          console.error(
            "Không thể phân giải hội thoại, dùng ID mặc định:",
            err,
          );
          setResolvedConversationId(initialId);
        }
      } else {
        setResolvedConversationId(initialId);
      }
    };
    resolve();
  }, [id, isGroup, paramsTargetUserId]);

  // Bước 2: Lấy lịch sử tin nhắn khi đã có resolvedConversationId
  useEffect(() => {
    if (!resolvedConversationId) return;

    const fetchMsgs = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await messageService.getMessageHistory(
          resolvedConversationId,
          50,
          0,
        );
        setMessages(msgs);

        // Đánh dấu đã đọc khi vừa load xong hội thoại
        messageService.markAsRead(resolvedConversationId).catch(() => {});
      } catch (e) {
        console.error("Lỗi tải tin nhắn:", e);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMsgs();
  }, [resolvedConversationId]);

  // Bước 3: Quản lý Socket bằng resolvedConversationId
  useEffect(() => {
    if (!socket || !resolvedConversationId) return;

    const expectedRoomId = isGroupChat ? resolvedConversationId : targetUserId;

    const handleTyping = (data: { roomId: string; actorId: string }) => {
      if (
        data.roomId === expectedRoomId ||
        data.roomId === resolvedConversationId
      ) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.actorId)) return [...prev, data.actorId];
          return prev;
        });
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

    socket.emit("joinRoom", resolvedConversationId); // Join room để nhận tin nhắn Realtime

    const handleMessageReceived = (data: any) => {
      const newMsg = data.message ? data.message : data;
      if (newMsg.conversationId === resolvedConversationId) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Đánh dấu đã đọc nếu tin nhắn từ người khác
        if (
          currentUserId &&
          String(newMsg.senderId) !== String(currentUserId)
        ) {
          messageService.markAsRead(resolvedConversationId).catch(() => {});
        }
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (
        data.conversationId === resolvedConversationId ||
        data.conversationId === undefined
      ) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    const handleReactionUpdated = (data: any) => {
      const msgId = data.messageId || data._id;
      if (data.conversationId === resolvedConversationId || data.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId ? { ...m, reactions: data.reactions } : m,
          ),
        );
      }
    };

    // Lắng nghe realtime ghim tin nhắn
    const handleMessagePinned = (data: any) => {
      // data: { message: MessageDTO, conversationId }
      if (data.conversationId === resolvedConversationId && data.message) {
        setPinnedMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) {
            return prev.map((m) =>
              m._id === data.message._id ? data.message : m,
            );
          }
          return [...prev, data.message];
        });
      }
    };

    // Lắng nghe realtime bỏ ghim tin nhắn
    const handleMessageUnpinned = (data: any) => {
      // data: { messageId, conversationId }
      if (data.conversationId === resolvedConversationId && data.messageId) {
        setPinnedMessages((prev) =>
          prev.filter((m) => m._id !== data.messageId),
        );
      }
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("messages-read", handleMessagesRead);
    socket.on("TYPING", handleTyping);
    socket.on("STOP_TYPING", handleStopTyping);
    socket.on("message-pinned", handleMessagePinned);
    socket.on("message-unpinned", handleMessageUnpinned);
    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("messages-read", handleMessagesRead);
      socket.off("TYPING", handleTyping);
      socket.off("STOP_TYPING", handleStopTyping);
      socket.off("message-pinned", handleMessagePinned);
      socket.off("message-unpinned", handleMessageUnpinned);
    };
  }, [socket, resolvedConversationId, isGroupChat, targetUserId]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!socket || !resolvedConversationId) return;

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

  const sendMessage = async () => {
    if (!inputText.trim() || !resolvedConversationId) return;

    const textToSend = inputText.trim();
    setInputText("");
    Keyboard.dismiss();

    if (socket) {
      socket.emit("STOP_TYPING", {
        roomId: resolvedConversationId,
        actorId: currentUserId,
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      const sentMessage = await messageService.sendMessage({
        conversationId: resolvedConversationId,
        type: "text",
        content: textToSend,
      });

      if (sentMessage) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === sentMessage._id)) return prev;
          return [...prev, sentMessage];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e) {
      console.error("Lỗi gửi tin nhắn:", e);
    }
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

      // Nhóm theo SENDER ID cụ thể (không chỉ là isSender) để tránh gộp nhiều người khác vào 1 khối
      if (last && last.senderId === msg.senderId && gap < FIVE_MIN) {
        last.messages.push(msg);
      } else {
        groups.push({ isSender, senderId: msg.senderId, messages: [msg] });
      }
    }
    return groups;
  }, [messages, currentUserId]);

  // 👉 auto scroll khi mở keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Danh sách tin nhắn đã ghim
  const [pinnedMessages, setPinnedMessages] = useState<MessageDTO[]>([]);
  const [showAllPinned, setShowAllPinned] = useState(false);
  // Hàm gửi file (file hoặc ảnh)
  const handleSendFile = async () => {
    if (!resolvedConversationId) return;
    try {
      // Chọn file
      const fileRes = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (fileRes.canceled || !fileRes.assets?.length) return;
      const file = fileRes.assets[0];
      // Gửi file qua messageService (cần có API nhận file dạng FormData)
      const sentMessage = await messageService.sendFileMessage({
        conversationId: resolvedConversationId,
        file,
      });
      if (sentMessage) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === sentMessage._id)) return prev;
          return [...prev, sentMessage];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e) {
      console.error("Lỗi gửi file:", e);
    }
  };

  // Hàm gửi ảnh (tùy chọn, dùng ImagePicker)
  const handleSendImage = async () => {
    if (!resolvedConversationId) return;
    try {
      const imgRes = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (imgRes.canceled || !imgRes.assets?.length) return;
      const image = imgRes.assets[0];
      const sentMessage = await messageService.sendFileMessage({
        conversationId: resolvedConversationId,
        file: image,
        isImage: true,
      });
      if (sentMessage) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === sentMessage._id)) return prev;
          return [...prev, sentMessage];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e) {
      console.error("Lỗi gửi ảnh:", e);
    }
  };

  // Hàm ghim tin nhắn
  const handlePinMessage = async () => {
    if (!selectedMsg) return;
    closeModal();
    try {
      const ok = await messageService.pinMessage(selectedMsg._id);
      if (ok) {
        setPinnedMessages((prev) => {
          const newList = [...prev, selectedMsg];
          return newList.filter(
            (msg, idx, arr) => arr.findIndex((m) => m._id === msg._id) === idx,
          );
        });
        Alert.alert("Đã ghim tin nhắn");
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không thể ghim tin nhắn");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({
        ios: 0,
        android: 0,
      })}
    >
      <View
        style={{ paddingTop: insets.top, backgroundColor: "white", zIndex: 10 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)");
                }
              }}
              className="pr-4 py-2"
            >
              <ArrowLeftIcon size={24} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center flex-1"
              activeOpacity={0.7}
              onPress={() => {
                if (isGroupChat) {
                  router.push({
                    pathname: "/chat/info",
                    params: {
                      id: id,
                      name: name,
                      avatar: avatar,
                      membersCount: membersCount,
                      isGroup: "true",
                    },
                  });
                } else {
                  router.push({
                    pathname: "/contacts/send-request",
                    params: {
                      userId: targetUserId,
                      fullName: name,
                      avatarUrl: avatar,
                      relationStatus: "ACCEPTED",
                      from: "chat",
                      chatId: id,
                      chatName: name,
                      chatAvatar: avatar,
                    },
                  });
                }
              }}
            >
              <View className="relative">
                {avatar ? (
                  <Image
                    source={{ uri: avatar as string }}
                    className="w-11 h-11 rounded-full"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-full bg-gray-900 items-center justify-center">
                    <Text className="text-white font-bold text-lg">
                      {((name as string) || "G").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {!isGroupChat && isOnline && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </View>

              <View className="ml-3 flex-1 pr-2">
                <Text
                  className="text-base font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {name || `Nhóm ${id}`}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {isGroupChat
                    ? `${membersCount} thành viên`
                    : isOnline
                      ? "Đang hoạt động"
                      : getOfflineText(userStatus?.last_active)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-5">
            <TouchableOpacity>
              <PhoneIcon size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity>
              <VideoCameraIcon size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: "/chat/info",
                  params: {
                    id: id,
                    name: name,
                    avatar: avatar,
                    membersCount: membersCount,
                    isGroup: isGroupChat ? "true" : "false",
                    targetUserId: targetUserId,
                  },
                });
              }}
            >
              <InformationCircleIcon size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Body Messages */}
      <View className="flex-1">
        <View className="absolute top-0 left-0 right-0 bottom-0">
          {/* Hiển thị danh sách tin nhắn đã ghim */}
          {pinnedMessages.length > 0 && (
            <View className="bg-yellow-50 border-l-4 border-yellow-400 px-4 py-2 mb-2 rounded-r-2xl mt-2">
              <Text className="text-xs text-yellow-700 font-bold mb-1">
                Tin nhắn đã ghim:
              </Text>
              {(showAllPinned
                ? pinnedMessages
                : pinnedMessages.slice(0, 2)
              ).map((msg, idx) => (
                <View key={msg._id} className="flex-row items-center mb-1">
                  <Text className="text-xs text-gray-800" numberOfLines={1}>
                    {msg.type === "text"
                      ? msg.content
                      : msg.type === "image"
                        ? "[Ảnh]"
                        : msg.type === "file"
                          ? msg.metadata?.fileName || "[Tệp đính kèm]"
                          : "[Tin nhắn]"}
                  </Text>
                </View>
              ))}
              {pinnedMessages.length > 2 && !showAllPinned && (
                <TouchableOpacity onPress={() => setShowAllPinned(true)}>
                  <Text className="text-xs text-blue-600 mt-1">
                    Xem tất cả tin nhắn đã ghim
                  </Text>
                </TouchableOpacity>
              )}
              {showAllPinned && pinnedMessages.length > 2 && (
                <TouchableOpacity onPress={() => setShowAllPinned(false)}>
                  <Text className="text-xs text-blue-600 mt-1">Ẩn bớt</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            onLayout={() =>
              scrollViewRef.current?.scrollToEnd({ animated: false })
            }
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: false })
            }
          >
            {messageGroups.map((group, groupIdx) => {
              const isSender = group.isSender;
              const senderId = group.messages[0].senderId;
              const sender = userCache[senderId];
              const senderName =
                sender?.fullName || (sender as any)?.name || "Người dùng";
              const senderAvatar = sender?.avatar;

              return (
                <View
                  key={groupIdx}
                  className={`mb-6 flex-row ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Cột Avatar (chỉ hiện cho người khác trong nhóm) */}
                  {!isSender && (
                    <View className="w-10 items-center justify-end mr-2">
                      {senderAvatar ? (
                        <Image
                          source={{ uri: senderAvatar }}
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
                    className={`max-w-[80%] ${
                      isSender ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Tên người gửi (chỉ hiện cho người khác trong nhóm) */}
                    {!isSender && isGroupChat && (
                      <Text className="text-[11px] font-bold text-gray-500 mb-1 ml-1">
                        {senderName}
                      </Text>
                    )}

                    {group.messages.map((msg, idx) => {
                      const isLast = idx === group.messages.length - 1;
                      const timeString = isLast
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <View
                          key={msg._id}
                          className={`${isLast ? "" : "mb-1"} w-full ${isSender ? "items-end" : "items-start"}`}
                        >
                          <TouchableOpacity
                            ref={(r) => {
                              if (r) messageRefs.current[msg._id] = r as any;
                            }}
                            activeOpacity={0.8}
                            onLongPress={() => onLongPressMessage(msg._id)}
                            className={`relative ${
                              msg.reactions && msg.reactions.length > 0
                                ? "mb-3"
                                : ""
                            }`}
                          >
                            <View
                              className={`px-5 py-4 shadow-sm ${
                                isSender
                                  ? "bg-black rounded-3xl rounded-br-lg"
                                  : "bg-white rounded-3xl rounded-bl-lg"
                              }`}
                            >
                              {msg.isRevoked ? (
                                <Text
                                  className={
                                    "italic text-sm leading-6 " +
                                    (isSender
                                      ? "text-gray-300"
                                      : "text-gray-400")
                                  }
                                >
                                  Tin nhắn đã bị thu hồi
                                </Text>
                              ) : msg.type === "image" ? (
                                <Image
                                  source={{ uri: msg.content }}
                                  className="w-64 h-48 rounded-2xl self-center"
                                  resizeMode="cover"
                                />
                              ) : msg.type === "file" ? (
                                <View className="flex-row items-center gap-2">
                                  <View className="w-10 h-10 bg-gray-200/20 items-center justify-center rounded-lg">
                                    <InformationCircleIcon
                                      size={24}
                                      color={isSender ? "#fff" : "#000"}
                                    />
                                  </View>
                                  <View>
                                    <Text
                                      className={`text-sm font-bold ${
                                        isSender
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                      numberOfLines={1}
                                    >
                                      {msg.metadata?.fileName || "Tệp đính kèm"}
                                    </Text>
                                  </View>
                                </View>
                              ) : msg.type === "text" ? (
                                <Text
                                  className={`text-base leading-6 ${
                                    isSender ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  {msg.content}
                                </Text>
                              ) : null}
                            </View>

                            {/* Hiển thị đếm Emoji dính dưới đáy bong bóng thoại */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openReactionDetails(msg._id)}
                                className={`absolute -bottom-2.5 ${
                                  isSender ? "right-2" : "left-2"
                                } bg-white border border-gray-100 rounded-full px-2 py-0.5 flex-row items-center shadow-sm z-10`}
                              >
                                <View className="flex-row items-center">
                                  {Array.from(
                                    new Set(
                                      msg.reactions.map((r: any) => r.emoji),
                                    ),
                                  ).map((emojiKey: any) => (
                                    <Text
                                      key={emojiKey}
                                      className="text-[11px] mr-1"
                                    >
                                      {EMOJI_MAP[emojiKey] || "👍"}
                                    </Text>
                                  ))}
                                </View>
                                <Text className="text-[10px] font-bold text-gray-500 ml-1">
                                  {msg.reactions.length}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>

                          {isLast && (
                            <View
                              className={`flex-row items-center mt-1 ${
                                isSender
                                  ? "justify-end pr-2"
                                  : "justify-start pl-2"
                              }`}
                            >
                              <Text className="text-[11px] text-gray-500">
                                {timeString}
                              </Text>
                              {isSender && (
                                <Text
                                  className={`ml-1 text-[11px] font-bold ${
                                    msg.isRead
                                      ? "text-blue-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {msg.isRead ? "✓✓" : "✓"}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {typingUsers.length > 0 && (
              <View className="mb-6 self-start flex-row items-center px-5 py-3 shadow-sm bg-white rounded-3xl rounded-bl-lg">
                <Text className="text-gray-500 italic text-sm">
                  {typingUsers.length === 1
                    ? "Có người đang nhắn tin..."
                    : "Nhiều người đang nhắn tin..."}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Bottom Input Area */}
        <View className="flex-1 justify-end" pointerEvents="box-none">
          <View
            className="w-full flex-row items-end px-4 py-3 bg-transparent"
            style={{
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom, 12),
            }}
          >
            <View className="flex-1 flex-row items-center bg-white rounded-full pl-2 pr-4 py-1.5 shadow-sm border border-gray-200 min-h-[50px]">
              <TouchableOpacity className="p-2" onPress={handleSendFile}>
                <PlusIcon size={24} color="#6b7280" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 mx-2 text-base max-h-24 pt-2 pb-2"
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#9ca3af"
                multiline
                value={inputText}
                onChangeText={handleInputChange}
              />
              <TouchableOpacity className="p-2" onPress={handleSendImage}>
                <FaceSmileIcon size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              className="ml-3 w-[50px] h-[50px] bg-black rounded-full items-center justify-center shadow-md pb-0.5 pr-0.5"
            >
              <PaperAirplaneIcon size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal thả cảm xúc */}
      <Modal
        visible={!!selectedMessageId && !!selectedMsgLayout}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable className="flex-1 bg-black/60" onPress={closeModal}>
          {selectedMsg &&
            selectedMsgLayout &&
            (() => {
              const screenHeight = Dimensions.get("window").height;
              const isTopHalf = selectedMsgLayout.y < screenHeight / 2;

              return (
                <View className="flex-1">
                  {/* Tin nhắn được highlight tại đúng vị trí đo được */}
                  <View
                    style={{
                      position: "absolute",
                      top: selectedMsgLayout.y,
                      left: selectedMsgLayout.x,
                      width: selectedMsgLayout.width,
                      height: selectedMsgLayout.height,
                    }}
                  >
                    <View
                      className={`px-5 py-4 shadow-2xl ${
                        selectedMsg.senderId === currentUserId
                          ? "bg-black rounded-3xl rounded-br-lg"
                          : "bg-white rounded-3xl rounded-bl-lg"
                      }`}
                    >
                      {selectedMsg.isRevoked ? (
                        <Text className="italic text-sm text-gray-400">
                          Tin nhắn đã bị thu hồi
                        </Text>
                      ) : selectedMsg.type === "image" ? (
                        <Image
                          source={{ uri: selectedMsg.content }}
                          className="w-full h-full rounded-2xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          className={`text-base leading-6 ${
                            selectedMsg.senderId === currentUserId
                              ? "text-white"
                              : "text-gray-900"
                          }`}
                        >
                          {selectedMsg.content}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Khay Emoji & Menu lựa chọn */}
                  <View
                    style={{
                      position: "absolute",
                      left: 20,
                      right: 20,
                      top: isTopHalf
                        ? selectedMsgLayout.y + selectedMsgLayout.height + 15
                        : Math.max(
                            20,
                            selectedMsgLayout.y -
                              (selectedMsg.senderId === currentUserId
                                ? 240
                                : 180),
                          ),
                      alignItems:
                        selectedMsg.senderId === currentUserId
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    {/* Khay Emoji */}
                    <View
                      onStartShouldSetResponder={() => true}
                      className="bg-white rounded-full p-2 flex-row gap-2 items-center shadow-2xl border border-gray-100 mb-3"
                    >
                      {Object.entries(EMOJI_MAP).map(([key, emoji]) => (
                        <TouchableOpacity
                          key={key}
                          onPress={() => handleReact(key)}
                          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center active:scale-90"
                        >
                          <Text className="text-xl">{emoji}</Text>
                        </TouchableOpacity>
                      ))}

                      {hasMyReaction && (
                        <TouchableOpacity
                          onPress={handleClearReactions}
                          className="w-10 h-10 bg-red-50 rounded-full items-center justify-center border border-red-100 active:scale-90"
                        >
                          <XMarkIcon size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Context Menu Dọc */}
                    <View
                      onStartShouldSetResponder={() => true}
                      className="bg-white rounded-2xl w-48 shadow-2xl border border-gray-100 overflow-hidden"
                    >
                      {!selectedMsg.isRevoked &&
                        selectedMsg.type === "text" && (
                          <TouchableOpacity
                            onPress={handleCopy}
                            className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                          >
                            <ClipboardDocumentIcon size={18} color="#4b5563" />
                            <Text className="text-[14px] font-medium text-gray-700">
                              Sao chép
                            </Text>
                          </TouchableOpacity>
                        )}

                      {/* Menu ghim/bỏ ghim */}
                      {pinnedMessages.some(
                        (m) => m._id === selectedMsg?._id,
                      ) ? (
                        <TouchableOpacity
                          onPress={async () => {
                            closeModal();
                            if (selectedMsg) {
                              const ok = await messageService.unpinMessage(
                                selectedMsg._id,
                              );
                              if (ok) {
                                setPinnedMessages((prev) =>
                                  prev.filter((m) => m._id !== selectedMsg._id),
                                );
                                Alert.alert("Đã bỏ ghim tin nhắn");
                              }
                            }
                          }}
                          className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                        >
                          <MapPinIcon size={18} color="#f87171" />
                          <Text className="text-[14px] font-medium text-red-500">
                            Bỏ ghim
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={async () => {
                            closeModal();
                            if (selectedMsg) {
                              const ok = await messageService.pinMessage(
                                selectedMsg._id,
                              );
                              if (ok) {
                                setPinnedMessages((prev) => [
                                  ...prev,
                                  selectedMsg,
                                ]);
                                Alert.alert("Đã ghim tin nhắn");
                              }
                            }
                          }}
                          className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                        >
                          <MapPinIcon size={18} color="#4b5563" />
                          <Text className="text-[14px] font-medium text-gray-700">
                            Ghim tin nhắn
                          </Text>
                        </TouchableOpacity>
                      )}

                      {selectedMsg.senderId === currentUserId &&
                        !selectedMsg.isRevoked && (
                          <TouchableOpacity
                            onPress={handleRevoke}
                            className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-100"
                          >
                            <ArrowUturnLeftIcon size={18} color="#f97316" />
                            <Text className="text-[14px] font-medium text-orange-500">
                              Thu hồi
                            </Text>
                          </TouchableOpacity>
                        )}

                      <TouchableOpacity
                        onPress={handleDeleteLocal}
                        className="flex-row items-center gap-3 px-4 py-3 active:bg-red-50"
                      >
                        <TrashIcon size={18} color="#ef4444" />
                        <Text className="text-[14px] font-medium text-red-500">
                          Xóa tin nhắn
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })()}
        </Pressable>
      </Modal>

      {/* Modal Chi tiết cảm xúc (Bottom Sheet tương tác) */}
      <Modal
        visible={!!reactionDetailMsgId}
        transparent
        animationType="none"
        onRequestClose={closeReactionDetails}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-1 justify-end">
            <Animated.View
              style={[
                { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
                animatedBackdropStyle,
              ]}
              //@ts-ignore
              onStartShouldSetResponder={() => true}
              //@ts-ignore
              onResponderRelease={closeReactionDetails}
            />

            <Animated.View
              style={[
                {
                  backgroundColor: "white",
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  height: screenHeight,
                  overflow: "hidden",
                },
                animatedSheetStyle,
              ]}
            >
              <GestureDetector gesture={panGesture}>
                <Animated.View className="items-center py-4 bg-white border-b border-gray-50">
                  <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </Animated.View>
              </GestureDetector>

              <View className="flex-1 bg-white">
                <Text className="text-center text-lg font-bold text-gray-900 mt-2 mb-2">
                  Biểu tượng cảm xúc
                </Text>

                {/* Tab Header */}
                <View className="flex-row border-b border-gray-100 px-2">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                  >
                    {reactionTabs.map((tab, index) => (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => {
                          setActiveReactionTabIdx(index);
                          reactionScrollViewRef.current?.scrollTo({
                            x: index * Dimensions.get("window").width,
                            animated: true,
                          });
                        }}
                        className={`px-4 py-3 items-center border-b-2 ${
                          activeReactionTabIdx === index
                            ? "border-black"
                            : "border-transparent"
                        }`}
                      >
                        <Text
                          className={`text-[15px] ${activeReactionTabIdx === index ? "font-bold text-black" : "text-gray-500"}`}
                        >
                          {tab.label}{" "}
                          {tab.key === "all"
                            ? ""
                            : (reactionDetailMsg?.reactions ?? []).filter(
                                (r: any) => r.emoji === tab.key,
                              ).length}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Tab Content (Horizontal Scroll) */}
                <ScrollView
                  ref={reactionScrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const newIdx = Math.round(
                      e.nativeEvent.contentOffset.x /
                        Dimensions.get("window").width,
                    );
                    setActiveReactionTabIdx(newIdx);
                  }}
                  className="flex-1"
                >
                  {reactionTabs.map((tab) => (
                    <View
                      key={tab.key}
                      style={{ width: Dimensions.get("window").width }}
                      className="flex-1"
                    >
                      <ScrollView className="flex-1 px-4 py-2">
                        {tab.data.map((item: any, idx: number) => {
                          const cached =
                            userCache[item.userId || item.senderId];
                          const displayName =
                            cached?.fullName || item.fullName || "Người dùng";
                          const avatarUri =
                            cached?.avatar ||
                            item.avatarUrl ||
                            item.avatar ||
                            "https://i.pravatar.cc/150";

                          return (
                            <View
                              key={idx}
                              className="flex-row items-center py-3"
                            >
                              <Image
                                source={{ uri: avatarUri }}
                                className="w-12 h-12 rounded-full bg-gray-100"
                              />
                              <View className="ml-3 flex-1">
                                <Text className="text-base font-bold text-gray-900">
                                  {displayName}
                                </Text>
                                {tab.key === "all" && (
                                  <View className="flex-row mt-0.5">
                                    {Array.from(item.emojis || []).map(
                                      (e: any) => (
                                        <Text key={e} className="mr-1 text-xs">
                                          {EMOJI_MAP[e]}
                                        </Text>
                                      ),
                                    )}
                                  </View>
                                )}
                              </View>
                              {tab.key === "all" && item.total > 0 && (
                                <Text className="text-gray-400 font-medium">
                                  {item.total}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                        <View className="h-10" />
                        <View style={{ height: screenHeight * 0.5 }} />
                      </ScrollView>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
