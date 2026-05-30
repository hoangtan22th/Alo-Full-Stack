import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { postService, IPost } from "../../../services/postService";
import PostCard from "../../../components/PostCard";

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
  const LIMIT = 10;

  // Lấy danh sách bài đăng (tải lại từ đầu)
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

  // Load feed mỗi khi người dùng focus vào Tab này
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  // Kéo xuống để refresh
  const handleRefresh = () => {
    fetchPosts(true);
  };

  // Tải thêm bài viết cũ hơn (Phân trang)
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
      console.error("Lỗi khi tải thêm feed:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Callback khi bài đăng bị xóa thành công
  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  // Callback khi cập nhật lượt thích
  const handleLikeUpdate = (updatedPost: IPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? { ...p, likes: updatedPost.likes, likeCount: updatedPost.likeCount } : p))
    );
  };

  // Render header cho FlatList (Khung tạo bài viết nhanh)
  const renderHeader = () => {
    return (
      <View className="bg-white p-4 rounded-3xl mb-4 flex-row items-center border border-gray-100 shadow-sm gap-3">
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} className="w-10 h-10 rounded-full" />
        ) : (
          <View className="w-10 h-10 rounded-full bg-gray-900 items-center justify-center">
            <Text className="text-white font-bold text-xs">
              {user?.fullName?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          </View>
        )}

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
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb", paddingTop: insets.top }}>
      {/* Header bar */}
      <View className="flex-row justify-between items-center px-5 py-3 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Nhật ký</Text>
        <TouchableOpacity onPress={() => router.push("/posts/create")} className="p-1">
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Post feed */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000" />
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
            <View className="items-center justify-center py-20">
              <Ionicons name="documents-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">Chưa có bài đăng nào.</Text>
              <Text className="text-gray-400 text-xs mt-1">Hãy kết bạn hoặc đăng bài viết đầu tiên!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
