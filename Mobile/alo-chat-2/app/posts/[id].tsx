import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { postService, IPost, IComment } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import PostCard from "../../components/PostCard";

const commentUserCache: Record<string, UserProfileDTO> = {};

export default function PostDetailsScreen() {
  const router = useRouter();
  const { id: postId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [post, setPost] = useState<IPost | null>(null);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<IComment | null>(null);

  const loadData = async () => {
    if (!postId) return;
    try {
      const [postData, commentList] = await Promise.all([
        postService.getPostDetails(postId),
        postService.getComments(postId),
      ]);
      setPost(postData);
      setComments(commentList);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết bài viết:", error);
      Alert.alert("Lỗi", "Không thể tải chi tiết bài viết.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [postId]);

  // Gửi bình luận
  const handleSendComment = async () => {
    if (!commentContent.trim() || submitting || !post) return;

    setSubmitting(true);
    try {
      const parentId = replyingTo ? replyingTo._id : undefined;
      const newComment = await postService.createComment(post._id, commentContent.trim(), parentId);

      if (newComment) {
        setCommentContent("");
        setReplyingTo(null);
        // Tải lại toàn bộ comment để cập nhật cấu trúc phân cấp đúng cách
        const commentList = await postService.getComments(post._id);
        setComments(commentList);

        // Cập nhật số lượng comment trên bài đăng cục bộ
        setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null));
      } else {
        Alert.alert("Thất bại", "Gửi bình luận không thành công.");
      }
    } catch (error) {
      console.error("Lỗi gửi bình luận:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi gửi bình luận.");
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa bình luận
  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    Alert.alert("Xóa bình luận", "Bạn có chắc chắn muốn xóa bình luận này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const success = await postService.deleteComment(commentId);
          if (success) {
            // Tải lại bình luận
            const commentList = await postService.getComments(post._id);
            setComments(commentList);

            // Giảm số lượng comment cục bộ
            setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null));
          } else {
            Alert.alert("Lỗi", "Không thể xóa bình luận.");
          }
        },
      },
    ]);
  };

  // Render từng bình luận (Component lồng để tải User Profile bất đồng bộ)
  const CommentItem = ({ comment, isReply = false }: { comment: IComment; isReply?: boolean }) => {
    const [author, setAuthor] = useState<UserProfileDTO | null>(null);

    useEffect(() => {
      if (!comment.userId) return;

      if (commentUserCache[comment.userId]) {
        setAuthor(commentUserCache[comment.userId]!);
        return;
      }

      let isMounted = true;
      userService.getUserById(comment.userId).then((profile) => {
        if (profile && isMounted) {
          commentUserCache[comment.userId] = profile;
          setAuthor(profile);
        }
      });

      return () => {
        isMounted = false;
      };
    }, [comment.userId]);

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
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      } catch (e) {
        return "";
      }
    };

    const isCommentOwner = comment.userId === currentUserId || post?.userId === currentUserId;

    return (
      <View className={`flex-row ${isReply ? "ml-12 mt-3" : "mt-4"} pr-4`}>
        {/* Avatar */}
        {author?.avatar ? (
          <Image source={{ uri: author.avatar }} className={`${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-gray-100`} />
        ) : (
          <View className={`${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-gray-900 items-center justify-center`}>
            <Text className="text-white font-bold text-xs">
              {author?.fullName?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        {/* Nội dung */}
        <View className="ml-3 flex-1 bg-gray-50 rounded-2xl px-4 py-3 relative border border-gray-100">
          <View className="flex-row justify-between items-center mb-0.5">
            <Text className="text-sm font-bold text-gray-900">{author?.fullName || "Đang tải..."}</Text>
            {isCommentOwner && (
              <TouchableOpacity onPress={() => handleDeleteComment(comment._id)} className="p-0.5">
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-sm text-gray-800 leading-5">{comment.content}</Text>

          {/* Dòng hoạt động của comment */}
          <View className="flex-row items-center mt-2 gap-3">
            <Text className="text-[11px] text-gray-400">{formatTime(comment.createdAt)}</Text>
            {!isReply && (
              <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                <Text className="text-[11px] text-blue-600 font-semibold">Trả lời</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-2 text-gray-400 text-sm">Đang tải...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text className="mt-2 text-gray-500 text-base">Bài viết không tồn tại hoặc đã bị xóa.</Text>
        <TouchableOpacity className="mt-4 bg-gray-900 px-5 py-2.5 rounded-full" onPress={() => router.back()}>
          <Text className="text-white font-semibold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header bar */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Bình luận</Text>
          <View className="w-8" />
        </View>

        {/* Nội dung Post & Comments */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Card bài viết gốc */}
          <PostCard
            post={post}
            onDeleteSuccess={() => {
              Alert.alert("Thông báo", "Bài đăng đã bị xóa.", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            }}
            onLikeUpdate={(updated) => setPost(updated)}
          />

          {/* Tiêu đề Bình luận */}
          <View className="px-5 border-b border-gray-50 pb-3 mt-1">
            <Text className="text-base font-bold text-gray-900">
              Bình luận ({post.commentCount || 0})
            </Text>
          </View>

          {/* Danh sách bình luận */}
          <View className="px-5 pb-10">
            {comments.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Ionicons name="chatbox-ellipses-outline" size={36} color="#d1d5db" />
                <Text className="text-gray-400 text-sm mt-2">Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment._id}>
                  {/* Bình luận cấp 1 */}
                  <CommentItem comment={comment} />

                  {/* Các bình luận trả lời (cấp 2) */}
                  {comment.replies &&
                    comment.replies.map((reply) => (
                      <CommentItem key={reply._id} comment={reply} isReply />
                    ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Replying Banner */}
        {replyingTo && (
          <View className="bg-gray-50 px-5 py-2 flex-row justify-between items-center border-t border-gray-100">
            <Text className="text-xs text-gray-500 font-medium">
              Đang trả lời <Text className="font-bold text-gray-700">{commentUserCache[replyingTo.userId]?.fullName || "người dùng"}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} className="p-0.5">
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar dưới đáy */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
            backgroundColor: "white",
            alignItems: "center",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <TextInput
            placeholder={replyingTo ? "Nhập câu trả lời..." : "Nhập bình luận của bạn..."}
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 max-h-24"
            multiline
            value={commentContent}
            onChangeText={setCommentContent}
          />
          <TouchableOpacity
            className={`ml-3 w-10 h-10 rounded-full items-center justify-center bg-blue-600 ${
              !commentContent.trim() || submitting ? "opacity-40" : ""
            }`}
            disabled={!commentContent.trim() || submitting}
            onPress={handleSendComment}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={18} color="white" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
