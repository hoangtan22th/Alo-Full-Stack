import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { postService, IStoryGroup, IStory, ReactionType } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";

const { width, height } = Dimensions.get("window");

interface StoryViewerModalProps {
  storyGroups: IStoryGroup[];
  initialGroupIndex: number;
  userProfiles: Record<string, UserProfileDTO>;
  onClose: () => void;
  onStoryDeleted?: () => void;
  onStoryViewed?: () => void;
  onStoryReacted?: () => void;
}

const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  HEART: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
};

const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: 'Thích',
  HEART: 'Yêu thích',
  HAHA: 'Haha',
  WOW: 'Wow',
  SAD: 'Buồn',
  ANGRY: 'Phẫn nộ',
};

export default function StoryViewerModal({
  storyGroups,
  initialGroupIndex,
  userProfiles,
  onClose,
  onStoryDeleted,
  onStoryViewed,
  onStoryReacted,
}: StoryViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewerTab, setViewerTab] = useState<"VIEW" | "REACT">("VIEW");

  // Floating emojis state
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; left: number; bottom: number }[]>([]);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const currentProfile = currentGroup ? userProfiles[currentGroup.userId] : null;
  const isOwnStory = currentGroup?.userId?.toLowerCase() === currentUserId?.toLowerCase();

  const [sound, setSound] = useState<any>(null);

  const videoPlayer = useVideoPlayer(
    currentStory?.mediaType === "VIDEO" ? currentStory.mediaUrl : null,
    (player) => {
      player.loop = true;
      player.muted = !!currentStory?.music || isMuted;
      if (!paused) player.play();
    }
  );

  useEffect(() => {
    if (videoPlayer) {
      if (paused) videoPlayer.pause();
      else videoPlayer.play();
    }
  }, [paused, videoPlayer]);

  useEffect(() => {
    if (videoPlayer) {
      videoPlayer.muted = !!currentStory?.music || isMuted;
    }
  }, [isMuted, currentStory, videoPlayer]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<number>(0);


  // Tải âm thanh khi nhạc thay đổi
  useEffect(() => {
    let active = true;

    const loadAndPlayMusic = async () => {
      // Unload sound cũ
      if (sound) {
        try { sound.pause(); } catch(e){}
        setSound(null);
      }

      if (currentStory?.music?.url) {
        try {
          const newSound = createAudioPlayer(currentStory.music.url);
          newSound.loop = true;
          newSound.muted = isMuted;
          if (active) {
            setSound(newSound);
            if (!paused) newSound.play();
          } else {
            newSound.pause();
          }
        } catch (e) {
          console.log("Lỗi tạo/tải nhạc nền Spotify:", e);
        }
      }
    };

    loadAndPlayMusic();

    return () => {
      active = false;
    };
  }, [currentStory?._id]);

  // Điều khiển play/pause âm thanh
  useEffect(() => {
    if (sound) {
      if (paused) sound.pause();
      else sound.play();
    }
  }, [paused, sound]);

  // Điều khiển mute âm thanh
  useEffect(() => {
    if (sound) {
      sound.muted = isMuted;
    }
  }, [isMuted, sound]);

  // Giải phóng âm thanh khi tắt modal
  useEffect(() => {
    return () => {
      if (sound) {
        try { sound.pause(); } catch(e) {}
      }
    };
  }, [sound]);

  // Đánh dấu đã xem Story
  useEffect(() => {
    if (currentStory && currentUserId) {
      const alreadyViewed = currentStory.viewers.some(
        (v) => v.userId?.toLowerCase() === currentUserId.toLowerCase()
      );
      if (!alreadyViewed) {
        postService.viewStory(currentStory._id)
          .then(() => {
            if (onStoryViewed) onStoryViewed();
          })
          .catch((err) => console.warn("Lỗi viewStory API:", err));
      }
    }
  }, [currentStory?._id, currentUserId]);

  // ============ Real-time Story Updates while viewing ============
  useEffect(() => {
    const viewedSub = DeviceEventEmitter.addListener("story_viewed", (data: any) => {
      if (data?.storyId === currentStory?._id) {
        if (onStoryViewed) onStoryViewed();
      }
    });

    const reactedSub = DeviceEventEmitter.addListener("story_reacted", (data: any) => {
      if (data?.storyId === currentStory?._id) {
        if (onStoryReacted) onStoryReacted();
      }
    });

    return () => {
      viewedSub.remove();
      reactedSub.remove();
    };
  }, [currentStory?._id]);

  const goNext = () => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      progressRef.current = 0;
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      progressRef.current = 0;
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      progressRef.current = 0;
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1]!;
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      progressRef.current = 0;
      setProgress(0);
    }
  };

  // Timer điều khiển tiến trình chạy tự động
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    progressRef.current = 0;
    setProgress(0);

    const storyDuration = currentStory?.duration || 5000;
    const interval = 50; // cập nhật mỗi 50ms

    timerRef.current = setInterval(() => {
      if (!paused) {
        progressRef.current += interval;
        const pct = Math.min((progressRef.current / storyDuration) * 100, 100);
        setProgress(pct);

        if (progressRef.current >= storyDuration) {
          clearInterval(timerRef.current!);
          goNext();
        }
      }
    }, interval);
  }, [groupIndex, storyIndex, storyGroups, currentStory?.duration, paused]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [groupIndex, storyIndex, paused]);

  const handleReact = async (type: ReactionType) => {
    if (!currentStory) return;

    // Hiển thị hiệu ứng emoji bay lên
    const emoji = REACTION_EMOJI[type];
    const newFlying: any[] = [];
    for (let i = 0; i < 6; i++) {
      newFlying.push({
        id: Date.now() + Math.random(),
        emoji,
        left: 30 + Math.random() * 40, // từ 30% đến 70% chiều ngang
        bottom: 80 + Math.random() * 100,
      });
    }
    setFlyingEmojis((prev) => [...prev, ...newFlying]);

    // Cleanup emoji bay sau 1.5s
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((item) => !newFlying.some((n) => n.id === item.id)));
    }, 1500);

    try {
      await postService.reactToStory(currentStory._id, type);
      if (onStoryReacted) onStoryReacted();
    } catch (e) {
      console.warn("Lỗi reactToStory API:", e);
    }
  };

  const handleDelete = () => {
    if (!currentStory || !isOwnStory) return;
    setPaused(true);
    Alert.alert("Lưu trữ Story", "Bạn có chắc chắn muốn đưa Story này vào kho lưu trữ không? (Bạn vẫn có thể xem lại hoặc đăng lại từ kho lưu trữ cá nhân)", [
      {
        text: "Hủy",
        style: "cancel",
        onPress: () => setPaused(false),
      },
      {
        text: "Lưu trữ",
        style: "destructive",
        onPress: async () => {
          const success = await postService.deleteStory(currentStory._id);
          if (success) {
            Alert.alert("Thành công", "Story đã được đưa vào kho lưu trữ.");
            if (onStoryDeleted) onStoryDeleted();
          } else {
            Alert.alert("Lỗi", "Không thể lưu trữ Story.");
            setPaused(false);
          }
        },
      },
    ]);
  };

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch {
      return "";
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <Modal visible={true} transparent={false} animationType="fade">
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {/* Background Click to Navigate (Bên trái quay lại, bên phải tiếp tục) */}
        <TouchableWithoutFeedback
          onPressIn={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          onPress={(e) => {
            const clickX = e.nativeEvent.locationX;
            if (clickX < width * 0.3) {
              goPrev();
            } else {
              goNext();
            }
          }}
        >
          <View className="absolute inset-0 flex justify-center items-center">
            {currentStory.mediaType === "VIDEO" ? (
              <VideoView
                player={videoPlayer}
                allowsFullscreen={false}
                nativeControls={false}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Image
                source={{ uri: currentStory.mediaUrl }}
                resizeMode="contain"
                className="w-full h-full"
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Màn sương tối ở trên đầu */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          className="absolute top-0 left-0 right-0 h-32 z-10"
        />

        {/* Progress Bars */}
        <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", gap: 6, zIndex: 20 }}>
          {currentGroup.stories.map((_, idx) => (
            <View key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <View
                className="h-full bg-white rounded-full"
                style={{
                  width: idx < storyIndex ? "100%" : idx === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </View>
          ))}
        </View>

        {/* Story Author & Giao diện điều khiển */}
        <View style={{ position: "absolute", top: insets.top + 20, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
          <View className="flex-row items-center gap-3">
            <Image source={{ uri: getAvatar(currentProfile?.avatar, currentProfile?.fullName) }} className="w-10 h-10 rounded-full border-2 border-white/50 bg-gray-200" />
            <View>
              <Text className="text-white font-bold text-sm shadow-md drop-shadow-md">
                {currentProfile?.fullName || "Người dùng"}
              </Text>
              <Text className="text-white/70 text-[10px] shadow-sm">
                {formatTime(currentStory.createdAt)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Âm thanh */}
            {(currentStory.mediaType === "VIDEO" || currentStory.music) && (
              <TouchableOpacity onPress={() => setIsMuted(!isMuted)} className="w-8 h-8 rounded-full bg-black/40 items-center justify-center">
                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={18} color="white" />
              </TouchableOpacity>
            )}

            {/* Xóa story */}
            {isOwnStory && (
              <TouchableOpacity onPress={handleDelete} className="w-8 h-8 rounded-full bg-black/40 items-center justify-center">
                <Ionicons name="trash-outline" size={18} color="white" />
              </TouchableOpacity>
            )}

            {/* Đóng */}
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-black/40 items-center justify-center">
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hiển thị Nhạc đang phát */}
        {currentStory.music && (
          <View style={{ position: "absolute", top: insets.top + 70, left: 16, zIndex: 20 }} className="flex-row items-center bg-black/30 rounded-full px-3 py-1.5 gap-1.5">
            <Ionicons name="musical-notes" size={12} color="#93c5fd" />
            <Text className="text-blue-300 font-bold text-[10px]" style={{ maxWidth: width * 0.7 }}>
              {currentStory.music.title} - {currentStory.music.artist}
            </Text>
          </View>
        )}

        {/* Chú thích (Caption) */}
        {currentStory.caption && (
          <View style={{ position: "absolute", bottom: 120, left: 24, right: 24, zIndex: 20 }} className="items-center">
            <Text className="text-white text-center text-sm font-medium bg-black/35 rounded-2xl px-5 py-3 backdrop-blur-sm shadow-md">
              {currentStory.caption}
            </Text>
          </View>
        )}

        {/* Emoji bay lên */}
        {flyingEmojis.map((item) => (
          <View
            key={item.id}
            style={{
              position: "absolute",
              bottom: item.bottom,
              left: `${item.left}%`,
              zIndex: 30,
            }}
          >
            <Text className="text-4xl opacity-80 animate-bounce">{item.emoji}</Text>
          </View>
        ))}

        {/* Thanh Reaction dưới đáy */}
        <View style={{ position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 20 }}>
          {isOwnStory ? (
            /* Chủ story xem lượt xem */
            <TouchableOpacity
              onPress={() => {
                setPaused(true);
                setShowViewers(true);
              }}
              className="bg-black/40 border border-white/10 rounded-full px-4 py-2.5 flex-row items-center gap-2"
            >
              <Ionicons name="eye-outline" size={18} color="white" />
              <Text className="text-white text-xs font-bold">
                {currentStory.viewers?.length || 0} lượt xem
              </Text>
            </TouchableOpacity>
          ) : (
            /* Người xem thả tim */
            <View className="flex-row bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-full flex-1 justify-around gap-1">
              {(["LIKE", "HEART", "HAHA", "WOW", "SAD", "ANGRY"] as ReactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleReact(type)}
                  className="p-1 active:scale-90"
                >
                  <Text className="text-3xl">{REACTION_EMOJI[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Modal Xem danh sách người xem */}
        {showViewers && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View className="bg-white rounded-t-3xl p-6 h-[50%]">
                {/* Header panel */}
                <View className="flex-row justify-between items-center border-b border-gray-100 pb-3 mb-4">
                  <View className="flex-row gap-5">
                    <TouchableOpacity onPress={() => setViewerTab("VIEW")} className="pb-1">
                      <Text className={`text-sm font-bold ${viewerTab === "VIEW" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}>
                        Đã xem ({currentStory.viewers?.length || 0})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setViewerTab("REACT")} className="pb-1">
                      <Text className={`text-sm font-bold ${viewerTab === "REACT" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}>
                        Cảm xúc ({currentStory.reactions?.length || 0})
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowViewers(false);
                      setPaused(false);
                    }}
                    className="p-1"
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Body panel list */}
                {viewerTab === "VIEW" ? (
                  <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {currentStory.viewers && currentStory.viewers.length > 0 ? (
                      currentStory.viewers.map((v, i) => {
                        const prof = userProfiles[v.userId];
                        return (
                          <View key={i} className="flex-row items-center gap-3 py-2 border-b border-gray-50">
                            <Image source={{ uri: getAvatar(prof?.avatar, prof?.fullName) }} className="w-9 h-9 rounded-full bg-gray-100" />
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-gray-800">{prof?.fullName || "Người dùng Zalo"}</Text>
                              <Text className="text-[10px] text-gray-400">{formatTime(v.viewedAt)}</Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-gray-400 text-xs text-center py-10">Chưa có ai xem story này.</Text>
                    )}
                  </ScrollView>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {currentStory.reactions && currentStory.reactions.length > 0 ? (
                      currentStory.reactions.map((r, i) => {
                        const prof = userProfiles[r.userId];
                        return (
                          <View key={i} className="flex-row items-center justify-between py-2 border-b border-gray-50">
                            <View className="flex-row items-center gap-3">
                              <Image source={{ uri: getAvatar(prof?.avatar, prof?.fullName) }} className="w-9 h-9 rounded-full bg-gray-100" />
                              <Text className="text-xs font-bold text-gray-800">{prof?.fullName || "Người dùng Zalo"}</Text>
                            </View>
                            <Text className="text-2xl">{REACTION_EMOJI[r.type]}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-gray-400 text-xs text-center py-10">Chưa có ai thả cảm xúc cho story này.</Text>
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}
