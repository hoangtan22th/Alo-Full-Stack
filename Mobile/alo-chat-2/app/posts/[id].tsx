import React, { useState, useEffect, useCallback, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
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
  DeviceEventEmitter,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  postService,
  IPost,
  IComment,
  IReaction,
  ReactionType,
  REACTION_EMOJI,
  REACTION_LABELS,
} from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import PostCard from "../../components/PostCard";

const commentUserCache: Record<string, UserProfileDTO> = {};

export default function PostDetailsScreen() {
  const router = useRouter();
  const { id: postId, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const { joinPost, leavePost } = useSocket();
  const currentUserId = currentUser?.id || currentUser?._id;
  const inputRef = useRef<TextInput | null>(null);

  const [post, setPost] = useState<IPost | null>(null);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [commentImage, setCommentImage] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickCommentImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCommentImage({
          uri: asset.uri,
          type: "image/jpeg",
          fileName: asset.fileName || "comment_image.jpg",
        });
      }
    } catch (error) {
      console.error("Lỗi chọn ảnh comment:", error);
    }
  };
  const [replyingTo, setReplyingTo] = useState<IComment | null>(null);

  // Comment authors cache
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserProfileDTO>>({});

  // Comment reaction picker
  const [activeCommentPickerId, setActiveCommentPickerId] = useState<string | null>(null);

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

  useEffect(() => {
    if (comments.length === 0) return;

    const resolveAuthors = async () => {
      const userIds = new Set<string>();
      comments.forEach((c) => {
        if (c.userId) userIds.add(c.userId);
        if (c.replies && Array.isArray(c.replies)) {
          c.replies.forEach((r) => {
            if (r.userId) userIds.add(r.userId);
          });
        }
      });

      const missingIds = Array.from(userIds).filter(uid => !commentUserCache[uid]);
      
      for (const uid of missingIds) {
        try {
          const prof = await userService.getUserById(uid);
          if (prof) {
            commentUserCache[uid] = prof;
          }
        } catch {}
      }

      setCommentAuthors(prev => {
        const newMap = { ...prev };
        let changed = false;
        Array.from(userIds).forEach(uid => {
          if (commentUserCache[uid] && !newMap[uid]) {
            newMap[uid] = commentUserCache[uid]!;
            changed = true;
          }
        });
        return changed ? newMap : prev;
      });
    };

    resolveAuthors();
  }, [comments]);

  useEffect(() => {
    if (focus === "true" && !loading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [focus, loading]);

  // ============ Real-time Socket Integration ============
  useEffect(() => {
    if (!postId) return;
    joinPost(postId);

    const subscription = DeviceEventEmitter.addListener("post_interaction", (data: any) => {
      if (data.postId === postId) {
        if (
          data.eventType === "COMMENT_ADDED" ||
          data.eventType === "COMMENT_DELETED" ||
          data.eventType === "COMMENT_REACTED"
        ) {
          // Re-fetch comments
          postService.getComments(postId).then((list) => {
            setComments(list);
          });
        }
        if (data.eventType === "POST_REACTED" && data.payload) {
          setPost((prev) => (prev ? { ...prev, ...data.payload } : prev));
        }
      }
    });

    return () => {
      leavePost(postId);
      subscription.remove();
    };
  }, [postId]);

  const handleSendComment = async () => {
    if ((!commentContent.trim() && !commentImage) || submitting || !post) return;

    setSubmitting(true);
    try {
      const parentId = replyingTo ? replyingTo._id : undefined;
      const newComment = await postService.createComment(
        post._id,
        commentContent.trim() || undefined,
        parentId,
        commentImage || undefined
      );

      if (newComment) {
        Keyboard.dismiss();
        setCommentContent("");
        setCommentImage(null);
        setReplyingTo(null);
        const commentList = await postService.getComments(post._id);
        setComments(commentList);
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

  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    Alert.alert("Xóa bình luận", "Bạn có chắc chắn muốn xóa bình luận này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const result = await postService.deleteComment(commentId);
          if (result.success) {
            const commentList = await postService.getComments(post._id);
            setComments(commentList);
            setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - (result.deletedCount || 1)) } : null));
          } else {
            Alert.alert("Lỗi", "Không thể xóa bình luận.");
          }
        },
      },
    ]);
  };

  const handleReactToComment = async (commentId: string, type: ReactionType) => {
    if (!currentUserId) return;
    setActiveCommentPickerId(null);

    const prevComments = [...comments];
    const updateCommentInList = (list: IComment[]): IComment[] => {
      return list.map((c) => {
        if (c._id === commentId) {
          const cReactions = c.reactions || [];
          const existingIndex = cReactions.findIndex((r) => r.userId === currentUserId);
          let newReactions = [...cReactions];

          if (existingIndex >= 0) {
            const existing = cReactions[existingIndex]!;
            if (existing.type === type) {
              newReactions.splice(existingIndex, 1);
            } else {
              newReactions[existingIndex] = { ...existing, type };
            }
          } else {
            newReactions.push({ userId: currentUserId, type });
          }

          return { ...c, reactions: newReactions, reactionCount: newReactions.length };
        } else if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateCommentInList(c.replies) };
        }
        return c;
      });
    };
    setComments(updateCommentInList(comments));

    const updated = await postService.reactToComment(commentId, type);
    if (!updated) {
      setComments(prevComments);
      Alert.alert("Lỗi", "Không thể bày tỏ cảm xúc lúc này.");
    }
  };

  const getCommentReactionSummary = (reactionsList?: IReaction[]) => {
    const typeCounts: Partial<Record<ReactionType, number>> = {};
    (reactionsList || []).forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([type]) => type as ReactionType);
  };

  const getMyCommentReaction = (reactionsList?: IReaction[]) => {
    const found = (reactionsList || []).find((r) => r.userId === currentUserId);
    return found ? found.type : null;
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
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    } catch (e) {
      return "";
    }
  };

  const renderCommentContentWithTags = (content: string) => {
    if (!content) return null;

    const authorNames = Object.values(commentAuthors).map(u => u.fullName).filter(Boolean).sort((a, b) => b.length - a.length);
    let matchedName = "";
    
    for (const name of authorNames) {
      if (content.startsWith(`@${name} `) || content === `@${name}`) {
        matchedName = name;
        break;
      }
    }

    if (matchedName) {
      const tagText = `@${matchedName}`;
      const restText = content.substring(tagText.length);
      const user = Object.values(commentAuthors).find(u => u.fullName === matchedName);
      
      return (
        <Text className="text-sm text-gray-800 leading-5">
          <Text 
            style={{ fontWeight: "700", color: "#1d4ed8" }}
            onPress={() => {
              const uid = user?.id || user?._id;
              if (uid) router.push({ pathname: "/profile/timeline", params: { userId: uid } });
            }}
          >
            {tagText}
          </Text>
          {restText}
        </Text>
      );
    }

    const tagRegex = /^(@[^\n\s]+)(?:\s|$)/;
    const match = content.match(tagRegex);
    if (match && match[1]) {
      const tagText = match[1];
      const restText = content.substring(tagText.length);
      return (
        <Text className="text-sm text-gray-800 leading-5">
          <Text style={{ fontWeight: "700", color: "#1d4ed8" }}>{tagText}</Text>
          {restText}
        </Text>
      );
    }
    return <Text className="text-sm text-gray-800 leading-5">{content}</Text>;
  };

  const CommentItem = ({ comment, isReply = false }: { comment: IComment; isReply?: boolean }) => {
    const author = commentAuthors[comment.userId];
    const isCommentOwner = comment.userId === currentUserId || post?.userId === currentUserId;
    const myCommentReaction = getMyCommentReaction(comment.reactions);
    const commentReactionSummary = getCommentReactionSummary(comment.reactions);

    return (
      <View className={`flex-row ${isReply ? "ml-12 mt-3" : "mt-4"} pr-4`}>
        {author?.avatar ? (
          <Image source={{ uri: author.avatar }} className={`${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-gray-100`} />
        ) : (
          <View className={`${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-gray-900 items-center justify-center`}>
            <Text className="text-white font-bold text-xs">
              {author?.fullName?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View className="ml-3 flex-1">
          <View className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            <View className="flex-row justify-between items-center mb-0.5">
              <TouchableOpacity
                onPress={() => {
                  const uid = author?.id || author?._id;
                  if (uid) router.push({ pathname: "/profile/timeline", params: { userId: uid } });
                }}
              >
                <Text className="text-sm font-bold text-gray-900">{author?.fullName || "Đang tải..."}</Text>
              </TouchableOpacity>
              {isCommentOwner && (
                <TouchableOpacity onPress={() => handleDeleteComment(comment._id)} className="p-0.5">
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            {comment.content ? renderCommentContentWithTags(comment.content) : null}
            {/* Comment image */}
            {comment.mediaUrl && (
              <Image
                source={{ uri: comment.mediaUrl }}
                className="w-40 h-28 rounded-xl mt-2"
                style={{ resizeMode: "cover" }}
              />
            )}
          </View>

          {/* Comment action row */}
          <View className="flex-row items-center mt-1 gap-3 px-1">
            <Text className="text-[11px] text-gray-400">{formatTime(comment.createdAt)}</Text>

            {/* React to comment */}
            <TouchableOpacity
              onPress={() => handleReactToComment(comment._id, myCommentReaction || "LIKE")}
              onLongPress={() => setActiveCommentPickerId(activeCommentPickerId === comment._id ? null : comment._id)}
            >
              <Text className={`text-[11px] font-bold ${myCommentReaction ? "text-blue-600" : "text-gray-500"}`}>
                {myCommentReaction ? REACTION_LABELS[myCommentReaction] : "Thích"}
              </Text>
            </TouchableOpacity>

            {!isReply && (
              <TouchableOpacity onPress={() => {
                setReplyingTo(comment);
                const name = author?.fullName || "người dùng";
                setCommentContent(`@${name} `);
                inputRef.current?.focus();
              }}>
                <Text className="text-[11px] text-blue-600 font-semibold">Trả lời</Text>
              </TouchableOpacity>
            )}

            {/* Reaction summary */}
            {commentReactionSummary.length > 0 && (
              <View className="flex-row items-center gap-0.5 ml-auto">
                {commentReactionSummary.map((type) => (
                  <Text key={type} className="text-[11px]">{REACTION_EMOJI[type]}</Text>
                ))}
                {(comment.reactionCount || 0) > 0 && (
                  <Text className="text-[10px] text-gray-400 ml-0.5">{comment.reactionCount}</Text>
                )}
              </View>
            )}
          </View>

          {/* Comment reaction picker */}
          {activeCommentPickerId === comment._id && (
            <View className="flex-row bg-white border border-gray-100 rounded-full px-2 py-1 mt-1 gap-1 shadow-lg self-start">
              {(["LIKE", "HEART", "HAHA", "WOW", "SAD", "ANGRY"] as ReactionType[]).map((type) => (
                <TouchableOpacity key={type} onPress={() => handleReactToComment(comment._id, type)} className="p-1">
                  <Text className="text-lg">{REACTION_EMOJI[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? -(Math.max(insets.bottom, 12) - 12) : 0}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Bình luận</Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
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
            isDetailView={true}
            onCommentPress={() => inputRef.current?.focus()}
          />

          <View className="px-5 border-b border-gray-50 pb-3 mt-1">
            <Text className="text-base font-bold text-gray-900">
              Bình luận ({post.commentCount || 0})
            </Text>
          </View>

          <View className="px-5 pb-10">
            {comments.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Ionicons name="chatbox-ellipses-outline" size={36} color="#d1d5db" />
                <Text className="text-gray-400 text-sm mt-2">Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment._id}>
                  <CommentItem comment={comment} />
                  {comment.replies &&
                    comment.replies.map((reply) => (
                      <CommentItem key={reply._id} comment={reply} isReply />
                    ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {replyingTo && (
          <View className="bg-gray-50 px-5 py-2 flex-row justify-between items-center border-t border-gray-100">
            <Text className="text-xs text-gray-500 font-medium">
              Đang trả lời <Text className="font-bold text-gray-700">{commentAuthors[replyingTo.userId]?.fullName || commentUserCache[replyingTo.userId]?.fullName || "người dùng"}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} className="p-0.5">
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {/* Comment image preview */}
        {commentImage && (
          <View className="flex-row items-center px-5 py-2.5 gap-2 bg-gray-50 border-t border-gray-100">
            <Image source={{ uri: commentImage.uri }} className="w-14 h-10 rounded-lg" style={{ resizeMode: "cover" }} />
            <TouchableOpacity onPress={() => setCommentImage(null)}>
              <Ionicons name="close-circle" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

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
          <TouchableOpacity onPress={pickCommentImage} className="p-1 mr-2">
            <Ionicons name="camera-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            placeholder={replyingTo ? "Nhập câu trả lời..." : "Nhập bình luận của bạn..."}
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 max-h-24"
            multiline
            value={commentContent}
            onChangeText={setCommentContent}
          />
          <TouchableOpacity
            className={`ml-3 w-10 h-10 rounded-full items-center justify-center bg-blue-600 ${
              (!commentContent.trim() && !commentImage) || submitting ? "opacity-40" : ""
            }`}
            disabled={(!commentContent.trim() && !commentImage) || submitting}
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
