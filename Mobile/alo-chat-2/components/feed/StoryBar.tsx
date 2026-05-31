import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { postService, IStoryGroup } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import StoryViewerModal from "./StoryViewerModal";

// Cache thông tin user
const userCache: Record<string, UserProfileDTO> = {};

export default function StoryBar() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [storyGroups, setStoryGroups] = useState<IStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileDTO>>({});
  const [viewingGroupIndex, setViewingGroupIndex] = useState<number | null>(null);

  const fetchStoryFeed = async () => {
    try {
      const groups = await postService.getStoryFeed();
      setStoryGroups(groups);

      // Tải profile của các user có story
      const uids = groups.map((g) => g.userId);
      const profiles: Record<string, UserProfileDTO> = { ...userProfiles };

      for (const uid of uids) {
        if (userCache[uid]) {
          profiles[uid] = userCache[uid]!;
        } else {
          try {
            const prof = await userService.getUserById(uid);
            if (prof) {
              userCache[uid] = prof;
              profiles[uid] = prof;
            }
          } catch (e) {
            console.warn("Lỗi tải thông tin user story:", uid, e);
          }
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error("Lỗi getStoryFeed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload feed khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      fetchStoryFeed();
    }, [currentUserId])
  );

  // ============ Real-time Story Synchronization ============
  useEffect(() => {
    const newStorySub = DeviceEventEmitter.addListener("new_story_received", () => {
      fetchStoryFeed();
    });

    const deletedStorySub = DeviceEventEmitter.addListener("story_deleted_received", () => {
      fetchStoryFeed();
    });

    const viewedSub = DeviceEventEmitter.addListener("story_viewed", () => {
      fetchStoryFeed();
    });

    const reactedSub = DeviceEventEmitter.addListener("story_reacted", () => {
      fetchStoryFeed();
    });

    return () => {
      newStorySub.remove();
      deletedStorySub.remove();
      viewedSub.remove();
      reactedSub.remove();
    };
  }, []);

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  // Kiểm tra xem nhóm story này có story nào chưa xem không
  const hasUnviewedStories = (group: IStoryGroup) => {
    if (!currentUserId) return true;
    return group.stories.some(
      (s) => !s.viewers.some((v) => v.userId?.toLowerCase() === currentUserId.toLowerCase())
    );
  };

  if (loading && storyGroups.length === 0) {
    return (
      <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="items-center gap-2 mr-4">
              <View className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
              <View className="w-12 h-3 rounded bg-gray-100 animate-pulse" />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Phân tách Story của mình và của bạn bè
  const myGroup = storyGroups.find((g) => g.userId?.toLowerCase() === currentUserId?.toLowerCase());
  const otherGroups = storyGroups.filter((g) => g.userId?.toLowerCase() !== currentUserId?.toLowerCase());

  const handleMyStoryPress = () => {
    if (myGroup && myGroup.stories.length > 0) {
      const idx = storyGroups.findIndex((g) => g.userId?.toLowerCase() === currentUserId?.toLowerCase());
      setViewingGroupIndex(idx >= 0 ? idx : null);
    } else {
      router.push("/posts/create-story");
    }
  };

  return (
    <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 py-1">
        {/* Nút Tạo Story của tôi */}
        <View className="items-center mr-3 relative">
          <TouchableOpacity onPress={handleMyStoryPress} className="relative">
            {myGroup && myGroup.stories.length > 0 ? (
              <View className="p-0.5 rounded-full">
                {hasUnviewedStories(myGroup) ? (
                  <LinearGradient
                    colors={["#a855f7", "#ec4899", "#3b82f6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 64, height: 64, borderRadius: 32, padding: 2, alignItems: "center", justifyContent: "center" }}
                  >
                    <Image
                      source={{ uri: getAvatar(currentUser?.avatar, currentUser?.fullName) }}
                      className="w-14 h-14 rounded-full border-2 border-white"
                    />
                  </LinearGradient>
                ) : (
                  <View className="w-16 h-16 rounded-full p-0.5 bg-gray-200 items-center justify-center">
                    <Image
                      source={{ uri: getAvatar(currentUser?.avatar, currentUser?.fullName) }}
                      className="w-14 h-14 rounded-full border-2 border-white"
                    />
                  </View>
                )}
              </View>
            ) : (
              <View className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 items-center justify-center relative">
                <Image
                  source={{ uri: getAvatar(currentUser?.avatar, currentUser?.fullName) }}
                  className="w-14 h-14 rounded-full opacity-60"
                />
                <View className="absolute bottom-0 right-0 bg-blue-600 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
                  <Ionicons name="add" size={14} color="white" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <Text className="text-[11px] text-gray-500 font-bold mt-1.5 text-center w-16 truncate">
            Bạn
          </Text>
          {myGroup && myGroup.stories.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/posts/create-story")}
              className="absolute top-0 right-0 bg-blue-600 w-5 h-5 rounded-full items-center justify-center border-2 border-white"
            >
              <Ionicons name="add" size={14} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Kho lưu trữ */}
        <TouchableOpacity
          onPress={() => router.push("/posts/archive")}
          className="items-center mr-3 justify-center"
        >
          <View className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 items-center justify-center">
            <Ionicons name="archive-outline" size={24} color="#6b7280" />
          </View>
          <Text className="text-[11px] text-gray-500 font-bold mt-1.5 text-center w-16">
            Lưu trữ
          </Text>
        </TouchableOpacity>

        {/* Story của bạn bè */}
        {otherGroups.map((group) => {
          const profile = userProfiles[group.userId];
          const unviewed = hasUnviewedStories(group);
          const globalIdx = storyGroups.findIndex((g) => g.userId === group.userId);

          return (
            <TouchableOpacity
              key={group.userId}
              onPress={() => setViewingGroupIndex(globalIdx)}
              className="items-center mr-3"
            >
              {unviewed ? (
                <LinearGradient
                  colors={["#2563eb", "#8b5cf6", "#ec4899"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 64, height: 64, borderRadius: 32, padding: 2, alignItems: "center", justifyContent: "center" }}
                >
                  <Image
                    source={{ uri: getAvatar(profile?.avatar, profile?.fullName) }}
                    className="w-14 h-14 rounded-full border-2 border-white bg-gray-100"
                  />
                </LinearGradient>
              ) : (
                <View className="w-16 h-16 rounded-full p-0.5 bg-gray-200 items-center justify-center">
                  <Image
                    source={{ uri: getAvatar(profile?.avatar, profile?.fullName) }}
                    className="w-14 h-14 rounded-full border-2 border-white bg-gray-100"
                  />
                </View>
              )}
              <Text className="text-[11px] text-gray-600 font-medium mt-1.5 text-center w-16 truncate">
                {profile?.fullName?.split(" ").pop() || "..."}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Story Viewer Modal */}
      {viewingGroupIndex !== null && (
        <StoryViewerModal
          storyGroups={storyGroups}
          initialGroupIndex={viewingGroupIndex}
          userProfiles={userProfiles}
          onClose={() => setViewingGroupIndex(null)}
          onStoryDeleted={() => {
            setViewingGroupIndex(null);
            fetchStoryFeed();
          }}
          onStoryViewed={() => {
            fetchStoryFeed();
          }}
          onStoryReacted={() => {
            fetchStoryFeed();
          }}
        />
      )}
    </View>
  );
}
