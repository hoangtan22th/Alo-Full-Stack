import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
// Thêm import cho gửi file
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  UIManager,
  LayoutAnimation,
  FlatList,
  ActivityIndicator,
} from "react-native";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon,
  DocumentIcon,
  FaceSmileIcon,
  InformationCircleIcon,
  MapPinIcon,
  MicrophoneIcon,
  PhoneIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  VideoCameraIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDecay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { groupService } from "../../services/groupService";
import { MessageDTO, messageService } from "../../services/messageService";
import { UserProfileDTO, userService } from "../../services/userService";

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

// --- PHẦN MỚI: Component Gallery Pager xử lý toàn bộ cử chỉ vuốt ---
const GalleryPager = ({
  images,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  images: MessageDTO[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) => {
  const windowWidth = Dimensions.get("window").width;
  const insets = useSafeAreaInsets();

  const pagerX = useSharedValue(-initialIndex * windowWidth);
  const viewerIndexRef = useSharedValue(initialIndex);
  const [localIndex, setLocalIndex] = useState(initialIndex);

  const thumbnailRef = useRef<FlatList>(null);

  useEffect(() => {
    if (thumbnailRef.current) {
      setTimeout(() => {
        thumbnailRef.current?.scrollToIndex({
          index: localIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 50);
    }
  }, [localIndex]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Pager chính chỉ phản hồi khi ảnh ở kích thước 1x
      // (Việc chuyển giao từ GalleryItem sang Pager đã được xử lý bên trong GalleryItem qua shared value pagerX)
      const basePagerX = -viewerIndexRef.value * windowWidth;
      pagerX.value = basePagerX + event.translationX;
    })
    .onEnd((event) => {
      const currentPagerX = pagerX.value;
      const totalImages = images.length;

      // Tính toán index mục tiêu dựa trên vận tốc hoặc vị trí
      let nextIndex = viewerIndexRef.value;
      if (event.velocityX > 500 || event.translationX > windowWidth / 3) {
        nextIndex = Math.max(0, viewerIndexRef.value - 1);
      } else if (
        event.velocityX < -500 ||
        event.translationX < -windowWidth / 3
      ) {
        nextIndex = Math.min(totalImages - 1, viewerIndexRef.value + 1);
      }

      pagerX.value = withSpring(-nextIndex * windowWidth, {
        overshootClamping: true,
      });
      viewerIndexRef.value = nextIndex;
      runOnJS(setLocalIndex)(nextIndex);
      runOnJS(onIndexChange)(nextIndex);
    });

  const pagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pagerX.value }],
  }));

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center px-6"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Text className="text-white font-bold text-lg">
          {localIndex + 1} / {images.length}
        </Text>
        <TouchableOpacity
          className="p-2 bg-black/50 rounded-full"
          onPress={onClose}
        >
          <XMarkIcon size={28} color="white" />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="flex-row items-center"
          style={[{ width: windowWidth * images.length }, pagerAnimatedStyle]}
        >
          {images.map((img, idx) => (
            <GalleryItem
              key={img._id}
              item={img}
              index={idx}
              pagerX={pagerX}
              viewerIndexRef={viewerIndexRef}
              onClose={onClose}
              onIndexChange={onIndexChange}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Mini Gallery (Thumbnails) */}
      <View
        className="absolute bottom-0 left-0 right-0 py-6 bg-black/40"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <FlatList
          ref={thumbnailRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(item) => "pager_thumb_" + item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            flexGrow: 1,
            justifyContent: "center",
          }}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: 56,
            offset: 56 * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => {
                setLocalIndex(index);
                viewerIndexRef.value = index;
                pagerX.value = withSpring(-index * windowWidth);
                onIndexChange(index);
              }}
              className={`mr-2 rounded-lg overflow-hidden border-2 ${
                localIndex === index ? "border-white" : "border-transparent"
              }`}
            >
              <Image
                source={{ uri: item.content }}
                className="w-12 h-12"
                resizeMode="cover"
              />
              {localIndex !== index && (
                <View className="absolute inset-0 bg-black/40" />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

// --- PHẦN MỚI: Component xử lý cử chỉ cao cấp cho từng ảnh trong Gallery ---
const GalleryItem = ({
  item,
  index,
  pagerX,
  onClose,
  viewerIndexRef,
  onIndexChange,
}: {
  item: MessageDTO;
  index: number;
  pagerX: any;
  onClose: () => void;
  viewerIndexRef: any;
  onIndexChange: (index: number) => void;
}) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isZoomed, setIsZoomed] = useState(false);

  // Khôi phục vị trí khi chuyển sang ảnh khác
  useEffect(() => {
    if (viewerIndexRef.value !== index) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      opacity.value = withTiming(1);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setIsZoomed(false);
    }
  }, [viewerIndexRef.value, index]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setIsZoomed)(true);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(setIsZoomed)(true);
      }
    });

  let panGesture = Gesture.Pan()
    .onStart(() => {
      // Bắt giá trị thực tế ngay khi bắt đầu chạm (để ngắt gia tốc giữa chừng)
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.1) {
        // Chỉ xử lý kéo dọc để đóng ảnh
        translateY.value = event.translationY;
        opacity.value = Math.max(0.5, 1 - Math.abs(event.translationY) / 500);
      } else {
        // Panning khi đang zoom - Có giới hạn ranh giới (Boundary Clamping)
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;

        let nextX = savedTranslateX.value + event.translationX;
        let nextY = savedTranslateY.value + event.translationY;

        // Fluid Boundary Switch: Nếu kéo vượt biên X, truyền lực kéo sang cho Pager cha
        if (nextX > maxTranslateX) {
          const overflow = nextX - maxTranslateX;
          pagerX.value = -index * windowWidth + overflow;
          nextX = maxTranslateX;
        } else if (nextX < -maxTranslateX) {
          const overflow = nextX + maxTranslateX;
          pagerX.value = -index * windowWidth + overflow;
          nextX = -maxTranslateX;
        } else {
          // Vẫn đang trong ảnh, đưa pager về đúng vị trí gốc
          pagerX.value = -index * windowWidth;
        }

        // Giới hạn trục Y (Clamp)
        if (nextY > maxTranslateY) nextY = maxTranslateY;
        if (nextY < -maxTranslateY) nextY = -maxTranslateY;

        translateX.value = nextX;
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      if (scale.value <= 1.1) {
        if (
          Math.abs(event.velocityY) > 800 ||
          Math.abs(event.translationY) > 150
        ) {
          // Thoát màn hình
          translateY.value = withTiming(
            event.translationY > 0 ? windowHeight : -windowHeight,
            {},
            () => runOnJS(onClose)(),
          );
        } else {
          // Quay lại vị trí cũ
          translateY.value = withTiming(0);
          opacity.value = withTiming(1);
        }
      } else {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;

        // Snapping Pager nếu tay đang buông ở quá biên
        const currentPagerX = pagerX.value;
        const basePagerX = -index * windowWidth;
        const diff = currentPagerX - basePagerX;

        if (Math.abs(diff) > windowWidth * 0.2) {
          const nextIndex = diff > 0 ? index - 1 : index + 1;
          if (nextIndex >= 0 && nextIndex < 100) {
            pagerX.value = withSpring(-nextIndex * windowWidth, {
              overshootClamping: true,
            });
            viewerIndexRef.value = nextIndex;
            runOnJS(onIndexChange)(nextIndex);
          } else {
            pagerX.value = withSpring(basePagerX);
          }
        } else {
          pagerX.value = withSpring(basePagerX);

          // Thêm GIA TỐC (Momentum) cực mượt cho ảnh khi đang zoom
          translateX.value = withDecay({
            velocity: event.velocityX,
            clamp: [-maxTranslateX, maxTranslateX],
            rubberBandEffect: true,
          });

          translateY.value = withDecay({
            velocity: event.velocityY,
            clamp: [-maxTranslateY, maxTranslateY],
            rubberBandEffect: true,
          });
        }
      }
    });

  // Chỉ dùng activeOffsetY khi chưa zoom (để không đè thao tác lướt trang của Pager)
  if (!isZoomed) {
    panGesture = panGesture.activeOffsetY([-10, 10]);
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector
      gesture={Gesture.Simultaneous(pinchGesture, panGesture, doubleTap)}
    >
      <Animated.View
        style={[
          {
            width: windowWidth,
            height: windowHeight,
            justifyContent: "center",
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: item.content }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

// --- Component hiển thị từng tin nhắn đơn lẻ ---
const MessageItem = ({
  msg,
  isSender,
  isLastInBlock,
  onLongPress,
  openReactionDetails,
  chatImages,
  setViewerIndex,
  messageRefs,
  expandedTimeMsgId,
  setExpandedTimeMsgId,
}: {
  msg: MessageDTO;
  isSender: boolean;
  isLastInBlock: boolean;
  onLongPress: () => void;
  openReactionDetails: () => void;
  chatImages: MessageDTO[];
  setViewerIndex: (idx: number) => void;
  messageRefs: React.MutableRefObject<Record<string, View>>;
  expandedTimeMsgId: string | null;
  setExpandedTimeMsgId: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`${isLastInBlock ? "" : "mb-1"} w-full ${isSender ? "items-end" : "items-start"}`}
    >
      <TouchableOpacity
        ref={(r) => {
          if (r) messageRefs.current[msg._id] = r as any;
        }}
        activeOpacity={0.8}
        onLongPress={onLongPress}
        onPress={() => {
          if (!isLastInBlock) {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setExpandedTimeMsgId((prev) => (prev === msg._id ? null : msg._id));
          }
        }}
        className="relative"
      >
        <View
          className={`shadow-sm ${
            msg.type === "image" && !msg.isRevoked
              ? "p-0 bg-transparent"
              : "px-5 py-3 " +
                (isSender
                  ? "bg-black rounded-3xl rounded-br-lg"
                  : "bg-white rounded-3xl rounded-bl-lg")
          }`}
        >
          {msg.isRevoked ? (
            <Text
              className={
                "italic text-sm leading-6 " +
                (isSender ? "text-gray-300" : "text-gray-400")
              }
            >
              Tin nhắn đã bị thu hồi
            </Text>
          ) : msg.type === "image" ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const idx = chatImages.findIndex((img) => img._id === msg._id);
                if (idx !== -1) setViewerIndex(idx);
              }}
              onLongPress={onLongPress}
            >
              <Image
                source={{ uri: msg.content }}
                className="w-[260px] h-[200px] rounded-[22px] border border-gray-100/50 self-center"
                resizeMode="cover"
              />
            </TouchableOpacity>
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
                  className={`text-sm font-bold ${isSender ? "text-white" : "text-gray-900"}`}
                  numberOfLines={1}
                >
                  {msg.metadata?.fileName || "Tệp đính kèm"}
                </Text>
              </View>
            </View>
          ) : msg.type === "text" ? (
            <Text
              className={`text-base leading-6 ${isSender ? "text-white" : "text-gray-900"}`}
            >
              {msg.content}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Hiển thị phân loại đếm Emoji dính dưới đáy bong bóng thoại */}
      {(msg.reactions?.length ?? 0) > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openReactionDetails}
          className={`bg-white border border-gray-100 rounded-[14px] px-1.5 py-0.5 flex-row flex-wrap items-center shadow-sm z-10 -mt-3.5 mb-2 max-w-[85%] ${isSender ? "mr-4" : "ml-4"}`}
        >
          <View className="flex-row flex-wrap items-center gap-1.5">
            {Array.from(
              new Set((msg.reactions || []).map((r: any) => r.emoji)),
            ).map((emojiKey: any) => {
              const count = (msg.reactions || [])
                .filter((r: any) => r.emoji === emojiKey)
                .reduce((acc: number, r: any) => acc + (r.count || 1), 0);
              return (
                <View
                  key={emojiKey}
                  className="flex-row items-center mt-0.5 mb-0.5"
                >
                  <Text className="text-[11px] mr-0.5">
                    {EMOJI_MAP[emojiKey] || "👍"}
                  </Text>
                  <Text className="text-[10px] font-bold text-gray-500">
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      )}

      {(isLastInBlock || expandedTimeMsgId === msg._id) && (
        <View
          className={`flex-row items-center mt-1 ${isSender ? "justify-end pr-2" : "justify-start pl-2"}`}
        >
          <Text className="text-[11px] text-gray-500">{timeString}</Text>
          {isSender && (
            <Text
              className={`ml-1 text-[11px] font-bold ${msg.isRead ? "text-blue-500" : "text-gray-400"}`}
            >
              {msg.isRead ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
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

  // Trạng thái cho Plus Menu (Các chức năng mở rộng Gửi ảnh/Gửi tệp/Gửi icon)
  const [showExtensionMenu, setShowExtensionMenu] = useState(false);
  const [expandedTimeMsgId, setExpandedTimeMsgId] = useState<string | null>(
    null,
  );
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewUnseenMessages, setHasNewUnseenMessages] = useState(false);
  const messagesCountRef = useRef(0);
  const [userCache, setUserCache] = useState<Record<string, UserProfileDTO>>(
    {},
  );
  const reactionScrollViewRef = useRef<ScrollView>(null);
  const [resolvedConversationId, setResolvedConversationId] = useState<
    string | null
  >(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  const chatImages = useMemo(() => {
    return messages.filter((m) => m.type === "image" && !m.isRevoked);
  }, [messages]);

  const galleryRef = useRef<FlatList>(null);
  const thumbnailRef = useRef<FlatList>(null);

  useEffect(() => {
    if (viewerIndex !== null && thumbnailRef.current) {
      setTimeout(() => {
        thumbnailRef.current?.scrollToIndex({
          index: viewerIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 50);
    }
  }, [viewerIndex]);

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
      allUsersMap[r.userId].total += r.count || 1;
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
  const fetchMsgs = async (reset = false) => {
    if (!resolvedConversationId) return;
    if (reset) {
      setLoadingMessages(true);
      setSkip(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentSkip = reset ? 0 : skip;
      const response = await messageService.getMessageHistory(
        resolvedConversationId,
        50,
        currentSkip,
      );

      const newMsgs = response.messages || [];
      const hasMoreData = response.hasMore ?? newMsgs.length === 50;

      if (reset) {
        setMessages(newMsgs);
      } else {
        // Prepend tin nhắn cũ vào đầu mảng (Nếu ScrollView bình thường)
        // Nhưng nếu FlatList inverted, it's simpler to manage array order.
        // Ở đây ta giữ [oldest -> newest] trong state 'messages'
        setMessages((prev) => [...newMsgs, ...prev]);
      }

      setHasMore(hasMoreData);
      setSkip((prev) => (reset ? newMsgs.length : prev + newMsgs.length));
      // BỎ: Không lấy pinned từ history nữa, đã có fetchPinnedMessages riêng
      // setPinnedMessages(newMsgs.filter((m) => m.isPinned));

      if (reset) {
        messageService.markAsRead(resolvedConversationId).catch(() => {});
      }
    } catch (e) {
      console.error("Lỗi tải tin nhắn:", e);
    } finally {
      setLoadingMessages(false);
      setLoadingMore(false);
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

  useEffect(() => {
    fetchMsgs(true);
    fetchPinnedMessages();
  }, [resolvedConversationId]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loadingMessages) {
      fetchMsgs(false);
    }
  };

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

        // Đánh dấu đã đọc nếu tin nhắn từ người khác
        if (
          currentUserId &&
          String(newMsg.senderId) !== String(currentUserId)
        ) {
          messageService.markAsRead(resolvedConversationId).catch(() => {});
          // Không tự động cuộn xuống, chỉ hiện thông báo
          setHasNewUnseenMessages(true);
        } else {
          // Tin nhắn của chính mình -> Cuộn xuống đáy ngay
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
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

    // Lắng nghe realtime ghim/bỏ ghim tin nhắn
    const handleMessagePinned = (data: any) => {
      // data: { messageId, isPinned, message, conversationId }
      if (data.conversationId === resolvedConversationId) {
        if (data.isPinned) {
          if (data.message) {
            setPinnedMessages((prev) => {
              if (prev.some((m) => m._id === data.message._id)) {
                return prev.map((m) =>
                  m._id === data.message._id ? data.message : m,
                );
              }
              return [...prev, data.message];
            });
          }
        } else {
          setPinnedMessages((prev) =>
            prev.filter((m) => m._id !== data.messageId),
          );
        }
      }
    };

    // Lắng nghe realtime thu hồi tin nhắn
    const handleMessageRevoked = (data: any) => {
      // data: { messageId: string, revokedAt?: string }
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, isRevoked: true, content: "" } : m,
        ),
      );

      // Nếu tin nhắn đang được ghim bị thu hồi, tự động gỡ khỏi thanh ghim
      setPinnedMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    };

    // Lắng nghe sự kiện cập nhật nhóm (thành viên, tên, avatar)
    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup._id === resolvedConversationId) {
        if (updatedGroup.name) setRealtimeGroupName(updatedGroup.name);
        if (updatedGroup.groupAvatar !== undefined)
          setRealtimeAvatar(updatedGroup.groupAvatar);
        if (updatedGroup.members)
          setRealtimeMembersCount(updatedGroup.members.length.toString());
      }
    };
    const handleConversationRemoved = (data: {
      conversationId: string;
      reason?: "leave" | "kick" | "delete";
    }) => {
      if (data.conversationId === resolvedConversationId) {
        if (data.reason === "leave") {
          // User tự rời, đã có thông báo ở Info screen hoặc tự biết rồi
          router.replace("/(tabs)");
          return;
        }

        Alert.alert("Thông báo", "Bạn đã không còn ở trong nhóm này nữa.", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]);
        // Tự động chuyển sau 3 giây nếu không bấm OK
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 3000);
      }
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("messages-read", handleMessagesRead);
    socket.on("TYPING", handleTyping);
    socket.on("STOP_TYPING", handleStopTyping);
    socket.on("message-pinned", handleMessagePinned);
    socket.on("message-revoked", handleMessageRevoked);
    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("messages-read", handleMessagesRead);
      socket.off("TYPING", handleTyping);
      socket.off("STOP_TYPING", handleStopTyping);
      socket.off("message-pinned", handleMessagePinned);
      socket.off("message-revoked", handleMessageRevoked);
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
    };
  }, [socket, resolvedConversationId, isGroupChat, targetUserId]);

  // Bước 4: Tự động kiểm tra trạng thái Online của người dùng khi chat 1-1
  useEffect(() => {
    if (socket && targetUserId && !isGroupChat) {
      socket.emit("CHECK_USER_STATUS", targetUserId);
    }
  }, [socket, targetUserId, isGroupChat]);

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
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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

      const isSystem = msg.type === "system";
      const lastIsSystem = lastMsg?.type === "system";

      // Nhóm theo SENDER ID cụ thể, NHƯNG tách riêng tin nhắn hệ thống
      if (
        last &&
        last.senderId === msg.senderId &&
        gap < FIVE_MIN &&
        !isSystem &&
        !lastIsSystem
      ) {
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
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  // hàm xoay nút chọn menu gửi file
  const spinMenu = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withTiming(showExtensionMenu ? "45deg" : "0deg", {
            duration: 250,
          }),
        },
      ],
    };
  });

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
                      id: resolvedConversationId || id,
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
                {realtimeAvatar ? (
                  <Image
                    source={{ uri: realtimeAvatar }}
                    className="w-11 h-11 rounded-full"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-full bg-gray-900 items-center justify-center">
                    <Text className="text-white font-bold text-lg">
                      {((realtimeGroupName as string) || "G")
                        .charAt(0)
                        .toUpperCase()}
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
                  {realtimeGroupName || `Nhóm ${id}`}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {isGroupChat
                    ? `${realtimeMembersCount} thành viên`
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
                    id: resolvedConversationId || id,
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
      <View className="flex-1 relative">
        {/* Floating Pinned Message Bar */}
        {pinnedMessages.length > 0 && (
          <View className="absolute top-2 left-4 right-4 z-20 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <View className="flex-row items-center px-4 py-3 bg-yellow-50">
              <MapPinIcon size={20} color="#eab308" />
              <View className="flex-1 ml-3 mr-2">
                <Text
                  className="text-[13px] font-bold text-yellow-800"
                  numberOfLines={1}
                >
                  {pinnedMessages[pinnedMessages.length - 1].type === "text"
                    ? pinnedMessages[pinnedMessages.length - 1].content
                    : pinnedMessages[pinnedMessages.length - 1].type === "image"
                      ? "[Ảnh]"
                      : pinnedMessages[pinnedMessages.length - 1].type ===
                          "file"
                        ? pinnedMessages[pinnedMessages.length - 1].metadata
                            ?.fileName || "[Tệp đính kèm]"
                        : "[Tin nhắn]"}
                </Text>
                <Text className="text-[11px] text-yellow-700 mt-0.5 font-medium">
                  Tin nhắn đã ghim
                </Text>
              </View>
              {pinnedMessages.length > 1 && (
                <TouchableOpacity
                  onPress={() => setShowAllPinned(true)}
                  className="bg-yellow-200 px-2 py-1 rounded"
                >
                  <Text className="text-[11px] font-bold text-yellow-800 tracking-tight">
                    +{pinnedMessages.length - 1}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Modal Xem tất cả tin ghim */}
        <Modal
          visible={showAllPinned}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAllPinned(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full rounded-2xl overflow-hidden max-h-[70%]">
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <MapPinIcon size={20} color="#eab308" />
                  <Text className="ml-2 text-base font-bold text-gray-900">
                    Danh sách đã ghim
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowAllPinned(false)}>
                  <XMarkIcon size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="p-4"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {pinnedMessages.map((msg) => (
                  <View
                    key={msg._id}
                    className="bg-yellow-50 rounded-xl p-3 mb-3 border border-yellow-200"
                  >
                    <Text className="text-[14px] font-medium text-yellow-900 mb-1">
                      {msg.type === "text"
                        ? msg.content
                        : msg.type === "image"
                          ? "[Ảnh]"
                          : msg.metadata?.fileName || "[Tệp đính kèm]"}
                    </Text>
                    <Text className="text-[11px] text-yellow-700">
                      Ghim lúc {new Date(msg.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ paddingTop: pinnedMessages.length > 0 ? 64 : 0 }}
        >
          <FlatList
            ref={flatListRef as any}
            data={[...messageGroups].reverse()}
            keyExtractor={(item) => item.messages[0]?._id + "_group"}
            inverted
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            // 👉 Ngăn chặn hiện tượng "giật" tin nhắn khi có tin mới tới lúc đang xem tin cũ
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            automaticallyAdjustContentInsets={false}
            maxToRenderPerBatch={10}
            windowSize={10}
            className="flex-1 px-4"
            contentContainerStyle={{
              paddingTop: 80, // Tăng padding ở đáy (visual bottom) để không bị che
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
              if (closeToBottom && hasNewUnseenMessages) {
                setHasNewUnseenMessages(false);
              }
            }}
            renderItem={({ item: group }) => {
              const isSender = group.isSender;
              const senderId = group.messages[0].senderId;
              const sender = userCache[senderId];
              const senderName =
                sender?.fullName || (sender as any)?.name || "Người dùng";
              const senderAvatar = sender?.avatar;

              if (
                group.messages.length > 0 &&
                group.messages[0].type === "system"
              ) {
                return (
                  <View className="items-center my-3 w-full">
                    {group.messages.map((msg) => (
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

              return (
                <View
                  className={`mb-6 flex-row ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
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
                    {!isSender && isGroupChat && (
                      <Text className="text-[11px] font-bold text-gray-500 mb-1 ml-1">
                        {senderName}
                      </Text>
                    )}

                    {(() => {
                      const blocks: {
                        type: string;
                        items: MessageDTO[];
                        id: string;
                      }[] = [];
                      let currentImages: MessageDTO[] = [];
                      for (let i = 0; i < group.messages.length; i++) {
                        const m = group.messages[i];
                        if (m.type === "image" && !m.isRevoked) {
                          currentImages.push(m);
                        } else {
                          if (currentImages.length > 0) {
                            blocks.push({
                              type: "image_group",
                              items: currentImages,
                              id: currentImages[0]._id + "_grp",
                            });
                            currentImages = [];
                          }
                          blocks.push({
                            type: "single",
                            items: [m],
                            id: m._id,
                          });
                        }
                      }
                      if (currentImages.length > 0) {
                        blocks.push({
                          type: "image_group",
                          items: currentImages,
                          id: currentImages[0]._id + "_grp",
                        });
                      }

                      return blocks.map((block, blockIdx) => {
                        const isLastBlock = blockIdx === blocks.length - 1;
                        if (
                          block.type === "image_group" &&
                          block.items.length > 1
                        ) {
                          const lastMsg = block.items[block.items.length - 1];
                          const timeString = new Date(
                            lastMsg.createdAt,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <View
                              key={block.id}
                              className={`${isLastBlock ? "" : "mb-1"} w-full ${isSender ? "items-end" : "items-start"}`}
                            >
                              <View
                                className={`flex-row flex-wrap w-[260px] max-w-[260px] ${isSender ? "justify-end" : "justify-start"} gap-1`}
                              >
                                {block.items.map((msg) => (
                                  <TouchableOpacity
                                    key={msg._id}
                                    ref={(r) => {
                                      if (r)
                                        messageRefs.current[msg._id] = r as any;
                                    }}
                                    activeOpacity={0.9}
                                    onLongPress={() =>
                                      onLongPressMessage(msg._id)
                                    }
                                    onPress={() => {
                                      const idx = chatImages.findIndex(
                                        (img) => img._id === msg._id,
                                      );
                                      if (idx !== -1) setViewerIndex(idx);
                                    }}
                                    className={`relative ${
                                      (msg.reactions?.length ?? 0) > 0
                                        ? "mb-8 pb-1"
                                        : ""
                                    }`}
                                  >
                                    <Image
                                      source={{ uri: msg.content }}
                                      className="w-[128px] h-[128px] rounded-xl border border-gray-100/50"
                                      resizeMode="cover"
                                    />
                                    {(msg.reactions?.length ?? 0) > 0 && (
                                      <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() =>
                                          openReactionDetails(msg._id)
                                        }
                                        className={`absolute top-[115px] ${
                                          isSender ? "right-1" : "left-1"
                                        } bg-white border border-gray-100 rounded-[12px] px-1.5 py-0.5 flex-row flex-wrap items-center shadow-sm z-10 max-w-[100%]`}
                                      >
                                        <View className="flex-row flex-wrap items-center gap-1.5">
                                          {Array.from(
                                            new Set(
                                              (msg.reactions || []).map(
                                                (r: any) => r.emoji,
                                              ),
                                            ),
                                          ).map((emojiKey: any) => {
                                            const count = (msg.reactions || [])
                                              .filter(
                                                (r: any) =>
                                                  r.emoji === emojiKey,
                                              )
                                              .reduce(
                                                (acc: number, r: any) =>
                                                  acc + (r.count || 1),
                                                0,
                                              );
                                            return (
                                              <View
                                                key={emojiKey}
                                                className="flex-row items-center mt-0.5 mb-0.5"
                                              >
                                                <Text className="text-[11px] mr-1">
                                                  {EMOJI_MAP[emojiKey] || "👍"}
                                                </Text>
                                                <Text className="text-[10px] font-bold text-gray-500">
                                                  {count}
                                                </Text>
                                              </View>
                                            );
                                          })}
                                        </View>
                                      </TouchableOpacity>
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </View>
                              {isLastBlock && (
                                <Text className="text-[10px] text-gray-400 mt-1 mr-1">
                                  {timeString}
                                </Text>
                              )}
                            </View>
                          );
                        }

                        const msg = block.items[0];
                        return (
                          <MessageItem
                            key={msg._id}
                            msg={msg}
                            isSender={isSender}
                            isLastInBlock={isLastBlock}
                            onLongPress={() => onLongPressMessage(msg._id)}
                            openReactionDetails={() =>
                              openReactionDetails(msg._id)
                            }
                            chatImages={chatImages}
                            setViewerIndex={setViewerIndex}
                            messageRefs={messageRefs}
                            expandedTimeMsgId={expandedTimeMsgId}
                            setExpandedTimeMsgId={setExpandedTimeMsgId}
                          />
                        );
                      });
                    })()}
                  </View>
                </View>
              );
            }}
          />
        </View>

        {/* Khu vực nút cuộn xuống & Thông báo tin nhắn mới */}
        {!isAtBottom && (
          <View className="absolute bottom-24 left-0 right-0 items-center z-50">
            {hasNewUnseenMessages ? (
              // Case 1: Có tin nhắn mới -> Hiện banner to
              <TouchableOpacity
                onPress={() => {
                  flatListRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  });
                  setHasNewUnseenMessages(false);
                }}
                activeOpacity={0.9}
                className="bg-blue-600 flex-row items-center px-5 py-2.5 rounded-full shadow-xl shadow-blue-500/30 border border-blue-400 group"
              >
                <View className="bg-white/20 w-5 h-5 rounded-full items-center justify-center mr-2">
                  <ChevronDownIcon size={14} color="white" />
                </View>
                <Text className="text-white font-bold text-[13px]">
                  Có tin nhắn mới
                </Text>
              </TouchableOpacity>
            ) : (
              // Case 2: Chỉ đơn giản là đang lướt lên trên -> Hiện nút tròn nhỏ bên phải
              <View className="w-full flex-row justify-end px-6">
                <TouchableOpacity
                  onPress={() => {
                    flatListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: true,
                    });
                  }}
                  activeOpacity={0.8}
                  className="bg-white w-10 h-10 rounded-full items-center justify-center shadow-lg border border-gray-100"
                >
                  <ChevronDownIcon size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Extension Menu Tích hợp (Hiện ra khi bấm dấu +) */}
        {showExtensionMenu && (
          <View className="absolute bottom-28 left-4 bg-white rounded-2xl shadow-xl w-48 border border-gray-100 overflow-hidden py-1 z-50">
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-gray-50"
              onPress={() => {
                setShowExtensionMenu(false);
                handleSendImage();
              }}
            >
              <PhotoIcon size={22} color="#10b981" />
              <Text className="ml-3 font-medium text-gray-700">Gửi ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-gray-50"
              onPress={() => {
                setShowExtensionMenu(false);
                handleSendFile();
              }}
            >
              <DocumentIcon size={22} color="#3b82f6" />
              <Text className="ml-3 font-medium text-gray-700">
                Gửi tệp/File
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                setShowExtensionMenu(false); /* Logic gửi icon sau */
              }}
            >
              <FaceSmileIcon size={22} color="#f59e0b" />
              <Text className="ml-3 font-medium text-gray-700">Gửi icon</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Input Area mới */}
        <View className="flex-1 justify-end" pointerEvents="box-none">
          <View
            className="w-full flex-row items-end px-4 py-3 bg-transparent"
            style={{
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom, 12),
            }}
          >
            {/* Dấu + tròn độc lập kế bên trái */}
            <TouchableOpacity
              onPress={() => setShowExtensionMenu(!showExtensionMenu)}
              className="mr-3 w-[46px] h-[46px] bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-0.5 active:bg-gray-50"
            >
              <Animated.View style={spinMenu}>
                <PlusIcon size={24} color="#374151" />
              </Animated.View>
            </TouchableOpacity>

            {/* Vùng nhập text với nút Gửi/Voice bên trong */}
            <View className="flex-1 flex-row items-end bg-white rounded-[25px] pl-4 pr-1.5 py-1.5 shadow-sm border border-gray-200 min-h-[50px]">
              <TextInput
                className="flex-1 text-[15px] text-gray-800 max-h-24 pt-2 pb-2 mt-0.5 mb-0.5"
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#9ca3af"
                multiline
                value={inputText}
                onChangeText={handleInputChange}
              />
              <TouchableOpacity
                onPress={() => (inputText.trim() ? sendMessage() : null)}
                className={`w-[36px] h-[36px] rounded-full items-center justify-center ml-2 ${
                  inputText.trim() ? "bg-black" : "bg-gray-100"
                }`}
              >
                {inputText.trim() ? (
                  <PaperAirplaneIcon
                    size={20}
                    color="white"
                    style={{
                      transform: [{ translateX: 1 }, { translateY: 1 }],
                    }}
                  />
                ) : (
                  <MicrophoneIcon size={20} color="#374151" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modal trình xem ảnh toàn màn hình (Gallery) */}
      <Modal
        visible={viewerIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-1 bg-black">
            {viewerIndex !== null && chatImages.length > 0 && (
              <GalleryPager
                images={chatImages}
                initialIndex={viewerIndex}
                onClose={() => setViewerIndex(null)}
                onIndexChange={(idx) => setViewerIndex(idx)}
              />
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>

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
                      className={`shadow-2xl ${
                        selectedMsg.type === "image" && !selectedMsg.isRevoked
                          ? "p-0 bg-transparent"
                          : "px-5 py-3 " +
                            (selectedMsg.senderId === currentUserId
                              ? "bg-black rounded-3xl rounded-br-lg"
                              : "bg-white rounded-3xl rounded-bl-lg")
                      }`}
                    >
                      {selectedMsg.isRevoked ? (
                        <Text className="italic text-sm text-gray-400">
                          Tin nhắn đã bị thu hồi
                        </Text>
                      ) : selectedMsg.type === "image" ? (
                        <Image
                          source={{ uri: selectedMsg.content }}
                          className="w-[260px] h-[200px] rounded-[22px] border border-gray-100/50"
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
                                ? selectedMsg.type === "image"
                                  ? 200
                                  : 230
                                : selectedMsg.type === "image"
                                  ? 150
                                  : 190),
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
                            ? (reactionDetailMsg?.reactions ?? []).reduce(
                                (acc: number, r: any) => acc + (r.count || 1),
                                0,
                              )
                            : (reactionDetailMsg?.reactions ?? [])
                                .filter((r: any) => r.emoji === tab.key)
                                .reduce(
                                  (acc: number, r: any) => acc + (r.count || 1),
                                  0,
                                )}
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
                                <Text className="text-gray-400 font-medium text-lg">
                                  {item.total}
                                </Text>
                              )}
                              {tab.key !== "all" && (item.count || 1) > 1 && (
                                <Text className="text-gray-400 font-medium text-lg">
                                  x{item.count || 1}
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
