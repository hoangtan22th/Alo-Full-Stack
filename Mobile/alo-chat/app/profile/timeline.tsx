import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { postService, IPost, IStory, IStoryGroup } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { contactService } from "../../services/contactService";
import PostCard from "../../components/PostCard";
import { LinearGradient } from "expo-linear-gradient";
import StoryViewerModal from "../../components/feed/StoryViewerModal";

export default function UserTimelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: queryUserId, userId: paramUserId } = useLocalSearchParams<{ id?: string; userId?: string }>();
  const { user: currentUser, refreshUser } = useAuth();

  const currentUserId = currentUser?.id || currentUser?._id;
  const targetUserId = queryUserId || paramUserId || currentUserId;
  const isMe = targetUserId === currentUserId;

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const [userStories, setUserStories] = useState<IStory[]>([]);
  const [viewingStoryGroupIndex, setViewingStoryGroupIndex] = useState<number | null>(null);

  const hasUnviewed = userStories.some(
    (s) => !s.viewers?.some((v) => v.userId?.toLowerCase() === currentUserId?.toLowerCase())
  );

  const LIMIT = 10;

  const loadProfile = async () => {
    try {
      const userProfile = await userService.getUserById(targetUserId);
      setProfile(userProfile);

      if (!isMe) {
        const friendsList = await contactService.getFriendsList();
        const friendItem = friendsList.find(
          (f: any) => f.requesterId === targetUserId || f.recipientId === targetUserId
        );
        if (friendItem) {
          setIsFriend(true);
          setFriendshipId(friendItem.id);
        } else {
          setIsFriend(false);
          setFriendshipId(null);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin cá nhân:", error);
    }
  };

  const uploadImage = async (uri: string, isAvatar: boolean) => {
    try {
      // Dùng chung loading của màn hình
      const formData = new FormData();
      const filename = uri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append("file", { uri, name: filename, type });

      const endpoint = isAvatar ? "/users/me/avatar" : "/users/me/cover";
      await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageRefreshKey(Date.now());
      await refreshUser();
      await loadProfile(); // Cập nhật lại state profile
      Alert.alert("Thành công", `Cập nhật ${isAvatar ? "ảnh đại diện" : "ảnh bìa"} thành công!`);
    } catch (err) {
      console.error("Lỗi tải ảnh:", err);
      Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại sau.");
    }
  };

  const pickImage = async (isAvatar: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cấp quyền", "Chúng tôi cần quyền truy cập thư viện ảnh để đổi avatar/ảnh bìa.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isAvatar ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri, isAvatar);
    }
  };

  const fetchTimelinePosts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const currentSkip = 0;
      const data = await postService.getUserTimeline(targetUserId, LIMIT, currentSkip);
      setPosts(data);
      setSkip(LIMIT);
      setHasMore(data.length === LIMIT);
    } catch (error) {
      console.error("Lỗi khi tải dòng thời gian bài đăng:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserStories = async () => {
    try {
      const stories = await postService.getUserStories(targetUserId);
      setUserStories(stories || []);
    } catch (error) {
      console.error("Lỗi khi tải story cá nhân:", error);
    }
  };

  const init = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), fetchTimelinePosts(), fetchUserStories()]);
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, [targetUserId]);

  // ============ Real-time Post Synchronization ============
  useEffect(() => {
    const newPostSub = DeviceEventEmitter.addListener("new_post_received", (newPost: IPost) => {
      if (newPost && newPost._id && newPost.userId === targetUserId) {
        setPosts((prev) => {
          if (prev.some((p) => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
    });

    const deletedPostSub = DeviceEventEmitter.addListener("post_deleted_received", (data: { postId: string }) => {
      if (data?.postId) {
        setPosts((prev) => prev.filter((p) => p._id !== data.postId));
      }
    });

    const interactionSub = DeviceEventEmitter.addListener("post_interaction", (data: any) => {
      if (data?.postId && data?.payload) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p._id === data.postId) {
              return {
                ...p,
                reactions: data.payload.reactions || p.reactions,
                reactionCount: data.payload.reactionCount ?? p.reactionCount,
                commentCount: data.payload.commentCount ?? p.commentCount,
                likes: data.payload.likes || p.likes,
                likeCount: data.payload.likeCount ?? p.likeCount,
              };
            }
            return p;
          })
        );
      }
    });

    return () => {
      newPostSub.remove();
      deletedPostSub.remove();
      interactionSub.remove();
    };
  }, [targetUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), fetchTimelinePosts(true), fetchUserStories()]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const data = await postService.getUserTimeline(targetUserId, LIMIT, skip);
      if (data.length > 0) {
        setPosts((prev) => [...prev, ...data]);
        setSkip((prev) => prev + LIMIT);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải thêm bài đăng dòng thời gian:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleLikeUpdate = (updatedPost: IPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? { ...p, likes: updatedPost.likes, likeCount: updatedPost.likeCount } : p))
    );
  };

  const handleUnfriend = () => {
    if (!friendshipId || !profile) return;
    Alert.alert("Hủy kết bạn", `Bạn có chắc chắn muốn hủy kết bạn với ${profile.fullName}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Hủy kết bạn",
        style: "destructive",
        onPress: async () => {
          try {
            await contactService.removeFriend(targetUserId);
            setIsFriend(false);
            setFriendshipId(null);
            Alert.alert("Thành công", "Đã hủy kết bạn.");
            fetchTimelinePosts();
          } catch (e) {
            Alert.alert("Lỗi", "Không thể thực hiện hủy kết bạn.");
          }
        },
      },
    ]);
  };

  const handleStartChat = () => {
    if (!profile) return;
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: targetUserId,
        name: profile.fullName,
        avatar: profile.avatar || "",
      },
    });
  };

  const renderHeader = () => {
    const displayProfile = isMe ? (profile || currentUser) : profile;
    const rawAvatar = displayProfile?.avatar;
    const rawCover = displayProfile?.coverImage;
    const avatarUri = rawAvatar ? `${rawAvatar}?t=${imageRefreshKey}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayProfile?.fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
    const coverUri = rawCover ? `${rawCover}?t=${imageRefreshKey}` : "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600";

    return (
      <View className="bg-[#f9fafb] pb-4">
        <View className="h-56 w-full bg-blue-100 relative">
          <Image source={{ uri: coverUri }} className="w-full h-full object-cover" />
          {isMe && (
            <TouchableOpacity
              className="absolute bottom-3 right-3 bg-[#e4e6eb] w-9 h-9 rounded-full justify-center items-center shadow-sm"
              style={{ zIndex: 50 }}
              onPress={() => pickImage(false)}
            >
              <Feather name="camera" size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-white w-full">
          <View className="items-center">
            {userStories.length > 0 ? (
              <TouchableOpacity
                onPress={() => setViewingStoryGroupIndex(0)}
                className="-mt-[64px] w-[128px] h-[128px] rounded-full justify-center items-center"
                activeOpacity={0.9}
              >
                {hasUnviewed ? (
                  <LinearGradient
                    colors={["#3b82f6", "#a855f7", "#ec4899"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 64,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View className="w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative overflow-hidden">
                      <Image source={{ uri: avatarUri }} className="w-full h-full rounded-full" />
                    </View>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 64,
                      backgroundColor: "#d1d5db",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View className="w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative overflow-hidden">
                      <Image source={{ uri: avatarUri }} className="w-full h-full rounded-full" />
                    </View>
                  </View>
                )}
                {isMe && (
                  <TouchableOpacity
                    className="absolute bottom-1 right-1 bg-[#e4e6eb] w-8 h-8 rounded-full justify-center items-center border-[3px] border-white shadow-sm"
                    style={{ zIndex: 10 }}
                    onPress={() => pickImage(true)}
                  >
                    <Feather name="camera" size={14} color="#000" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ) : (
              <View className="-mt-[60px] w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative shadow-sm">
                <Image source={{ uri: avatarUri }} className="w-full h-full rounded-full" />
                {isMe && (
                  <TouchableOpacity
                    className="absolute bottom-0 right-0 bg-[#e4e6eb] w-8 h-8 rounded-full justify-center items-center border-[3px] border-white shadow-sm"
                    onPress={() => pickImage(true)}
                  >
                    <Feather name="camera" size={14} color="#000" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View className="items-center mt-3 px-5 pb-5">
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-[22px] font-bold text-gray-900 text-center">
                {displayProfile?.fullName || "Đang tải..."}
              </Text>
              {isMe && (
                <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
                    BẠN
                  </Text>
                </View>
              )}
            </View>
            {displayProfile?.bio ? (
              <Text className="text-[15px] text-gray-700 mt-2 text-center px-4 leading-5">
                {displayProfile?.bio}
              </Text>
            ) : null}
            {!isMe && (
              <View className="flex-row items-center justify-center gap-1.5 mt-2">
                <Ionicons
                  name={isFriend ? "checkmark-circle" : "person-add"}
                  size={14}
                  color={isFriend ? "#2563eb" : "#9ca3af"}
                />
                <Text className={`text-[14px] font-semibold ${isFriend ? "text-blue-600" : "text-gray-400"}`}>
                  {isFriend ? "Bạn bè" : "Chưa kết bạn"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row px-5 gap-3.5 mb-5 mt-2 justify-start">
          {isMe ? (
            <TouchableOpacity
              className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center flex-1 gap-2 shadow-sm"
              onPress={() => router.push({ pathname: "/profile/personal-info", params: { from: "timeline" } })}
            >
              <Ionicons name="create-outline" size={16} color="#4b5563" />
              <Text className="text-sm font-semibold text-gray-700">Chỉnh sửa thông tin</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="flex-row bg-blue-600 px-5 py-2.5 rounded-full items-center justify-center flex-1 gap-2 shadow-sm"
                onPress={handleStartChat}
              >
                <Ionicons name="chatbubble" size={16} color="white" />
                <Text className="text-sm font-semibold text-white">Nhắn tin</Text>
              </TouchableOpacity>

              {isFriend && (
                <TouchableOpacity
                  className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center gap-2 shadow-sm"
                  onPress={handleUnfriend}
                >
                  <Ionicons name="person-remove-outline" size={16} color="#ef4444" />
                  <Text className="text-sm font-semibold text-red-500">Hủy kết bạn</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {isMe && (
          <View className="bg-white mx-4 p-4 rounded-3xl flex-row items-center border border-gray-100 shadow-sm gap-3 mb-2">
            <TouchableOpacity
              className="flex-1 bg-gray-50 border border-gray-100 py-2 px-4 rounded-full"
              onPress={() => router.push("/posts/create")}
            >
              <Text className="text-gray-400 text-sm">Hôm nay bạn thế nào?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/posts/create")} className="p-1">
              <Ionicons name="camera-outline" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-2 text-gray-400 text-sm">Đang tải trang cá nhân...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Floating Back Button */}
      <TouchableOpacity
        className="absolute w-10 h-10 rounded-full bg-black/40 items-center justify-center shadow-sm"
        style={{ top: insets.top + 10, left: 16, zIndex: 100 }}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDeleteSuccess={handleDeletePost}
            onLikeUpdate={handleLikeUpdate}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingBottom: 50,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#9ca3af" className="py-4" />
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-10">
            <Ionicons name="images-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3 text-center">Chưa có bài đăng nào trên dòng thời gian.</Text>
          </View>
        }
      />
      {viewingStoryGroupIndex !== null && userStories.length > 0 && (
        <StoryViewerModal
          storyGroups={[
            {
              userId: targetUserId,
              stories: userStories,
            },
          ]}
          initialGroupIndex={viewingStoryGroupIndex}
          userProfiles={{
            [targetUserId]: profile || (currentUser as UserProfileDTO),
          }}
          onClose={() => setViewingStoryGroupIndex(null)}
          onStoryDeleted={() => {
            fetchUserStories();
            setViewingStoryGroupIndex(null);
          }}
          onStoryViewed={() => {
            fetchUserStories();
          }}
          onStoryReacted={() => {
            fetchUserStories();
          }}
        />
      )}
    </View>
  );
}
