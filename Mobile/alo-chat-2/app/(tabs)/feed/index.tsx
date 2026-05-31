import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { postService, IPost } from "../../../services/postService";
import PostCard from "../../../components/PostCard";
import StoryBar from "../../../components/feed/StoryBar";


export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const LIMIT = 10;

  // Lấy danh sách bài đăng
  const fetchPosts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const currentSkip = 0;
      const data = await postService.getHomeFeed(LIMIT, currentSkip);
      setPosts(data);
      setSkip(LIMIT);
      setHasMore(data.length === LIMIT);
    } catch (error) {
      console.error("Lỗi khi tải feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadNotifsCount = async () => {
    try {
      const count = await postService.getUnreadNotificationsCount();
      setUnreadNotifsCount(count);
    } catch (err) {
      console.log("Lỗi tải số thông báo chưa đọc:", err);
    }
  };

  // Reload feed mỗi khi người dùng quay lại tab này
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchUnreadNotifsCount();
    }, [])
  );

  const handleRefresh = () => {
    fetchPosts(true);
  };

  // ============ Real-time Post Synchronization ============
  useEffect(() => {
    const newPostSub = DeviceEventEmitter.addListener("new_post_received", (newPost: IPost) => {
      if (newPost && newPost._id) {
        setPosts((prev) => {
          // Avoid duplicates
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

    const notifSub = DeviceEventEmitter.addListener("refresh_notifications", () => {
      fetchUnreadNotifsCount();
    });

    return () => {
      newPostSub.remove();
      deletedPostSub.remove();
      interactionSub.remove();
      notifSub.remove();
    };
  }, []);

  // Phân trang tải thêm bài viết
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const data = await postService.getHomeFeed(LIMIT, skip);
      if (data.length > 0) {
        setPosts((prev) => [...prev, ...data]);
        setSkip((prev) => prev + LIMIT);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải thêm bài viết:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleLikeUpdate = (updatedPost: IPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  // Render header cho Nhật ký: StoryBar + Khung đăng bài nhanh
  const renderHeader = () => {
    return (
      <View className="mb-4">
        {/* Story Bar ở trên cùng */}
        <StoryBar />

        {/* Khung tạo bài viết nhanh */}
        <View className="bg-white p-4 rounded-3xl flex-row items-center border border-gray-100 gap-3">
          <Image
            source={{ uri: getAvatar(user?.avatar, user?.fullName) }}
            className="w-10 h-10 rounded-full bg-gray-100"
          />

          <TouchableOpacity
            className="flex-1 bg-gray-50 border border-gray-100 py-2.5 px-4 rounded-full"
            onPress={() => router.push("/posts/create")}
          >
            <Text className="text-gray-400 text-sm">Hôm nay bạn thế nào?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/posts/create")} className="p-1">
            <Ionicons name="images-outline" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Header bar */}
      <View className="flex-row justify-between items-center px-5 py-3 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Nhật ký</Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push("/profile/notifications" as any)} className="relative p-1">
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {unreadNotifsCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[16px] h-[16px] items-center justify-center px-1">
                <Text className="text-[9px] font-bold text-white">
                  {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/posts/create")} className="p-1">
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post feed */}
      {loading && posts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-2 text-gray-400 text-sm">Đang tải nhật ký...</Text>
        </View>
      ) : (
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
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 100, // Chừa khoảng trống tránh che bởi tabbar
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2563eb"]}
              tintColor="#2563eb"
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
            <View className="items-center justify-center py-20">
              <Ionicons name="documents-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">Chưa có bài đăng nào.</Text>
              <Text className="text-gray-400 text-xs mt-1">Hãy kết bạn hoặc chia sẻ khoảnh khắc đầu tiên nhé!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
