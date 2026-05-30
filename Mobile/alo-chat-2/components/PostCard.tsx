import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { userService, UserProfileDTO } from "../services/userService";
import { postService, IPost } from "../services/postService";
import { useAuth } from "../contexts/AuthContext";

// In-memory cache để giảm số lượng request lấy thông tin user
const userCache: Record<string, UserProfileDTO> = {};

interface PostCardProps {
  post: IPost;
  onDeleteSuccess?: (postId: string) => void;
  onLikeUpdate?: (updatedPost: IPost) => void;
}

export default function PostCard({ post, onDeleteSuccess, onLikeUpdate }: PostCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [author, setAuthor] = useState<UserProfileDTO | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = post.userId === currentUserId;

  // Lấy thông tin tác giả bài viết
  useEffect(() => {
    if (!post.userId) return;

    if (userCache[post.userId]) {
      setAuthor(userCache[post.userId]!);
      return;
    }

    let isMounted = true;
    setLoadingAuthor(true);
    userService.getUserById(post.userId).then((profile) => {
      if (profile && isMounted) {
        userCache[post.userId] = profile;
        setAuthor(profile);
      }
      if (isMounted) setLoadingAuthor(false);
    }).catch(() => {
      if (isMounted) setLoadingAuthor(false);
    });

    return () => {
      isMounted = false;
    };
  }, [post.userId]);

  // Cập nhật trạng thái like của user hiện tại
  useEffect(() => {
    if (currentUserId && post.likes) {
      setIsLiked(post.likes.includes(currentUserId));
    }
    setLikeCount(post.likeCount || 0);
  }, [post.likes, post.likeCount, currentUserId]);

  // Định dạng thời gian hiển thị thân thiện (Zalo style)
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

      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return "";
    }
  };

  // Like/Unlike bài viết
  const handleLike = async () => {
    // Optimistic UI update
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    setIsLiked(!previousIsLiked);
    setLikeCount(previousIsLiked ? previousLikeCount - 1 : previousLikeCount + 1);

    const updated = await postService.toggleLikePost(post._id);
    if (updated) {
      if (onLikeUpdate) {
        onLikeUpdate(updated);
      }
    } else {
      // Revert if API fails
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      Alert.alert("Lỗi", "Không thể thực hiện thích bài viết.");
    }
  };

  // Xóa bài viết
  const handleDelete = () => {
    Alert.alert("Xóa bài đăng", "Bạn có chắc chắn muốn xóa bài viết này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const success = await postService.deletePost(post._id);
          if (success && onDeleteSuccess) {
            onDeleteSuccess(post._id);
          } else if (!success) {
            Alert.alert("Lỗi", "Không thể xóa bài viết.");
          }
        },
      },
    ]);
  };

  // Điều hướng đến trang cá nhân của người đăng
  const navigateToProfile = () => {
    router.push({
      pathname: "/profile/timeline",
      params: { userId: post.userId },
    });
  };

  // Định dạng hiển thị icon quyền riêng tư
  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "PUBLIC":
        return <Ionicons name="earth" size={14} color="#9ca3af" />;
      case "FRIENDS_ONLY":
        return <Ionicons name="people" size={14} color="#9ca3af" />;
      case "PRIVATE":
        return <Ionicons name="lock-closed" size={14} color="#9ca3af" />;
      default:
        return null;
    }
  };

  // Render lưới hình ảnh / video
  const renderMediaGrid = () => {
    const media = post.media || [];
    if (media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0]!;
      return (
        <View className="mt-3 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
          {item.type === "VIDEO" ? (
            <View className="relative justify-center items-center h-64">
              <Image source={{ uri: item.url }} className="w-full h-full object-cover" />
              <View className="absolute w-14 h-14 bg-black/60 rounded-full items-center justify-center">
                <Ionicons name="play" size={30} color="white" style={{ marginLeft: 4 }} />
              </View>
            </View>
          ) : (
            <Image source={{ uri: item.url }} className="w-full h-72" style={{ resizeMode: "cover" }} />
          )}
        </View>
      );
    }

    if (media.length === 2) {
      return (
        <View className="mt-3 flex-row gap-2 w-full h-48 rounded-2xl overflow-hidden">
          {media.map((item, index) => (
            <View key={index} className="flex-1 bg-gray-100 relative">
              <Image source={{ uri: item.url }} className="w-full h-full object-cover" />
              {item.type === "VIDEO" && (
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <Ionicons name="play" size={24} color="white" />
                </View>
              )}
            </View>
          ))}
        </View>
      );
    }

    // 3 ảnh hoặc nhiều hơn (Facebook / Zalo style layout)
    const firstItem = media[0]!;
    const remaining = media.slice(1, 3);
    const extraCount = media.length - 3;

    return (
      <View className="mt-3 flex-row gap-2 w-full h-64 rounded-2xl overflow-hidden">
        {/* Ảnh lớn bên trái */}
        <View className="flex-1 bg-gray-100 relative">
          <Image source={{ uri: firstItem.url }} className="w-full h-full object-cover" />
          {firstItem.type === "VIDEO" && (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <Ionicons name="play" size={28} color="white" />
            </View>
          )}
        </View>

        {/* 2 ảnh nhỏ bên phải xếp chồng lên nhau */}
        <View className="flex-1 gap-2">
          {remaining.map((item, index) => {
            const isLast = index === 1;
            return (
              <View key={index} className="flex-1 bg-gray-100 relative">
                <Image source={{ uri: item.url }} className="w-full h-full object-cover" />
                {item.type === "VIDEO" && (
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <Ionicons name="play" size={20} color="white" />
                  </View>
                )}
                {isLast && extraCount > 0 && (
                  <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <Text className="text-white text-xl font-bold">+{extraCount}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <TouchableOpacity className="flex-row items-center flex-1" onPress={navigateToProfile}>
          {author?.avatar ? (
            <Image source={{ uri: author.avatar }} className="w-12 h-12 rounded-full" />
          ) : (
            <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center">
              <Text className="text-white font-bold text-sm">
                {author?.fullName?.substring(0, 2).toUpperCase() || "?"}
              </Text>
            </View>
          )}

          <View className="ml-3 flex-1">
            {loadingAuthor ? (
              <ActivityIndicator size="small" color="#9ca3af" style={{ alignSelf: "flex-start" }} />
            ) : (
              <Text className="text-base font-bold text-gray-900">{author?.fullName || "Người dùng"}</Text>
            )}
            <View className="flex-row items-center mt-0.5 gap-1.5">
              <Text className="text-xs text-gray-400">{formatTime(post.createdAt)}</Text>
              <Text className="text-xs text-gray-300">•</Text>
              {getPrivacyIcon(post.privacy)}
            </View>
          </View>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity onPress={handleDelete} className="p-1">
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content && (
        <Text className="text-[15px] leading-6 text-gray-800 font-normal px-0.5">{post.content}</Text>
      )}

      {/* Media Grid */}
      {renderMediaGrid()}

      {/* Footer / Interaction Summary */}
      <View className="flex-row items-center justify-between border-t border-gray-50 mt-4 pt-3.5 px-1">
        <View className="flex-row gap-5">
          {/* Like Button */}
          <TouchableOpacity className="flex-row items-center gap-1.5" onPress={handleLike}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#ef4444" : "#4b5563"}
            />
            <Text className={`text-sm ${isLiked ? "text-red-500 font-bold" : "text-gray-600 font-medium"}`}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() => router.push(`/posts/${post._id}`)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#4b5563" />
            <Text className="text-sm text-gray-600 font-medium">{post.commentCount || 0}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push(`/posts/${post._id}`)}>
          <Text className="text-xs text-blue-600 font-semibold">Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
