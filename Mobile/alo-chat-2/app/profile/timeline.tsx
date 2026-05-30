import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { postService, IPost } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { contactService } from "../../services/contactService";
import PostCard from "../../components/PostCard";

const { width } = Dimensions.get("window");

export default function UserTimelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: queryUserId, userId: paramUserId } = useLocalSearchParams<{ id?: string; userId?: string }>();
  const { user: currentUser } = useAuth();

  const currentUserId = currentUser?.id || currentUser?._id;
  // Hỗ trợ cả 2 dạng tên query parameter
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

  const LIMIT = 10;

  // Tải thông tin Profile & Mối quan hệ
  const loadProfile = async () => {
    try {
      const userProfile = await userService.getUserById(targetUserId);
      setProfile(userProfile);

      if (!isMe) {
        // Kiểm tra xem có phải bạn bè không
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

  // Tải bài viết của timeline này
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

  // Khởi chạy ban đầu
  const init = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), fetchTimelinePosts()]);
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, [targetUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), fetchTimelinePosts(true)]);
    setRefreshing(false);
  };

  // Tải thêm bài đăng cũ hơn
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

  // Hủy kết bạn
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
            // Tải lại bài viết vì có thể thay đổi quyền riêng tư xem bài
            fetchTimelinePosts();
          } catch (e) {
            Alert.alert("Lỗi", "Không thể thực hiện hủy kết bạn.");
          }
        },
      },
    ]);
  };

  // Bắt đầu chat
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

  // Header chứa Ảnh bìa, Avatar, Tên và các Nút hành động
  const renderHeader = () => {
    const avatarUri = profile?.avatar || "https://api.dicebear.com/7.x/avataaars/png?seed=Felix";
    const coverUri = profile?.coverImage || "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600";

    return (
      <View className="bg-[#f9fafb] pb-4">
        {/* Ảnh bìa */}
        <View className="h-48 w-full bg-blue-100 relative">
          <Image source={{ uri: coverUri }} className="w-full h-full object-cover" />
          <TouchableOpacity
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 items-center justify-center"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Khối Avatar & Info đè lên ảnh bìa */}
        <View className="px-5 -mt-16 items-center flex-row relative z-10 gap-4 mb-4">
          <Image
            source={{ uri: avatarUri }}
            className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 shadow-sm"
          />
          <View className="flex-1 mt-14">
            <Text className="text-xl font-bold text-gray-900 leading-7">{profile?.fullName || "Đang tải..."}</Text>
            {isMe ? (
              <Text className="text-xs text-gray-400 mt-0.5">Trang cá nhân của tôi</Text>
            ) : (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Ionicons
                  name={isFriend ? "checkmark-circle" : "person-add"}
                  size={14}
                  color={isFriend ? "#2563eb" : "#9ca3af"}
                />
                <Text className={`text-xs font-semibold ${isFriend ? "text-blue-600" : "text-gray-400"}`}>
                  {isFriend ? "Bạn bè" : "Chưa kết bạn"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Nút hành động */}
        <View className="flex-row px-5 gap-3.5 mb-5 mt-2 justify-start">
          {isMe ? (
            <TouchableOpacity
              className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center flex-1 gap-2 shadow-sm"
              onPress={() => router.push("/profile/edit")}
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

        {/* Nút viết bài viết nhanh (nếu là chính mình) */}
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
    </View>
  );
}
