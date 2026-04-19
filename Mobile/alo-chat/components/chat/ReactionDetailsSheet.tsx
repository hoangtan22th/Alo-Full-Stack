import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { MessageDTO } from "../../services/messageService";
import { UserProfileDTO } from "../../services/userService";
import { EMOJI_MAP } from "../../constants/Chat";

const { height: screenHeight } = Dimensions.get("window");
const SNAP_POINTS = {
  CLOSED: screenHeight,
  MID: screenHeight * 0.45,
  TOP: screenHeight * 0.1,
};

interface ReactionDetailsSheetProps {
  msgId: string | null;
  onClose: () => void;
  messages: MessageDTO[];
  userCache: Record<string, UserProfileDTO>;
}

export const ReactionDetailsSheet = ({
  msgId,
  onClose,
  messages,
  userCache,
}: ReactionDetailsSheetProps) => {
  const [activeReactionTabIdx, setActiveReactionTabIdx] = useState(0);
  const reactionScrollViewRef = useRef<ScrollView>(null);
  const translateY = useSharedValue(SNAP_POINTS.CLOSED);
  const context = useSharedValue({ y: 0 });

  useEffect(() => {
    if (msgId) {
      translateY.value = withTiming(SNAP_POINTS.MID, { duration: 250 });
    } else {
      translateY.value = withTiming(SNAP_POINTS.CLOSED, { duration: 250 });
    }
  }, [msgId]);

  const reactionDetailMsg = useMemo(() => {
    return messages.find((m) => m._id === msgId);
  }, [msgId, messages]);

  const reactionTabs = useMemo(() => {
    if (!reactionDetailMsg || !reactionDetailMsg.reactions) return [];

    const reactions = reactionDetailMsg.reactions;
    const uniqueEmojis = Array.from(
      new Set(reactions.map((r: any) => r.emoji)),
    );

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
  }, [reactionDetailMsg, userCache]);

  const closeSheet = () => {
    translateY.value = withTiming(SNAP_POINTS.CLOSED, { duration: 250 });
    setTimeout(() => {
      onClose();
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
      translateY.value = Math.max(
        SNAP_POINTS.TOP,
        context.value.y + event.translationY,
      );
    })
    .onEnd((event) => {
      const velocityY = event.velocityY;
      const currentY = translateY.value;

      if (velocityY > 500) {
        runOnJS(closeSheet)();
      } else if (velocityY < -500) {
        translateY.value = withTiming(SNAP_POINTS.TOP, { duration: 250 });
      } else {
        if (currentY < (SNAP_POINTS.TOP + SNAP_POINTS.MID) / 2) {
          translateY.value = withTiming(SNAP_POINTS.TOP, { duration: 250 });
        } else if (currentY < (SNAP_POINTS.MID + SNAP_POINTS.CLOSED) / 2) {
          translateY.value = withTiming(SNAP_POINTS.MID, { duration: 250 });
        } else {
          runOnJS(closeSheet)();
        }
      }
    });

  return (
    <Modal
      visible={!!msgId}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
              animatedBackdropStyle,
            ]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={closeSheet}
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

              {/* Tab Content */}
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
                  <ScrollView
                    key={"content_" + tab.key}
                    style={{ width: Dimensions.get("window").width }}
                    className="flex-1 p-4"
                  >
                    {tab.data.map((item: any, idx: number) => {
                      const isTabAll = tab.key === "all";
                      const userId = item.userId;
                      const cached = userCache[userId];
                      const name = cached?.fullName || item.fullName || "Người dùng";
                      const avatar = cached?.avatar || item.avatarUrl || item.avatar;
                      const emojis = item.emojis ? Array.from(item.emojis) : [item.emoji];

                      return (
                        <View
                          key={userId + "_" + idx}
                          className="flex-row items-center justify-between mb-5"
                        >
                          <View className="flex-row items-center">
                            {avatar ? (
                              <Image
                                source={{ uri: avatar }}
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                                <Text className="text-blue-600 font-bold text-lg">
                                  {name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View className="ml-4">
                              <Text className="text-[16px] font-bold text-gray-900">
                                {name}
                              </Text>
                              {isTabAll && (
                                <View className="flex-row mt-1 gap-1">
                                  {emojis.map((e: any, i: number) => (
                                    <Text key={i}>{EMOJI_MAP[e] || e}</Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                          {!isTabAll && (
                            <Text className="text-2xl">
                              {EMOJI_MAP[item.emoji] || item.emoji}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};
