import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  DeviceEventEmitter,
  Clipboard,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "react-native-css-interop";
import * as ImagePicker from "expo-image-picker";
import { userService, UserProfileDTO } from "../services/userService";
import {
  postService,
  IPost,
  IComment,
  IReaction,
  ReactionType,
  REACTION_EMOJI,
  REACTION_LABELS,
} from "../services/postService";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

cssInterop(LinearGradient, {
  className: "style",
});

// In-memory cache để giảm số lượng request lấy thông tin user
const userCache: Record<string, UserProfileDTO> = {};

interface PostCardProps {
  post: IPost;
  onDeleteSuccess?: (postId: string) => void;
  onLikeUpdate?: (updatedPost: IPost) => void;
  onEditSuccess?: (updatedPost: IPost) => void;
  isDetailView?: boolean;
  onCommentPress?: () => void;
}

const MOOD_TEMPLATES: Record<string, { colors: [string, string, ...string[]]; name: string }> = {
  sunset: { name: "Sunset Glow", colors: ["#fb923c", "#f43f5e"] },
  midnight: { name: "Midnight Neon", colors: ["#3b82f6", "#8b5cf6"] },
  cosmic: { name: "Cosmic Purple", colors: ["#a855f7", "#4f46e5"] },
  emerald: { name: "Emerald Forest", colors: ["#34d399", "#0d9488"] },
  rose: { name: "Rose Petal", colors: ["#f472b6", "#e11d48"] },
  sky: { name: "Blue Sky", colors: ["#22d3ee", "#2563eb"] },
};

export default function PostCard({ 
  post, 
  onDeleteSuccess, 
  onLikeUpdate, 
  onEditSuccess,
  isDetailView = false,
  onCommentPress,
}: PostCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { joinPost, leavePost } = useSocket();
  const [author, setAuthor] = useState<UserProfileDTO | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [taggedFriendNames, setTaggedFriendNames] = useState<string[]>([]);

  // Reaction states
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [reactionCount, setReactionCount] = useState(post.reactionCount || post.likeCount || 0);
  const [reactions, setReactions] = useState<IReaction[]>(post.reactions || []);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Menu "..."
  const [showMenu, setShowMenu] = useState(false);

  // Inline Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount || 0);

  // Comment image
  const [commentImage, setCommentImage] = useState<any>(null);

  // Comment reaction picker
  const [activeCommentPickerId, setActiveCommentPickerId] = useState<string | null>(null);

  // Comment authors cache
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserProfileDTO>>({});

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [editFiles, setEditFiles] = useState<any[]>([]);
  const [editKeepMedia, setEditKeepMedia] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fullscreen video player state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const postVideoRef = useRef<Video | null>(null);

  const handlePlayVideo = (url: string) => {
    setVideoUrl(url);
    setShowVideoModal(true);
  };

  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = post.userId === currentUserId;

  // ============ Real-time Socket Integration ============
  useEffect(() => {
    joinPost(post._id);

    const subscription = DeviceEventEmitter.addListener("post_interaction", (data: any) => {
      if (data.postId === post._id) {
        if (data.eventType === "COMMENT_ADDED" || data.eventType === "COMMENT_DELETED" || data.eventType === "COMMENT_REACTED") {
          if (showComments) {
            fetchComments();
          }
          // Update comment count from payload
          if (data.eventType === "COMMENT_ADDED") {
            setLocalCommentCount((prev) => prev + 1);
          } else if (data.eventType === "COMMENT_DELETED") {
            setLocalCommentCount((prev) => Math.max(0, prev - 1));
          }
        } else if (data.eventType === "POST_REACTED") {
          const updatedPost = data.payload;
          if (updatedPost) {
            setReactions(updatedPost.reactions || []);
            setReactionCount(updatedPost.reactionCount || 0);
            if (currentUserId && updatedPost.reactions) {
              const mine = updatedPost.reactions.find((r: any) => r.userId === currentUserId);
              setMyReaction(mine?.type || null);
              setIsLiked(updatedPost.likes?.includes(currentUserId) || !!mine);
            }
          }
        }
      }
    });

    return () => {
      leavePost(post._id);
      subscription.remove();
    };
  }, [post._id, showComments, joinPost, leavePost]);

  // ============ Fetch Author ============
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

  // ============ Sync Reaction State ============
  useEffect(() => {
    setReactions(post.reactions || []);
    setReactionCount(post.reactionCount || post.likeCount || 0);
    if (currentUserId && post.reactions) {
      const mine = post.reactions.find((r) => r.userId === currentUserId);
      setMyReaction(mine?.type || null);
      setIsLiked(!!mine);
    } else if (currentUserId && post.likes) {
      setIsLiked(post.likes.includes(currentUserId));
    }
  }, [post.likes, post.likeCount, post.reactions, post.reactionCount, currentUserId]);

  // Sync commentCount
  useEffect(() => {
    setLocalCommentCount(post.commentCount || 0);
  }, [post.commentCount]);

  // ============ Tagged Friends ============
  useEffect(() => {
    if (post.tags && post.tags.length > 0) {
      let isMounted = true;
      const fetchTagNames = async () => {
        const names: string[] = [];
        const uniqueTagIds = Array.from(new Set(post.tags));
        for (const tagId of uniqueTagIds) {
          if (userCache[tagId]) {
            names.push(userCache[tagId].fullName);
          } else {
            try {
              const profile = await userService.getUserById(tagId);
              if (profile) {
                userCache[tagId] = profile;
                names.push(profile.fullName);
              }
            } catch (err) {
              console.warn("Lỗi lấy thông tin bạn bè gắn thẻ:", tagId, err);
            }
          }
        }
        if (isMounted) {
          setTaggedFriendNames(names);
        }
      };
      fetchTagNames();
      return () => {
        isMounted = false;
      };
    } else {
      setTaggedFriendNames([]);
    }
  }, [post.tags]);

  // ============ Fetch Comments ============
  const fetchComments = useCallback(async () => {
    if (!post._id) return;
    setLoadingComments(true);
    try {
      const list = await postService.getComments(post._id, 50, 0);
      setComments(list || []);

      // Fetch comment authors
      const userIds = new Set<string>();
      list.forEach((c) => {
        if (c.userId) userIds.add(c.userId);
        if (c.replies && Array.isArray(c.replies)) {
          c.replies.forEach((r) => {
            if (r.userId) userIds.add(r.userId);
          });
        }
      });

      const profilesMap: Record<string, UserProfileDTO> = {};
      for (const uid of Array.from(userIds)) {
        if (userCache[uid]) {
          profilesMap[uid] = userCache[uid]!;
        } else {
          try {
            const prof = await userService.getUserById(uid);
            if (prof) {
              userCache[uid] = prof;
              profilesMap[uid] = prof;
            }
          } catch {}
        }
      }
      setCommentAuthors(profilesMap);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [post._id]);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, fetchComments]);

  // ============ Time Formatter ============
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

  // ============ Reaction Handlers ============
  const handleReact = async (type: ReactionType) => {
    setShowReactionPicker(false);
    const prevReaction = myReaction;
    const prevCount = reactionCount;

    // Optimistic update
    if (myReaction === type) {
      setMyReaction(null);
      setReactionCount(Math.max(0, prevCount - 1));
      setIsLiked(false);
    } else {
      setMyReaction(type);
      if (!prevReaction) setReactionCount(prevCount + 1);
      setIsLiked(true);
    }

    const updated = await postService.reactToPost(post._id, type);
    if (updated) {
      if (onLikeUpdate) onLikeUpdate(updated);
    } else {
      setMyReaction(prevReaction);
      setReactionCount(prevCount);
    }
  };

  const handleQuickLike = () => handleReact(myReaction || "LIKE");

  // Get top 3 reaction types for summary display
  const getReactionSummary = () => {
    const typeCounts: Partial<Record<ReactionType, number>> = {};
    (reactions || []).forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([type]) => type as ReactionType);
  };

  // ============ Comment Handlers ============
  const handleAddComment = async () => {
    if ((!commentText.trim() && !commentImage) || submittingComment) return;

    setSubmittingComment(true);
    try {
      const newComment = await postService.createComment(
        post._id,
        commentText.trim() || undefined,
        undefined,
        commentImage || undefined
      );
      if (newComment) {
        Keyboard.dismiss();
        setCommentText("");
        setCommentImage(null);
        setLocalCommentCount((prev) => prev + 1);
        await fetchComments();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể gửi bình luận lúc này.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if ((!replyText.trim()) || submittingReply) return;

    setSubmittingReply(true);
    try {
      const newComment = await postService.createComment(
        post._id,
        replyText.trim(),
        parentId,
      );
      if (newComment) {
        Keyboard.dismiss();
        setReplyText("");
        setReplyingToId(null);
        setReplyingToName("");
        setLocalCommentCount((prev) => prev + 1);
        await fetchComments();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể gửi phản hồi lúc này.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert("Xóa bình luận", "Bạn có chắc chắn muốn xóa bình luận này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const result = await postService.deleteComment(commentId);
          if (result.success) {
            setLocalCommentCount((prev) => Math.max(0, prev - (result.deletedCount || 1)));
            await fetchComments();
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

    // Optimistic update for comments
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

          return {
            ...c,
            reactions: newReactions,
            reactionCount: newReactions.length,
          };
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

  // ============ Menu Handlers ============
  const handleDelete = () => {
    setShowMenu(false);
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

  const handleCopyLink = () => {
    setShowMenu(false);
    Clipboard.setString(`alo-chat://posts/${post._id}`);
    Alert.alert("Đã sao chép", "Đã sao chép liên kết bài viết.");
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.alert("Báo cáo", "Cảm ơn bạn đã báo cáo bài viết. Chúng tôi sẽ xem xét.");
  };

  const openEditModal = () => {
    setShowMenu(false);
    setEditContent(post.content || "");
    setEditPrivacy(post.privacy);
    setEditFiles([]);
    setEditKeepMedia((post.media || []).map((m) => m.url));
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() && editKeepMedia.length === 0 && editFiles.length === 0) return;
    setEditSubmitting(true);
    try {
      const result = await postService.editPost(
        post._id,
        editContent,
        editPrivacy,
        editFiles,
        editKeepMedia,
      );
      if (result) {
        setShowEditModal(false);
        if (onEditSuccess) onEditSuccess(result);
        if (onLikeUpdate) onLikeUpdate(result);
        Alert.alert("Thành công", "Đã chỉnh sửa bài viết!");
      } else {
        Alert.alert("Lỗi", "Chỉnh sửa thất bại.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi chỉnh sửa.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ============ Helpers ============
  const navigateToProfile = () => {
    router.push({
      pathname: "/profile/timeline",
      params: { userId: post.userId },
    });
  };

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

  // ============ Render Media Grid ============
  const renderMediaGrid = () => {
    const media = post.media || [];
    if (media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0]!;
      return (
        <View className="mt-3 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
          {item.type === "VIDEO" ? (
            <TouchableOpacity 
              onPress={() => handlePlayVideo(item.url)}
              activeOpacity={0.9} 
              className="relative justify-center items-center h-64"
            >
              <Video
                source={{ uri: item.url }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                useNativeControls={false}
                style={{ width: "100%", height: "100%" }}
              />
              <View className="absolute w-14 h-14 bg-black/60 rounded-full items-center justify-center">
                <Ionicons name="play" size={30} color="white" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
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
            <TouchableOpacity 
              key={index} 
              disabled={item.type !== "VIDEO"}
              onPress={() => handlePlayVideo(item.url)}
              activeOpacity={0.9}
              className="flex-1 bg-gray-100 relative"
            >
              {item.type === "VIDEO" ? (
                <Video
                  source={{ uri: item.url }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  useNativeControls={false}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Image source={{ uri: item.url }} className="w-full h-full object-cover" />
              )}
              {item.type === "VIDEO" && (
                <View className="absolute inset-0 items-center justify-center bg-black/30">
                  <View className="w-10 h-10 bg-black/50 rounded-full items-center justify-center">
                    <Ionicons name="play" size={20} color="white" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    const firstItem = media[0]!;
    const remaining = media.slice(1, 3);
    const extraCount = media.length - 3;

    return (
      <View className="mt-3 flex-row gap-2 w-full h-64 rounded-2xl overflow-hidden">
        <TouchableOpacity 
          disabled={firstItem.type !== "VIDEO"}
          onPress={() => handlePlayVideo(firstItem.url)}
          activeOpacity={0.9}
          className="flex-1 bg-gray-100 relative"
        >
          {firstItem.type === "VIDEO" ? (
            <Video
              source={{ uri: firstItem.url }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              useNativeControls={false}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Image source={{ uri: firstItem.url }} className="w-full h-full object-cover" />
          )}
          {firstItem.type === "VIDEO" && (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <View className="w-12 h-12 bg-black/50 rounded-full items-center justify-center">
                <Ionicons name="play" size={24} color="white" style={{ marginLeft: 2 }} />
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1 gap-2">
          {remaining.map((item, index) => {
            const isLast = index === 1;
            return (
              <TouchableOpacity 
                key={index} 
                disabled={item.type !== "VIDEO"}
                onPress={() => handlePlayVideo(item.url)}
                activeOpacity={0.9}
                className="flex-1 bg-gray-100 relative"
              >
                {item.type === "VIDEO" ? (
                  <Video
                    source={{ uri: item.url }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    useNativeControls={false}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <Image source={{ uri: item.url }} className="w-full h-full object-cover" />
                )}
                {item.type === "VIDEO" && (
                  <View className="absolute inset-0 items-center justify-center bg-black/30">
                    <View className="w-8 h-8 bg-black/50 rounded-full items-center justify-center">
                      <Ionicons name="play" size={16} color="white" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                )}
                {isLast && extraCount > 0 && (
                  <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <Text className="text-white text-xl font-bold">+{extraCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ============ Render Content ============
  const renderContent = () => {
    if (post.backgroundTemplate && MOOD_TEMPLATES[post.backgroundTemplate]) {
      const template = MOOD_TEMPLATES[post.backgroundTemplate]!;
      return (
        <LinearGradient
          colors={template.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: "100%",
            minHeight: 280,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            marginTop: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-white font-extrabold text-2xl text-center leading-9">
            {post.content}
          </Text>
        </LinearGradient>
      );
    }

    return post.content ? (
      <Text className="text-[15px] leading-6 text-gray-800 font-normal px-0.5 mt-2">
        {post.content}
      </Text>
    ) : null;
  };

  // ============ Render Tagged Friends ============
  const renderTagFriendsText = () => {
    if (taggedFriendNames.length === 0) return null;

    if (taggedFriendNames.length === 1) {
      return (
        <Text className="text-xs text-gray-500 font-normal">
          {" cùng với "}
          <Text style={{ fontWeight: "700", color: "#374151" }}>{taggedFriendNames[0]}</Text>
        </Text>
      );
    }

    return (
      <Text className="text-xs text-gray-500 font-normal">
        {" cùng với "}
        <Text style={{ fontWeight: "700", color: "#374151" }}>{taggedFriendNames[0]}</Text>
        {" và "}
        <Text style={{ fontWeight: "700", color: "#374151" }}>{`${taggedFriendNames.length - 1} người khác`}</Text>
      </Text>
    );
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
        <Text className="text-[13px] text-gray-800 leading-[18px]">
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
        <Text className="text-[13px] text-gray-800 leading-[18px]">
          <Text style={{ fontWeight: "700", color: "#1d4ed8" }}>{tagText}</Text>
          {restText}
        </Text>
      );
    }
    return <Text className="text-[13px] text-gray-800 leading-[18px]">{content}</Text>;
  };

  // ============ Render Single Comment ============
  const renderComment = (comment: IComment, isReply = false) => {
    const cAuthor = commentAuthors[comment.userId];
    const isCommentOwner = comment.userId === currentUserId || post.userId === currentUserId;
    const myCommentReaction = getMyCommentReaction(comment.reactions);
    const commentReactionSummary = getCommentReactionSummary(comment.reactions);

    return (
      <View key={comment._id} className={`flex-row ${isReply ? "ml-10 mt-2.5" : "mt-3"} pr-2`}>
        {cAuthor?.avatar ? (
          <Image source={{ uri: cAuthor.avatar }} className={`${isReply ? "w-7 h-7" : "w-9 h-9"} rounded-full bg-gray-100`} />
        ) : (
          <View className={`${isReply ? "w-7 h-7" : "w-9 h-9"} rounded-full bg-gray-900 items-center justify-center`}>
            <Text className="text-white font-bold text-[10px]">
              {cAuthor?.fullName?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View className="ml-2.5 flex-1">
          <View className="bg-gray-50 rounded-2xl px-3.5 py-2.5 border border-gray-100">
            <View className="flex-row justify-between items-center mb-0.5">
              <TouchableOpacity
                onPress={() => {
                  const uid = cAuthor?.id || cAuthor?._id;
                  if (uid) router.push({ pathname: "/profile/timeline", params: { userId: uid } });
                }}
              >
                <Text className="text-[13px] font-bold text-gray-900">{cAuthor?.fullName || "Đang tải..."}</Text>
              </TouchableOpacity>
              {isCommentOwner && (
                <TouchableOpacity onPress={() => handleDeleteComment(comment._id)} className="p-0.5">
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            {comment.content ? renderCommentContentWithTags(comment.content) : null}
            {/* Comment image */}
            {comment.mediaUrl && (
              <TouchableOpacity className="mt-2 rounded-xl overflow-hidden">
                <Image
                  source={{ uri: comment.mediaUrl }}
                  className="w-40 h-28 rounded-xl"
                  style={{ resizeMode: "cover" }}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Comment action row */}
          <View className="flex-row items-center mt-1 gap-3 px-1">
            <Text className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</Text>

            {/* React to comment (long-press picker) */}
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
                setReplyingToId(comment._id);
                setReplyingToName(cAuthor?.fullName || "người dùng");
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

          {/* Reply input */}
          {replyingToId === comment._id && (
            <View className="flex-row items-center mt-2 gap-2">
              <TextInput
                placeholder={`Trả lời ${replyingToName}...`}
                placeholderTextColor="#9ca3af"
                className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-[12px] text-gray-800"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => handleAddReply(comment._id)}
                disabled={!replyText.trim() || submittingReply}
                className={`w-7 h-7 rounded-full bg-blue-600 items-center justify-center ${!replyText.trim() || submittingReply ? "opacity-40" : ""}`}
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={12} color="white" style={{ marginLeft: 1 }} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setReplyingToId(null); setReplyText(""); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          {/* Render replies */}
          {comment.replies && comment.replies.map((reply) => renderComment(reply, true))}
        </View>
      </View>
    );
  };

  // ============ Reaction summary icons ============
  const reactionSummary = getReactionSummary();

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
            <View className="flex-row flex-wrap items-center">
              {loadingAuthor ? (
                <ActivityIndicator size="small" color="#9ca3af" style={{ alignSelf: "flex-start" }} />
              ) : (
                <Text className="text-base font-bold text-gray-900 mr-1">{author?.fullName || "Người dùng"}</Text>
              )}
              {renderTagFriendsText()}
            </View>
            <View className="flex-row items-center mt-0.5 gap-1.5">
              <Text className="text-xs text-gray-400">{formatTime(post.createdAt)}</Text>
              <Text className="text-xs text-gray-300">•</Text>
              {getPrivacyIcon(post.privacy)}
            </View>
          </View>
        </TouchableOpacity>

        {/* Menu "..." */}
        <TouchableOpacity onPress={() => setShowMenu(true)} className="p-1">
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Media Grid */}
      {renderMediaGrid()}

      {/* Reaction Summary Bar */}
      {reactionCount > 0 && (
        <View className="flex-row items-center mt-3 px-1">
          <View className="flex-row items-center gap-0.5">
            {reactionSummary.map((type) => (
              <Text key={type} className="text-sm">{REACTION_EMOJI[type]}</Text>
            ))}
          </View>
          <Text className="text-xs text-gray-500 ml-1.5">{reactionCount}</Text>
        </View>
      )}

      {/* Footer / Interaction Buttons */}
      <View className="flex-row items-center justify-between border-t border-gray-50 mt-3 pt-3 px-1">
        <View className="flex-row gap-4">
          {/* Like/React Button — Long press shows picker */}
          <View className="relative">
            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={handleQuickLike}
              onLongPress={() => setShowReactionPicker(!showReactionPicker)}
              delayLongPress={300}
            >
              {myReaction ? (
                <Text className="text-lg">{REACTION_EMOJI[myReaction]}</Text>
              ) : (
                <Ionicons name="heart-outline" size={22} color="#4b5563" />
              )}
              <Text className={`text-sm ${myReaction ? "text-blue-600 font-bold" : "text-gray-600 font-medium"}`}>
                {myReaction ? REACTION_LABELS[myReaction] : "Thích"}
              </Text>
            </TouchableOpacity>

            {/* Reaction Picker Popup */}
            {showReactionPicker && (
              <View className="absolute -top-12 left-0 flex-row bg-white border border-gray-100 rounded-full px-2 py-1 gap-0.5 shadow-xl z-50" style={{ elevation: 10 }}>
                {(["LIKE", "HEART", "HAHA", "WOW", "SAD", "ANGRY"] as ReactionType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => handleReact(type)}
                    className="p-1.5"
                  >
                    <Text className="text-2xl">{REACTION_EMOJI[type]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Comment Button */}
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() => {
              if (isDetailView) {
                onCommentPress?.();
              } else {
                router.push(`/posts/${post._id}?focus=true`);
              }
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#4b5563" />
            <Text className="text-sm text-gray-600 font-medium">{localCommentCount || 0}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push(`/posts/${post._id}`)}>
          <Text className="text-xs text-blue-600 font-semibold">Xem chi tiết</Text>
        </TouchableOpacity>
      </View>

      {/* Close reaction picker when tapping elsewhere */}
      {showReactionPicker && (
        <Pressable
          className="absolute inset-0"
          onPress={() => setShowReactionPicker(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
        />
      )}

      {/* ============ Inline Comments Section ============ */}
      {showComments && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          {loadingComments ? (
            <ActivityIndicator size="small" color="#2563eb" className="py-4" />
          ) : comments.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-gray-400 text-xs">Chưa có bình luận nào.</Text>
            </View>
          ) : (
            <View className="max-h-80">
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {comments.map((comment) => renderComment(comment))}
              </ScrollView>
            </View>
          )}

          {/* Comment image preview */}
          {commentImage && (
            <View className="flex-row items-center mt-2 gap-2 px-1">
              <Image source={{ uri: commentImage.uri }} className="w-14 h-10 rounded-lg" style={{ resizeMode: "cover" }} />
              <TouchableOpacity onPress={() => setCommentImage(null)}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Comment input */}
          <View className="flex-row items-center mt-3 gap-2">
            <TouchableOpacity onPress={pickCommentImage} className="p-1">
              <Ionicons name="camera-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TextInput
              placeholder="Viết bình luận..."
              placeholderTextColor="#9ca3af"
              className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2 text-[13px] text-gray-800"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={(!commentText.trim() && !commentImage) || submittingComment}
              className={`w-8 h-8 rounded-full bg-blue-600 items-center justify-center ${(!commentText.trim() && !commentImage) || submittingComment ? "opacity-40" : ""}`}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={14} color="white" style={{ marginLeft: 1 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============ Menu "..." Modal ============ */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowMenu(false)}
        >
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />

            {isOwner && (
              <>
                <TouchableOpacity onPress={openEditModal} className="flex-row items-center gap-4 py-3.5">
                  <Ionicons name="create-outline" size={22} color="#2563eb" />
                  <Text className="text-base text-gray-800 font-medium">Chỉnh sửa bài viết</Text>
                </TouchableOpacity>
                <View className="border-b border-gray-50" />
              </>
            )}

            <TouchableOpacity onPress={handleCopyLink} className="flex-row items-center gap-4 py-3.5">
              <Ionicons name="link-outline" size={22} color="#4b5563" />
              <Text className="text-base text-gray-800 font-medium">Sao chép liên kết</Text>
            </TouchableOpacity>
            <View className="border-b border-gray-50" />

            {!isOwner && (
              <>
                <TouchableOpacity onPress={handleReport} className="flex-row items-center gap-4 py-3.5">
                  <Ionicons name="flag-outline" size={22} color="#f59e0b" />
                  <Text className="text-base text-gray-800 font-medium">Báo cáo bài viết</Text>
                </TouchableOpacity>
                <View className="border-b border-gray-50" />
              </>
            )}

            {isOwner && (
              <TouchableOpacity onPress={handleDelete} className="flex-row items-center gap-4 py-3.5">
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
                <Text className="text-base text-red-600 font-medium">Xóa bài viết</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setShowMenu(false)} className="mt-3 bg-gray-50 py-3 rounded-2xl items-center">
              <Text className="text-base text-gray-600 font-semibold">Đóng</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ============ Edit Post Modal ============ */}
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "white" }}>
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 mt-12">
            <TouchableOpacity onPress={() => setShowEditModal(false)} className="p-1">
              <Ionicons name="close" size={26} color="#4b5563" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Chỉnh sửa bài viết</Text>
            {editSubmitting ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <TouchableOpacity onPress={handleEditSubmit} className="bg-blue-600 px-4 py-1.5 rounded-full">
                <Text className="text-white font-semibold text-sm">Lưu</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView className="flex-1 px-5 pt-4">
            {/* Privacy */}
            <View className="flex-row gap-2 mb-4">
              {(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setEditPrivacy(p)}
                  className={`px-3 py-1.5 rounded-full border ${editPrivacy === p ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"}`}
                >
                  <Text className={`text-xs font-semibold ${editPrivacy === p ? "text-blue-600" : "text-gray-600"}`}>
                    {p === "PUBLIC" ? "Công khai" : p === "FRIENDS_ONLY" ? "Bạn bè" : "Chỉ mình tôi"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Nội dung bài viết..."
              placeholderTextColor="#9ca3af"
              className="text-base text-gray-800 min-h-[120px] text-start"
              multiline
              style={{ textAlignVertical: "top" }}
              value={editContent}
              onChangeText={setEditContent}
            />

            {/* Keep existing media */}
            {editKeepMedia.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-4">
                {editKeepMedia.map((url, index) => (
                  <View key={index} className="w-[30%] h-20 rounded-xl overflow-hidden bg-gray-100 relative">
                    <Image source={{ uri: url }} className="w-full h-full object-cover" />
                    <TouchableOpacity
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full justify-center items-center"
                      onPress={() => setEditKeepMedia((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close" size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ============ Fullscreen Video Player Modal ============ */}
      <Modal visible={showVideoModal} transparent={false} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
          <Video
            ref={postVideoRef}
            source={{ uri: videoUrl }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={showVideoModal}
            isMuted={isVideoMuted}
            isLooping={true}
            useNativeControls={true}
            style={{ width: "100%", height: "100%" }}
          />
          {/* Close button */}
          <TouchableOpacity 
            onPress={() => {
              setShowVideoModal(false);
              setVideoUrl("");
            }} 
            className="absolute top-12 right-6 bg-black/60 w-10 h-10 rounded-full items-center justify-center z-50"
            style={{ elevation: 10 }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {/* Mute button */}
          <TouchableOpacity 
            onPress={() => setIsVideoMuted(!isVideoMuted)} 
            className="absolute bottom-12 right-6 bg-black/60 w-10 h-10 rounded-full items-center justify-center z-50"
            style={{ elevation: 10 }}
          >
            <Ionicons name={isVideoMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
