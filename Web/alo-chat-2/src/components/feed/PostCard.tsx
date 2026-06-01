"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HeartIcon as HeartOutline,
  ChatBubbleLeftIcon as ChatOutline,
  TrashIcon,
  GlobeAsiaAustraliaIcon,
  UsersIcon,
  LockClosedIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  CameraIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  LinkIcon,
  FlagIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { userService, UserProfileDTO } from "@/services/userService";
import { postService, IPost, IComment, IReaction, ReactionType, REACTION_EMOJI, REACTION_LABELS } from "@/services/postService";
import { socketService } from "@/services/socketService";
import { contactService } from "@/services/contactService";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { toast } from "sonner";

// In-memory cache to reduce user details request volume
const userCache: Record<string, UserProfileDTO> = {};

const MOOD_CLASSES: Record<string, string> = {
  sunset: "bg-gradient-to-r from-orange-400 to-rose-500 text-white",
  midnight: "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
  cosmic: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
  emerald: "bg-gradient-to-r from-emerald-400 to-teal-600 text-white",
  rose: "bg-gradient-to-r from-pink-400 to-rose-600 text-white",
  sky: "bg-gradient-to-r from-cyan-400 to-blue-600 text-white",
};

const renderCommentContent = (content: string, availableUsers: UserProfileDTO[] = []) => {
  if (!content) return null;

  // Thu thập các tên người dùng hợp lệ trong post (tác giả, người bình luận)
  const validUsers = availableUsers.filter((u) => u && u.fullName);
  // Sắp xếp theo độ dài tên giảm dần để match tên dài trước
  validUsers.sort((a, b) => b.fullName.length - a.fullName.length);

  const parts: React.ReactNode[] = [];
  let remaining = content;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Tìm vị trí của dấu @
    const atIndex = remaining.indexOf("@");
    if (atIndex === -1) {
      parts.push(remaining);
      break;
    }

    // Push phần text trước dấu @
    if (atIndex > 0) {
      parts.push(remaining.substring(0, atIndex));
    }

    const afterAt = remaining.substring(atIndex + 1);
    let matchedUser: UserProfileDTO | null = null;

    // Kiểm tra xem phần sau dấu @ có khớp với tên nào trong known users không
    for (const user of validUsers) {
      if (afterAt.toLowerCase().startsWith(user.fullName.toLowerCase())) {
        matchedUser = user;
        break;
      }
    }

    if (matchedUser) {
      // Nếu khớp chính xác với một user đã biết
      parts.push(
        <Link
          key={keyIndex++}
          href={`/profile/timeline?userId=${matchedUser.id}`}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          @{afterAt.substring(0, matchedUser.fullName.length)}
        </Link>
      );
      remaining = afterAt.substring(matchedUser.fullName.length);
    } else {
      // Fallback: Thử dùng regex cơ bản để match 1 từ (chữ thường hoặc hoa)
      const fallbackRegex = /^([\w\p{L}\d_-]+)/u;
      const match = afterAt.match(fallbackRegex);
      if (match) {
        parts.push(
          <span key={keyIndex++} className="font-bold text-blue-600 dark:text-blue-400">
            @{match[1]}
          </span>
        );
        remaining = afterAt.substring(match[1].length);
      } else {
        // Không match được gì, coi như text bình thường
        parts.push("@");
        remaining = afterAt;
      }
    }
  }

  return parts.length > 0 ? parts : content;
};

interface PostCardProps {
  post: IPost;
  onDeleteSuccess?: (postId: string) => void;
  onLikeUpdate?: (updatedPost: IPost) => void;
  onEditSuccess?: (updatedPost: IPost) => void;
}

export default function PostCard({ post, onDeleteSuccess, onLikeUpdate, onEditSuccess }: PostCardProps) {
  const { user: currentUser } = useAuthStore();
  const [author, setAuthor] = useState<UserProfileDTO | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [reactionCount, setReactionCount] = useState(post.reactionCount || post.likeCount || 0);
  const [reactions, setReactions] = useState(post.reactions || []);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeCommentPickerId, setActiveCommentPickerId] = useState<string | null>(null);
  const commentReactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Dùng state riêng cho commentCount để trigger re-render đúng cách (không mutate prop)
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount || 0);
  const [taggedUsers, setTaggedUsers] = useState<UserProfileDTO[]>([]);

  // Inline Comment States
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Image comments states
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentFilePreview, setCommentFilePreview] = useState<string | null>(null);
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyFilePreview, setReplyFilePreview] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [zoomedCommentImage, setZoomedCommentImage] = useState<string | null>(null);

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCommentFilePreview(previewUrl);
    }
  };

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyFile(file);
      const previewUrl = URL.createObjectURL(file);
      setReplyFilePreview(previewUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (commentFilePreview) URL.revokeObjectURL(commentFilePreview);
      if (replyFilePreview) URL.revokeObjectURL(replyFilePreview);
    };
  }, [commentFilePreview, replyFilePreview]);

  // Media Zoom Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Cache comment authors to avoid duplicate API calls
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserProfileDTO>>({});

  // Reactions Evaluators Modal States
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsProfiles, setReactionsProfiles] = useState<Record<string, UserProfileDTO>>({});
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [loadingReactionsModal, setLoadingReactionsModal] = useState(false);

  // Menu "..." dropdown & Edit Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<{ url: string; isVideo: boolean; name: string; isExisting?: boolean; originalUrl?: string }[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = post.userId === currentUserId;

  // 1. Fetch Author Profile
  useEffect(() => {
    if (!post.userId) return;

    if (userCache[post.userId]) {
      setAuthor(userCache[post.userId]!);
      return;
    }

    let isMounted = true;
    setLoadingAuthor(true);
    userService.getUserById(post.userId)
      .then((profile) => {
        if (profile && isMounted) {
          userCache[post.userId] = profile;
          setAuthor(profile);
        }
        if (isMounted) setLoadingAuthor(false);
      })
      .catch(() => {
        if (isMounted) setLoadingAuthor(false);
      });

    return () => {
      isMounted = false;
    };
  }, [post.userId]);

  // 2. Sync Like State
  useEffect(() => {
    if (currentUserId && post.likes) {
      setIsLiked(post.likes.includes(currentUserId));
    }
    setLikeCount(post.likeCount || 0);
    // Sync reactions
    setReactions(post.reactions || []);
    setReactionCount(post.reactionCount || post.likeCount || 0);
    if (currentUserId && post.reactions) {
      const mine = post.reactions.find((r) => r.userId === currentUserId);
      setMyReaction(mine?.type || null);
    }
  }, [post.likes, post.likeCount, post.reactions, post.reactionCount, currentUserId]);

  // Sync commentCount khi prop thay đổi
  useEffect(() => {
    setLocalCommentCount(post.commentCount || 0);
  }, [post.commentCount]);

  // Fetch Tagged Users
  useEffect(() => {
    if (post.tags && post.tags.length > 0) {
      const fetchTaggedProfiles = async () => {
        try {
          const resolved = await Promise.all(
            post.tags.map(async (uid) => {
              if (userCache[uid]) {
                return userCache[uid]!;
              }
              try {
                const prof = await userService.getUserById(uid);
                if (prof) {
                  userCache[uid] = prof;
                  return prof;
                }
              } catch (e) {
                console.error("Failed to load profile for tag:", uid, e);
              }
              return null;
            })
          );

          const validProfiles = resolved.filter((p): p is UserProfileDTO => p !== null);
          const uniqueProfilesMap = new Map<string, UserProfileDTO>();
          validProfiles.forEach((p) => {
            const id = p.id;
            if (id) {
              uniqueProfilesMap.set(id, p);
            }
          });
          setTaggedUsers(Array.from(uniqueProfilesMap.values()));
        } catch (err) {
          console.error("Failed to load tagged users:", err);
        }
      };
      fetchTaggedProfiles();
    } else {
      setTaggedUsers([]);
    }
  }, [post.tags]);

  // 3. Fetch Comments
  const fetchComments = useCallback(async () => {
    if (!post._id) return;
    setLoadingComments(true);
    try {
      const list = await postService.getComments(post._id, 50, 0);
      setComments(list || []);

      // Fetch authors for comments and their nested replies
      const userIds = new Set<string>();
      list.forEach((c) => {
        if (c.userId) userIds.add(c.userId);
        if (c.replies && Array.isArray(c.replies)) {
          c.replies.forEach((r) => {
            if (r.userId) userIds.add(r.userId);
          });
        }
      });
      const uniqueUserIds = Array.from(userIds);
      const profilesMap: Record<string, UserProfileDTO> = {};
      
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          if (userCache[uid]) {
            profilesMap[uid] = userCache[uid]!;
            return;
          }
          try {
            const prof = await userService.getUserById(uid);
            if (prof) {
              userCache[uid] = prof;
              profilesMap[uid] = prof;
            }
          } catch {
            // Bỏ qua lỗi fetch profile
          }
        })
      );
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

  // 3.1 Real-time Social post/comment synchronization (Đồng bộ tức thì mọi tương tác)
  useEffect(() => {
    socketService.joinPost(post._id);

    const unsubscribe = socketService.onPostInteraction((data) => {
      if (data.postId === post._id) {
        console.log(`[Real-time] Received post interaction: ${data.eventType}`);
        if (
          data.eventType === "COMMENT_ADDED" ||
          data.eventType === "COMMENT_DELETED" ||
          data.eventType === "COMMENT_REACTED"
        ) {
          if (showComments) {
            fetchComments();
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
      socketService.leavePost(post._id);
      unsubscribe();
    };
  }, [post._id, showComments, fetchComments]);

  // Time formatter
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

  // React to post
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

  // Quick like (backward compatible) — nếu đã có reaction thì gửi đúng type để unreact
  const handleLike = () => handleReact(myReaction || 'LIKE');

  const handleReactionMouseEnter = () => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactionPicker(true);
  };

  const handleReactionMouseLeave = () => {
    reactionTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 300);
  };

  // Get unique reaction types for summary display
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

  const openReactionsModal = async () => {
    setShowReactionsModal(true);
    setLoadingReactionsModal(true);
    try {
      // 1. Fetch friends list
      const contacts = await contactService.getFriendsList();
      const accepted = contacts.filter((c: any) => c.status === "ACCEPTED");
      const friendIds = accepted.map((f: any) => 
        f.requesterId === currentUserId ? f.recipientId : f.requesterId
      );
      setFriendsList(friendIds);

      // 2. Fetch profiles of those who reacted
      const profilesMap: Record<string, UserProfileDTO> = {};
      const uniqueReactingUserIds = Array.from(new Set(reactions.map((r) => r.userId)));
      
      await Promise.all(
        uniqueReactingUserIds.map(async (uid) => {
          if (userCache[uid]) {
            profilesMap[uid] = userCache[uid]!;
            return;
          }
          try {
            const prof = await userService.getUserById(uid);
            if (prof) {
              userCache[uid] = prof;
              profilesMap[uid] = prof;
            }
          } catch (e) {
            console.error("Failed to load profile for reaction:", uid, e);
          }
        })
      );
      setReactionsProfiles(profilesMap);
    } catch (err) {
      console.error("Failed to open reactions modal:", err);
    } finally {
      setLoadingReactionsModal(false);
    }
  };

  // Delete Post
  const handleDelete = async () => {
    setShowMenu(false);
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      const success = await postService.deletePost(post._id);
      if (success && onDeleteSuccess) {
        onDeleteSuccess(post._id);
        toast.success("Đã xóa bài viết thành công!");
      } else {
        toast.error("Xóa bài viết thất bại. Vui lòng thử lại.");
      }
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    setShowMenu(false);
    setEditContent(post.content || "");
    setEditPrivacy(post.privacy);
    setEditFiles([]);
    // Set existing media as previews
    const existingPreviews = (post.media || []).map((m) => ({
      url: m.url.startsWith("http") ? m.url : `http://localhost:8888${m.url.startsWith("/") ? "" : "/"}${m.url}`,
      isVideo: m.type === "VIDEO",
      name: m.fileName || "media",
      isExisting: true,
      originalUrl: m.url,
    }));
    setEditPreviews(existingPreviews);
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() && editPreviews.length === 0 && editFiles.length === 0) return;
    setEditSubmitting(true);
    try {
      const keepMediaUrls = editPreviews
        .filter((p) => p.isExisting)
        .map((p) => p.originalUrl || p.url);
      const result = await postService.editPost(
        post._id,
        editContent,
        editPrivacy,
        editFiles,
        keepMediaUrls
      );
      if (result) {
        toast.success("Đã chỉnh sửa bài viết!");
        setShowEditModal(false);
        if (onEditSuccess) onEditSuccess(result);
        if (onLikeUpdate) onLikeUpdate(result);
      } else {
        toast.error("Chỉnh sửa thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Đã xảy ra lỗi khi chỉnh sửa.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Copy post link
  const handleCopyLink = () => {
    setShowMenu(false);
    const link = `${window.location.origin}/feed?postId=${post._id}`;
    navigator.clipboard.writeText(link);
    toast.success("Đã sao chép liên kết bài viết!");
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Add Level 1 Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentText.trim() && !commentFile) || submittingComment) return;

    setSubmittingComment(true);
    try {
      const newComment = await postService.createComment(
        post._id, 
        commentText.trim() || undefined, 
        undefined, 
        commentFile || undefined
      );
      if (newComment) {
        setCommentText("");
        setCommentFile(null);
        if (commentFilePreview) {
          URL.revokeObjectURL(commentFilePreview);
          setCommentFilePreview(null);
        }
        setLocalCommentCount((prev) => prev + 1);
        await fetchComments();
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể gửi bình luận lúc này.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Add Level 2 Comment (Reply)
  const handleAddReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if ((!replyText.trim() && !replyFile) || submittingReply) return;

    setSubmittingReply(true);
    try {
      const newComment = await postService.createComment(
        post._id, 
        replyText.trim() || undefined, 
        parentId, 
        replyFile || undefined
      );
      if (newComment) {
        setReplyText("");
        setReplyFile(null);
        if (replyFilePreview) {
          URL.revokeObjectURL(replyFilePreview);
          setReplyFilePreview(null);
        }
        setReplyingToId(null);
        setLocalCommentCount((prev) => prev + 1);
        await fetchComments();
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể gửi phản hồi lúc này.");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      const result = await postService.deleteComment(commentId);
      if (result.success) {
        // Dùng deletedCount từ backend để giảm chính xác
        setLocalCommentCount((prev) => Math.max(0, prev - (result.deletedCount || 1)));
        await fetchComments();
        toast.success("Đã xóa bình luận thành công!");
      } else {
        toast.error("Không thể xóa bình luận lúc này.");
      }
    }
  };

  // Get unique reaction types for comment summary display
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

  // Get current user's reaction to a comment
  const getMyCommentReaction = (reactionsList?: IReaction[]) => {
    const found = (reactionsList || []).find((r) => r.userId === currentUserId);
    return found ? found.type : null;
  };

  // Thả cảm xúc bình luận (React) với cơ chế Optimistic Update
  const handleReactToComment = async (commentId: string, type: ReactionType) => {
    if (!currentUserId) return;
    const prevComments = [...comments];

    const updateCommentInList = (list: IComment[]): IComment[] => {
      return list.map((c) => {
        if (c._id === commentId) {
          const reactions = c.reactions || [];
          const existingIndex = reactions.findIndex((r) => r.userId === currentUserId);
          let newReactions = [...reactions];

          if (existingIndex >= 0) {
            const existing = reactions[existingIndex]!;
            if (existing.type === type) {
              // Unreact
              newReactions.splice(existingIndex, 1);
            } else {
              // Đổi reaction
              newReactions[existingIndex] = { ...existing, type };
            }
          } else {
            // Reaction mới
            newReactions.push({ userId: currentUserId, type });
          }

          return {
            ...c,
            reactions: newReactions,
            reactionCount: newReactions.length,
          };
        } else if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: updateCommentInList(c.replies),
          };
        }
        return c;
      });
    };

    setComments(updateCommentInList(comments));

    const updated = await postService.reactToComment(commentId, type);
    if (updated) {
      // Đã tự động cập nhật qua backend
    } else {
      // Rollback nếu thất bại
      setComments(prevComments);
      toast.error("Không thể bày tỏ cảm xúc lúc này.");
    }
  };

  const handleCommentPickerMouseEnter = (commentId: string) => {
    if (commentReactionTimeoutRef.current) clearTimeout(commentReactionTimeoutRef.current);
    setActiveCommentPickerId(commentId);
  };

  const handleCommentPickerMouseLeave = () => {
    commentReactionTimeoutRef.current = setTimeout(() => {
      setActiveCommentPickerId(null);
    }, 300);
  };

  // Get Avatar Helper
  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "PUBLIC":
        return <GlobeAsiaAustraliaIcon className="w-3.5 h-3.5 text-gray-400" title="Công khai" />;
      case "FRIENDS_ONLY":
        return <UsersIcon className="w-3.5 h-3.5 text-gray-400" title="Bạn bè" />;
      case "PRIVATE":
        return <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" title="Chỉ mình tôi" />;
      default:
        return null;
    }
  };

  // Video Play Overlay Component
  const VideoPlayOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
        <PlayIcon className="w-5 h-5 text-white ml-0.5" />
      </div>
    </div>
  );

  // Media Grid Renderer
  const renderMediaGrid = () => {
    const media = post.media || [];
    if (media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0]!;
      return (
        <div 
          onClick={() => setLightboxIndex(0)}
          className="mt-4 w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 cursor-zoom-in group relative"
        >
          {item.type === "VIDEO" ? (
            <div className="relative flex justify-center items-center h-96 w-full">
              <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
              <VideoPlayOverlay />
            </div>
          ) : (
            <img 
              src={item.url} 
              alt="Post media" 
              className="w-full max-h-[500px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
            />
          )}
        </div>
      );
    }

    if (media.length === 2) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden h-[360px]">
          {media.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => setLightboxIndex(idx)}
              className="h-full bg-gray-50 relative cursor-zoom-in group overflow-hidden border border-gray-100 dark:border-zinc-800"
            >
              {item.type === "VIDEO" ? (
                <>
                  <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                  <VideoPlayOverlay />
                </>
              ) : (
                <img 
                  src={item.url} 
                  alt="Post media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (media.length === 3) {
      const topItem = media[0]!;
      const bottomItems = media.slice(1, 3);
      return (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl overflow-hidden">
          {/* Top horizontal item */}
          <div 
            onClick={() => setLightboxIndex(0)}
            className="h-[200px] w-full bg-gray-50 relative cursor-zoom-in group overflow-hidden border border-gray-100 dark:border-zinc-800"
          >
            {topItem.type === "VIDEO" ? (
              <>
                <video src={topItem.url} className="w-full h-full object-cover" preload="metadata" />
                <VideoPlayOverlay />
              </>
            ) : (
              <img 
                src={topItem.url} 
                alt="Post media" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            )}
          </div>
          {/* Bottom 2 columns */}
          <div className="grid grid-cols-2 gap-2 h-[140px]">
            {bottomItems.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxIndex(idx + 1)}
                className="h-full bg-gray-50 relative cursor-zoom-in group overflow-hidden border border-gray-100 dark:border-zinc-800"
              >
                {item.type === "VIDEO" ? (
                  <>
                    <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                    <VideoPlayOverlay />
                  </>
                ) : (
                  <img 
                    src={item.url} 
                    alt="Post media" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4 or more items
    const topItem = media[0]!;
    const bottomItems = media.slice(1, 4);
    const extraCount = media.length - 4;

    return (
      <div className="mt-4 flex flex-col gap-2 rounded-2xl overflow-hidden">
        {/* Top horizontal item */}
        <div 
          onClick={() => setLightboxIndex(0)}
          className="h-[220px] w-full bg-gray-50 relative cursor-zoom-in group overflow-hidden border border-gray-100 dark:border-zinc-800"
        >
          {topItem.type === "VIDEO" ? (
            <>
              <video src={topItem.url} className="w-full h-full object-cover" preload="metadata" />
              <VideoPlayOverlay />
            </>
          ) : (
            <img 
              src={topItem.url} 
              alt="Post media" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          )}
        </div>
        {/* Bottom 3 columns */}
        <div className="grid grid-cols-3 gap-2 h-[120px]">
          {bottomItems.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => setLightboxIndex(idx + 1)}
              className="h-full bg-gray-50 relative cursor-zoom-in group overflow-hidden border border-gray-100 dark:border-zinc-800"
            >
              {item.type === "VIDEO" ? (
                <>
                  <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                  <VideoPlayOverlay />
                </>
              ) : (
                <img 
                  src={item.url} 
                  alt="Post media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>

        {/* Xem thêm banner for 5+ items (Zalo-style) */}
        {media.length > 4 && (
          <div 
            onClick={() => setLightboxIndex(4)}
            className="w-full h-11 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-300 gap-1"
          >
            <span>Xem thêm ({extraCount} ảnh)</span>
          </div>
        )}
      </div>
    );
  };

  // Render Carousel Lightbox Modal
  const renderLightbox = () => {
    if (lightboxIndex === null) return null;
    const media = post.media || [];
    const currentMedia = media[lightboxIndex];

    const showPrev = () => {
      setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : media.length - 1));
    };

    const showNext = () => {
      setLightboxIndex((prev) => (prev !== null && prev < media.length - 1 ? prev + 1 : 0));
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
        {/* Close Button */}
        <button 
          onClick={() => setLightboxIndex(null)}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <XMarkIcon className="w-7 h-7" />
        </button>

        {/* Prev Button */}
        {media.length > 1 && (
          <button 
            onClick={showPrev}
            className="absolute left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {media.length > 1 && (
          <button 
            onClick={showNext}
            className="absolute right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}

        {/* Large Media Content Container */}
        <div className="max-w-[85vw] max-h-[85vh] flex items-center justify-center select-none">
          {currentMedia?.type === "VIDEO" ? (
            <video src={currentMedia.url} className="max-w-full max-h-[85vh] rounded-xl" controls autoPlay />
          ) : (
            <img src={currentMedia?.url} alt="Expanded preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          )}
        </div>

        {/* Counter Page indicator */}
        <div className="absolute bottom-6 text-white/70 text-sm font-semibold bg-black/40 px-4 py-1.5 rounded-full">
          {lightboxIndex + 1} / {media.length}
        </div>
      </div>
    );
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const availableUsers = [author, ...Object.values(commentAuthors)].filter(Boolean) as UserProfileDTO[];

  return (
    <div id={`post-${post._id}`} className="bg-white rounded-3xl p-4 md:p-6 mb-5 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col">
      {/* Header Profile Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/timeline?userId=${post.userId}`} className="block relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity">
              <img
                src={getAvatar(author?.avatar, author?.fullName)}
                alt="Author avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-1 flex-wrap select-none">
              <Link href={`/profile/timeline?userId=${post.userId}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-[15px]">
                {loadingAuthor ? "Đang tải..." : author?.fullName || "Người dùng"}
              </Link>
              {taggedUsers.length > 0 && (
                <>
                  <span className="text-xs text-gray-500 font-medium"> cùng với </span>
                  {taggedUsers.slice(0, 2).map((u, idx) => (
                    <React.Fragment key={u.id}>
                      {idx > 0 && <span className="text-xs text-gray-500 font-medium">, </span>}
                      <Link
                        href={`/profile/timeline?userId=${u.id}`}
                        className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors text-[14px]"
                      >
                        {u.fullName}
                      </Link>
                    </React.Fragment>
                  ))}
                  {taggedUsers.length > 2 && (
                    <span 
                      className="text-xs text-gray-500 font-semibold cursor-pointer hover:underline"
                      title={taggedUsers.slice(2).map(u => u.fullName).join(", ")}
                    >
                      {" "}và {taggedUsers.length - 2} người khác
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">{formatTime(post.createdAt)}</span>
              <span className="text-xs text-gray-300">•</span>
              {getPrivacyIcon(post.privacy)}
            </div>
          </div>
        </div>

        {/* Menu "..." dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
            title="Tùy chọn"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-52 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {isOwner ? (
                <>
                  <button
                    onClick={openEditModal}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <PencilSquareIcon className="w-4 h-4 text-blue-500" />
                    Chỉnh sửa bài viết
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    Sao chép liên kết
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-3 my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Xóa bài viết
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    Sao chép liên kết
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); toast.info("Tính năng báo cáo sẽ sớm được hỗ trợ."); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <FlagIcon className="w-4 h-4 text-orange-400" />
                    Báo cáo bài viết
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      {post.content && (
        post.backgroundTemplate && MOOD_CLASSES[post.backgroundTemplate] ? (
          <div className={`h-[180px] rounded-3xl flex items-center justify-center p-6 text-center text-lg font-bold shadow-sm mb-4 ${
            MOOD_CLASSES[post.backgroundTemplate]
          }`}>
            <p className="whitespace-pre-wrap leading-relaxed select-text">{post.content}</p>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap px-1 mb-2">
            {post.content}
          </p>
        )
      )}

      {/* Post Media Grid */}
      {renderMediaGrid()}

      {/* Reaction Summary (hiện icons tổng hợp phía trên nút tương tác) */}
      {reactionCount > 0 && (
        <div 
          onClick={openReactionsModal}
          className="flex items-center gap-1.5 border-t border-gray-100 dark:border-zinc-800 mt-5 pt-3 px-2 cursor-pointer hover:underline"
        >
          <div className="flex -space-x-1">
            {getReactionSummary().map((type) => (
              <span key={type} className="text-base" title={REACTION_LABELS[type]}>
                {REACTION_EMOJI[type]}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-500 font-medium ml-1">
            {reactionCount} lượt bày tỏ cảm xúc
          </span>
        </div>
      )}

      {/* Interaction Row (Reactions, Comments buttons) */}
      <div className={`flex items-center justify-between ${reactionCount > 0 ? 'pt-2' : 'border-t border-gray-100 mt-5 pt-4'} px-1`}>
        <div className="flex items-center gap-6">
          {/* Reaction button with hover popup */}
          <div
            className="relative"
            onMouseEnter={handleReactionMouseEnter}
            onMouseLeave={handleReactionMouseLeave}
          >
            {/* Reaction Picker Popup */}
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1.5 flex items-center gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                {(['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as ReactionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleReact(type)}
                    className={`text-2xl hover:scale-125 transition-transform duration-150 px-1.5 py-0.5 rounded-full hover:bg-gray-50 ${
                      myReaction === type ? 'scale-110 bg-blue-50' : ''
                    }`}
                    title={REACTION_LABELS[type]}
                  >
                    {REACTION_EMOJI[type]}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleLike}
              className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors group"
            >
              {myReaction ? (
                <span className="text-xl leading-none">{REACTION_EMOJI[myReaction]}</span>
              ) : (
                <HeartOutline className="w-6 h-6 group-hover:scale-110 transition-transform text-gray-600 group-hover:text-red-500" />
              )}
              <span className={`text-[14px] font-semibold ${
                myReaction ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {myReaction ? REACTION_LABELS[myReaction] : 'Thích'}
              </span>
            </button>
          </div>

          {/* Comment toggle button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <ChatOutline className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[14px] font-semibold">
              {localCommentCount}
            </span>
          </button>
        </div>

        <button 
          onClick={() => setShowComments(!showComments)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showComments ? "Thu gọn bình luận" : "Xem tất cả bình luận"}
        </button>
      </div>

      {/* Inline Comments Section */}
      {showComments && (
        <div className="mt-5 border-t border-gray-50 pt-4 flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Write comment input */}
          <form onSubmit={handleAddComment} className="flex flex-col gap-2">
            {commentFilePreview && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 ml-11">
                <img src={commentFilePreview} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCommentFile(null);
                    setCommentFilePreview(null);
                  }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img
                  src={getAvatar(currentUser?.avatar, currentUser?.fullName)}
                  alt="My avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex items-center bg-gray-50 hover:bg-gray-100 focus-within:bg-white border border-gray-100 focus-within:border-blue-500 rounded-full px-3 py-1.5 transition-all">
                <input
                  type="text"
                  placeholder="Nhập bình luận của bạn..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={submittingComment}
                  className="flex-1 bg-transparent text-sm focus:outline-none px-2 py-0.5"
                />
                <button
                  type="button"
                  onClick={() => commentFileInputRef.current?.click()}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded-full transition-colors shrink-0"
                  title="Đính kèm ảnh"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={commentFileInputRef}
                  onChange={handleCommentFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <button
                type="submit"
                disabled={(!commentText.trim() && !commentFile) || submittingComment}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors px-3 py-1 flex items-center gap-1 shrink-0"
              >
                {submittingComment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                ) : (
                  "Gửi"
                )}
              </button>
            </div>
          </form>

          {/* Comments list */}
          {loadingComments ? (
            <div className="py-4 flex justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : rootComments.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-3">Chưa có bình luận nào cho bài viết này.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {rootComments.map((comment) => {
                const commentUser = commentAuthors[comment.userId];
                const replies = comment.replies || [];
                const isCommentOwner = comment.userId === currentUserId;

                return (
                  <div key={comment._id} className="flex flex-col gap-2 group/comment">
                    <div className="flex gap-3 items-start">
                      <Link href={`/profile/timeline?userId=${comment.userId}`} className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5 border border-gray-100 hover:opacity-80 transition-opacity">
                        <img
                          src={getAvatar(commentUser?.avatar, commentUser?.fullName)}
                          alt="Commenter avatar"
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 flex flex-col items-start">
                        <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl px-4 py-2 text-sm max-w-[90%] relative">
                          <Link href={`/profile/timeline?userId=${comment.userId}`} className="font-bold text-gray-900 text-xs block mb-0.5 hover:underline">
                            {commentUser?.fullName || "Đang tải..."}
                          </Link>
                          {comment.content && (
                            <span className="text-gray-800 leading-relaxed break-words block">{renderCommentContent(comment.content, availableUsers)}</span>
                          )}
                          {comment.mediaUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden max-w-[200px] max-h-[150px] border border-gray-100 cursor-zoom-in">
                              <img
                                src={getAvatar(comment.mediaUrl)}
                                alt="Comment attachment"
                                className="w-full h-full object-cover max-h-[150px] rounded-lg"
                                onClick={() => setZoomedCommentImage(comment.mediaUrl || null)}
                              />
                            </div>
                          )}
                          
                          {/* Comment Reaction count pill */}
                          {comment.reactionCount !== undefined && comment.reactionCount > 0 && (
                            <div className="absolute -bottom-2 right-3 flex items-center gap-1 bg-white border border-gray-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:shadow transition-shadow select-none">
                              <div className="flex -space-x-0.5">
                                {getCommentReactionSummary(comment.reactions).map((type) => (
                                  <span key={type} className="text-[11px]" title={REACTION_LABELS[type]}>
                                    {REACTION_EMOJI[type]}
                                  </span>
                                ))}
                              </div>
                              <span>{comment.reactionCount}</span>
                            </div>
                          )}
                        </div>
                        {/* Action buttons (Reply, Time, Delete) */}
                        <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-gray-400 font-semibold relative">
                          <span>{formatTime(comment.createdAt)}</span>
                          
                          {/* Hover reaction picker for comment */}
                          <div 
                            className="relative"
                            onMouseEnter={() => handleCommentPickerMouseEnter(comment._id)}
                            onMouseLeave={handleCommentPickerMouseLeave}
                          >
                            <button
                              type="button"
                              onClick={() => handleReactToComment(comment._id, 'LIKE')}
                              className={`hover:text-blue-600 transition-colors ${
                                getMyCommentReaction(comment.reactions) ? 'text-blue-600 font-bold' : ''
                              }`}
                            >
                              {getMyCommentReaction(comment.reactions)
                                ? REACTION_LABELS[getMyCommentReaction(comment.reactions)!]
                                : 'Thích'}
                            </button>

                            {/* Emoji Picker Popup */}
                            {activeCommentPickerId === comment._id && (
                              <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1.5 bg-white border border-gray-100 shadow-lg rounded-full px-2 py-1 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                {(['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as ReactionType[]).map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleReactToComment(comment._id, type)}
                                    className="hover:scale-125 transition-transform text-sm cursor-pointer p-0.5"
                                    title={REACTION_LABELS[type]}
                                  >
                                    {REACTION_EMOJI[type]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setReplyingToId(comment._id);
                              const name = commentUser?.fullName || "Người dùng";
                              setReplyText(`@${name} `);
                            }}
                            className="hover:text-blue-600 transition-colors"
                          >
                            Trả lời
                          </button>
                          {(isCommentOwner || isOwner) && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="hover:text-red-600 transition-colors"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Level 2 Replies — Sử dụng replies từ backend */}
                    {replies.length > 0 && (
                      <div className="pl-11 flex flex-col gap-3">
                        {replies.map((reply) => {
                          const replyUser = commentAuthors[reply.userId];
                          const isReplyOwner = reply.userId === currentUserId;

                          return (
                            <div key={reply._id} className="flex gap-3 items-start group/reply">
                              <Link href={`/profile/timeline?userId=${reply.userId}`} className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border border-gray-100 hover:opacity-80 transition-opacity">
                                <img
                                  src={getAvatar(replyUser?.avatar, replyUser?.fullName)}
                                  alt="Replier avatar"
                                  className="w-full h-full object-cover"
                                />
                              </Link>
                              <div className="flex-1 flex flex-col items-start">
                                <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl px-3 py-1.5 text-xs max-w-[90%] relative">
                                  <Link href={`/profile/timeline?userId=${reply.userId}`} className="font-bold text-gray-900 text-[11px] block mb-0.5 hover:underline">
                                    {replyUser?.fullName || "Đang tải..."}
                                  </Link>
                                  {reply.content && (
                                    <span className="text-gray-800 leading-relaxed break-words block">{renderCommentContent(reply.content, availableUsers)}</span>
                                  )}
                                  {reply.mediaUrl && (
                                    <div className="mt-2 rounded-lg overflow-hidden max-w-[150px] max-h-[120px] border border-gray-100 cursor-zoom-in">
                                      <img
                                        src={getAvatar(reply.mediaUrl)}
                                        alt="Reply attachment"
                                        className="w-full h-full object-cover max-h-[120px] rounded-lg"
                                        onClick={() => setZoomedCommentImage(reply.mediaUrl || null)}
                                      />
                                    </div>
                                  )}

                                  {/* Reply Reaction count pill */}
                                  {reply.reactionCount !== undefined && reply.reactionCount > 0 && (
                                    <div className="absolute -bottom-2 right-2 flex items-center gap-1 bg-white border border-gray-100 shadow-sm rounded-full px-1 py-0.2 text-[9px] font-semibold text-gray-500 hover:shadow transition-shadow select-none">
                                      <div className="flex -space-x-0.5">
                                        {getCommentReactionSummary(reply.reactions).map((type) => (
                                          <span key={type} className="text-[10px]" title={REACTION_LABELS[type]}>
                                            {REACTION_EMOJI[type]}
                                          </span>
                                        ))}
                                      </div>
                                      <span>{reply.reactionCount}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 ml-2 text-[10px] text-gray-400 font-semibold relative">
                                  <span>{formatTime(reply.createdAt)}</span>
                                  
                                  {/* Hover reaction picker for reply */}
                                  <div 
                                    className="relative"
                                    onMouseEnter={() => handleCommentPickerMouseEnter(reply._id)}
                                    onMouseLeave={handleCommentPickerMouseLeave}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleReactToComment(reply._id, 'LIKE')}
                                      className={`hover:text-blue-600 transition-colors ${
                                        getMyCommentReaction(reply.reactions) ? 'text-blue-600 font-bold' : ''
                                      }`}
                                    >
                                      {getMyCommentReaction(reply.reactions)
                                        ? REACTION_LABELS[getMyCommentReaction(reply.reactions)!]
                                        : 'Thích'}
                                    </button>

                                    {/* Emoji Picker Popup */}
                                    {activeCommentPickerId === reply._id && (
                                      <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1.5 bg-white border border-gray-100 shadow-lg rounded-full px-2 py-1 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                        {(['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as ReactionType[]).map((type) => (
                                          <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleReactToComment(reply._id, type)}
                                            className="hover:scale-125 transition-transform text-sm cursor-pointer p-0.5"
                                            title={REACTION_LABELS[type]}
                                          >
                                            {REACTION_EMOJI[type]}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => {
                                      setReplyingToId(comment._id);
                                      const name = replyUser?.fullName || "Người dùng";
                                      setReplyText(`@${name} `);
                                    }}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    Trả lời
                                  </button>
                                  {(isReplyOwner || isOwner) && (
                                    <button
                                      onClick={() => handleDeleteComment(reply._id)}
                                      className="hover:text-red-600 transition-colors"
                                    >
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline reply edit input */}
                    {replyingToId === comment._id && (
                      <form
                        onSubmit={(e) => handleAddReply(e, comment._id)}
                        className="pl-11 pr-2 mt-1 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150"
                      >
                        {replyFilePreview && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                            <img src={replyFilePreview} alt="Reply upload preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setReplyFile(null);
                                setReplyFilePreview(null);
                              }}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                            >
                              <XMarkIcon className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 flex items-center bg-gray-50 hover:bg-gray-100 focus-within:bg-white border border-gray-100 focus-within:border-blue-500 rounded-full px-3 py-1 transition-all">
                            <input
                              type="text"
                              placeholder="Trả lời bình luận..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              disabled={submittingReply}
                              className="flex-1 bg-transparent text-xs focus:outline-none px-1 py-0.5"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => replyFileInputRef.current?.click()}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded-full transition-colors shrink-0"
                              title="Đính kèm ảnh"
                            >
                              <CameraIcon className="w-4 h-4" />
                            </button>
                            <input
                              type="file"
                              ref={replyFileInputRef}
                              onChange={handleReplyFileChange}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={(!replyText.trim() && !replyFile) || submittingReply}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors px-2 flex items-center gap-1 shrink-0"
                          >
                            {submittingReply ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                            ) : (
                              "Gửi"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyFile(null);
                              setReplyFilePreview(null);
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Overlay */}
      {renderLightbox()}

      {/* Zalo-style Reactions Evaluators Modal */}
      {showReactionsModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-5 duration-200">
            {/* Header with pull bar */}
            <div className="flex flex-col items-center pt-3 pb-2 border-b border-gray-100 dark:border-zinc-800 relative">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mb-3" />
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {reactionCount} người bày tỏ cảm xúc
              </h3>
              <button 
                onClick={() => setShowReactionsModal(false)}
                className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 text-sm font-semibold p-1"
              >
                Đóng
              </button>
            </div>

            {/* Warning line */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 px-5 py-3 text-xs text-gray-500 border-b border-gray-100 dark:border-zinc-800">
              Bạn chỉ xem được cảm xúc của bạn bè Zalo
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {loadingReactionsModal ? (
                <div className="py-10 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                (() => {
                  // Phân loại bạn bè & người lạ
                  const friendReactors = reactions.filter((r) => {
                    return r.userId === currentUserId || friendsList.includes(r.userId);
                  });
                  const strangerCount = reactions.length - friendReactors.length;

                  return (
                    <>
                      {friendReactors.map((reactor) => {
                        const prof = reactionsProfiles[reactor.userId];
                        const isMe = reactor.userId === currentUserId;
                        return (
                          <div key={reactor.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shrink-0 relative">
                                <img
                                  src={getAvatar(prof?.avatar, prof?.fullName)}
                                  alt="Reactor avatar"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 right-0 text-[10px] bg-white shadow-xs rounded-full p-0.5">
                                  {REACTION_EMOJI[reactor.type]}
                                </span>
                              </div>
                              <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100">
                                {isMe ? "Bạn (Tôi)" : prof?.fullName || "Người dùng"}
                              </span>
                            </div>
                            {!isMe && (
                              <Link 
                                href={`/chat/${reactor.userId}`}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-full transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </Link>
                            )}
                          </div>
                        );
                      })}

                      {/* Strangers aggregated line */}
                      {strangerCount > 0 && (
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-gray-200 dark:border-zinc-700 shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-[14px] text-gray-500">
                            {strangerCount} người khác
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for zoomed comment images */}
      {zoomedCommentImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xs cursor-zoom-out"
          onClick={() => setZoomedCommentImage(null)}
        >
          <button 
            type="button"
            onClick={() => setZoomedCommentImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
          <img 
            src={getAvatar(zoomedCommentImage)} 
            alt="Comment zoom" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg animate-in zoom-in-95 duration-200" 
          />
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5 text-blue-600" />
                Chỉnh sửa bài viết
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
              {/* Privacy selector */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quyền riêng tư</span>
                <select
                  value={editPrivacy}
                  onChange={(e) => setEditPrivacy(e.target.value as any)}
                  className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-xs rounded-full px-3 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="FRIENDS_ONLY">👥 Bạn bè</option>
                  <option value="PRIVATE">🔒 Chỉ mình tôi</option>
                </select>
              </div>

              {/* Text Area */}
              <textarea
                placeholder="Bạn đang nghĩ gì?"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={editSubmitting}
                className="w-full focus:outline-none resize-none bg-transparent text-base text-gray-800 dark:text-gray-100 min-h-[100px] placeholder:text-gray-400"
                maxLength={2000}
              />

              {/* Media Previews */}
              {editPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {editPreviews.map((preview, index) => (
                    <div key={index} className="aspect-square relative bg-gray-50 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-700 group">
                      {preview.isVideo ? (
                        <video src={preview.url} className="w-full h-full object-cover" preload="metadata" />
                      ) : (
                        <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                      )}
                      {preview.isExisting && (
                        <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                          Hiện tại
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!preview.isExisting) URL.revokeObjectURL(preview.url);
                          setEditPreviews((prev) => prev.filter((_, i) => i !== index));
                          if (!preview.isExisting) {
                            // Find and remove corresponding new file
                            const newFileIndex = editPreviews.filter((p, i) => !p.isExisting && i < index).length;
                            setEditFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
                          }
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add media button */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Thêm ảnh/video</span>
                <label className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-full text-blue-600 transition-colors cursor-pointer">
                  <PhotoIcon className="w-5 h-5" />
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setEditFiles((prev) => [...prev, ...newFiles]);
                        const newPreviews = newFiles.map((file) => ({
                          url: URL.createObjectURL(file),
                          isVideo: file.type.startsWith("video/"),
                          name: file.name,
                          isExisting: false,
                        }));
                        setEditPreviews((prev) => [...prev, ...newPreviews]);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={editSubmitting || (!editContent.trim() && editPreviews.length === 0)}
                className="w-full py-3 rounded-full bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-zinc-700 hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                {editSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang cập nhật...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
