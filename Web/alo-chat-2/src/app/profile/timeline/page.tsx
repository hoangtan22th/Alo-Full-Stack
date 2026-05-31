"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  CameraIcon, 
  PencilSquareIcon, 
  ChatBubbleLeftRightIcon, 
  UserPlusIcon, 
  UserMinusIcon,
  CheckIcon, 
  XMarkIcon, 
  ArrowPathIcon,
  SparklesIcon,
  GlobeAsiaAustraliaIcon,
  UsersIcon,
  LockClosedIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { userService, UserProfileDTO } from "@/services/userService";
import { postService, IPost, IStory, IStoryGroup } from "@/services/postService";
import StoryViewer from "@/components/feed/StoryViewer";
import { contactService } from "@/services/contactService";
import { groupService } from "@/services/groupService";
import { useAuthStore } from "@/store/useAuthStore";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import ProfileModal from "@/components/ui/ProfileModal";
import axiosClient from "@/services/api";
import { socketService } from "@/services/socketService";

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser, fetchProfile } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Post/Feed States
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 10;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [friendCount, setFriendCount] = useState(0);
  
  // Modals & Actions State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Friendship state
  const [relation, setRelation] = useState<{ status: string; friendshipId: string | null }>({
    status: "NOT_FRIEND",
    friendshipId: null
  });
  const [relationLoading, setRelationLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState("Xin chào, mình kết bạn nhé!");

  const currentUserId = currentUser?.id || currentUser?._id;
  const isMe = !userId || userId === currentUserId;

  const [userStories, setUserStories] = useState<IStory[]>([]);
  const [viewingStoryGroupIndex, setViewingStoryGroupIndex] = useState<number | null>(null);

  const hasUnviewed = userStories.some(
    (s) => !s.viewers?.some((v) => v.userId?.toLowerCase() === currentUserId?.toLowerCase())
  );

  // Resolve target userId
  useEffect(() => {
    const paramId = searchParams.get("userId");
    if (paramId) {
      setUserId(paramId);
    } else if (currentUserId) {
      setUserId(currentUserId);
    }
  }, [searchParams, currentUserId]);

  const loadUserStories = async () => {
    try {
      const stories = await postService.getUserStories(userId);
      setUserStories(stories || []);
    } catch (err) {
      console.error("Lỗi tải story người dùng:", err);
    }
  };

  // Load profile, posts, and relation status
  useEffect(() => {
    if (!userId) return;
    loadUserProfile();
    loadUserTimeline(true);
    loadUserStories();
    loadFriendCount();
    if (!isMe) {
      loadRelationStatus();
    }
  }, [userId]);

  // Setup real-time socket events for Timeline
  useEffect(() => {
    socketService.connect();

    const unsubscribeInteraction = socketService.onPostInteraction((data) => {
      console.log(`🚀 [Real-time Timeline] Nhận tương tác cho bài viết ${data.postId}:`, data.eventType);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== data.postId) return p;

          if (data.eventType === "POST_REACTED") {
            return {
              ...p,
              reactions: data.payload.reactions || [],
              reactionCount: data.payload.reactionCount || 0,
              likes: data.payload.likes || [],
              likeCount: data.payload.likeCount || 0,
            };
          }
          if (data.eventType === "COMMENT_ADDED") {
            return {
              ...p,
              commentCount: (p.commentCount || 0) + 1,
            };
          }
          if (data.eventType === "COMMENT_DELETED") {
            return {
              ...p,
              commentCount: Math.max(0, (p.commentCount || 0) - (data.payload.deletedCount || 1)),
            };
          }
          return p;
        })
      );
    });

    const unsubscribeDeletePost = socketService.onPostDeletedReceived((data) => {
      console.log("🚀 [Real-time Timeline] Bạn bè đã xóa bài viết:", data.postId);
      setPosts((prev) => prev.filter((p) => p._id !== data.postId));
    });

    return () => {
      unsubscribeInteraction();
      unsubscribeDeletePost();
    };
  }, []);

  // Infinite scroll observer for timeline
  useEffect(() => {
    if (!hasMore || loadingPosts) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingPosts) {
          loadUserTimeline(false);
        }
      },
      { threshold: 0.1 }
    );
    const current = loadMoreRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, [hasMore, loadingPosts, skip, userId]);

  const loadUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await userService.getUserById(userId);
      setProfile(data);
    } catch (err) {
      toast.error("Không thể tải thông tin trang cá nhân");
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadUserTimeline = async (reset = false) => {
    setLoadingPosts(true);
    try {
      const currentSkip = reset ? 0 : skip;
      const data = await postService.getUserTimeline(userId, limit, currentSkip);
      
      if (reset) {
        setPosts(data || []);
        setSkip(data.length);
      } else {
        setPosts((prev) => [...prev, ...data]);
        setSkip((prev) => prev + data.length);
      }

      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error("Lỗi tải dòng thời gian:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadRelationStatus = async () => {
    try {
      const res: any = await axiosClient.get(`/contacts/relation-status`, {
        params: { targetUserId: userId }
      });
      const data = res?.data || res;
      setRelation({
        status: data.relationStatus,
        friendshipId: data.friendshipId,
      });
    } catch (error) {
      console.warn("Chưa cấu hình API relation-status hoặc lỗi kết nối");
    }
  };

  const loadFriendCount = async () => {
    try {
      const list = await contactService.getFriendsList();
      const accepted = list.filter((f: any) => f.status === "ACCEPTED");
      setFriendCount(accepted.length);
    } catch { /* ignore */ }
  };

  // Avatar and cover image upload handlers
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const updated = await userService.updateMyAvatar(file);
      if (updated) {
        toast.success("Cập nhật ảnh đại diện thành công!");
        await fetchProfile(); // Sync app-wide Zustand store
        await loadUserProfile(); // Sync local state profile
      }
    } catch (err) {
      toast.error("Lỗi tải lên ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const updated = await userService.updateMyCover(file);
      if (updated) {
        toast.success("Cập nhật ảnh bìa thành công!");
        await fetchProfile();
        await loadUserProfile();
      }
    } catch (err) {
      toast.error("Lỗi tải lên ảnh bìa");
    } finally {
      setUploadingCover(false);
    }
  };

  // Friend actions logic
  const handleAddFriend = async () => {
    setRelationLoading(true);
    try {
      await axiosClient.post("/contacts/request", {
        recipientId: userId,
        greetingMessage,
      });
      toast.success("Đã gửi lời mời kết bạn!");
      setIsAdding(false);
      await loadRelationStatus();
    } catch (err) {
      toast.error("Gửi yêu cầu thất bại");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    setRelationLoading(true);
    try {
      await axiosClient.delete(`/contacts/request/revoke/${userId}`);
      toast.success("Đã thu hồi lời mời kết bạn");
      await loadRelationStatus();
    } catch (err) {
      toast.error("Thao tác thất bại");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!relation.friendshipId) return;
    setRelationLoading(true);
    try {
      await axiosClient.put(`/contacts/${relation.friendshipId}/accept`);
      toast.success("Đã trở thành bạn bè!");
      await loadRelationStatus();
      
      // Navigate to chat after accepting
      const convo = await groupService.createDirectConversation(userId);
      const convoId = convo?._id || convo?.id || convo?.data?._id || convo?.data?.id;
      if (convoId) {
        router.push(`/chat/${convoId}`);
      }
    } catch (err) {
      toast.error("Thao tác thất bại");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!relation.friendshipId) return;
    setRelationLoading(true);
    try {
      await axiosClient.delete(`/contacts/${relation.friendshipId}/decline`);
      toast.success("Đã từ chối lời mời");
      await loadRelationStatus();
    } catch (err) {
      toast.error("Thao tác thất bại");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (window.confirm("Bạn có chắc muốn hủy kết bạn với người này?")) {
      setRelationLoading(true);
      try {
        await axiosClient.delete(`/contacts/friend/${userId}`);
        toast.success("Đã hủy kết bạn");
        await loadRelationStatus();
      } catch (err) {
        toast.error("Không thể hủy kết bạn lúc này");
      } finally {
        setRelationLoading(false);
      }
    }
  };

  const handleStartMessage = async () => {
    setRelationLoading(true);
    try {
      const convo = await groupService.createDirectConversation(userId);
      const convoId = convo?._id || convo?.id || convo?.data?._id || convo?.data?.id;
      if (convoId) {
        router.push(`/chat/${convoId}`);
      } else {
        toast.error("Không tìm thấy phòng chat");
      }
    } catch (err) {
      toast.error("Lỗi khi tạo hội thoại");
    } finally {
      setRelationLoading(false);
    }
  };

  // Profile fields formatting helpers
  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  const getCoverImage = (url?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return "/black.jpg";
  };

  // Callbacks for PostCard updates
  const handleDeletePostSuccess = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  const handleLikePostUpdate = (updatedPost: IPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handleEditPostSuccess = (updatedPost: IPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  if (loadingProfile && !profile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-400 font-semibold">Đang tải trang cá nhân...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50/50 flex flex-col">
      {/* 1. COVER PHOTO */}
      <div className="h-64 md:h-80 w-full relative bg-gray-900 overflow-hidden shrink-0">
        <img
          src={getCoverImage(profile?.coverImage)}
          alt="Profile cover"
          className="w-full h-full object-cover opacity-80"
        />
        {isMe && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-4 right-8 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold rounded-full transition-all active:scale-95 shadow-lg flex items-center gap-1.5"
            >
              <CameraIcon className="w-4 h-4" />
              <span>{uploadingCover ? "Đang tải lên..." : "Thay đổi ảnh bìa"}</span>
            </button>
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverChange}
              accept="image/*"
              className="hidden"
            />
          </>
        )}
      </div>

      {/* 2. PROFILE HERO & HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 px-8 pb-6 shrink-0 shadow-sm relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar frame (Pulled up) */}
          <div className="relative -mt-16 md:-mt-20 shrink-0">
            {userStories.length > 0 ? (
              <div 
                onClick={() => setViewingStoryGroupIndex(0)}
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full p-[3.5px] shadow-xl relative cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
                  hasUnviewed
                    ? "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500"
                    : "bg-gray-300 dark:bg-zinc-700"
                }`}
              >
                <div className="w-full h-full rounded-full border-[3px] border-white dark:border-zinc-950 overflow-hidden bg-gray-200 relative">
                  <img
                    src={getAvatar(profile?.avatar, profile?.fullName)}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                {isMe && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      avatarInputRef.current?.click();
                    }}
                    className="absolute bottom-1.5 right-1.5 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full border-2 border-white shadow-md transition-all active:scale-90"
                    title="Thay đổi ảnh đại diện"
                  >
                    <CameraIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-xl relative">
                <img
                  src={getAvatar(profile?.avatar, profile?.fullName)}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
                {isMe && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-1.5 right-1.5 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full border-2 border-white shadow-md transition-all active:scale-90"
                    title="Thay đổi ảnh đại diện"
                  >
                    <CameraIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}
              </div>
            )}
            {isMe && (
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            )}
          </div>

          {/* User information & Actions Row (Starts below cover photo) */}
          <div className="flex-1 text-center md:text-left flex flex-col md:flex-row md:items-start justify-between gap-6 pt-3 md:pt-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <h1 className="text-2xl font-black text-gray-900">{profile?.fullName}</h1>
                {isMe && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Bạn
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 font-semibold">{profile?.email || profile?.phoneNumber}</p>
              {friendCount > 0 && (
                <p className="text-xs text-gray-500 mt-1 font-semibold flex items-center justify-center md:justify-start gap-1">
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>{friendCount} bạn bè</span>
                </p>
              )}
              {profile?.bio && (
                <p className="text-sm text-gray-600 mt-3 max-w-lg italic font-medium">
                  "{profile.bio}"
                </p>
              )}
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2">
              {isMe ? (
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  {/* Messages Button */}
                  <button
                    onClick={handleStartMessage}
                    disabled={relationLoading}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    <span>Nhắn tin</span>
                  </button>

                  {/* Relationship actions */}
                  {relation.status === "ACCEPTED" ? (
                    <button
                      onClick={handleRemoveFriend}
                      disabled={relationLoading}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-full transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <UserMinusIcon className="w-4 h-4" />
                      <span>Hủy kết bạn</span>
                    </button>
                  ) : relation.status === "I_SENT_REQUEST" || relation.status === "YOU_SENT_REQUEST" ? (
                    <button
                      onClick={handleRevokeRequest}
                      disabled={relationLoading}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>Thu hồi lời mời</span>
                    </button>
                  ) : relation.status === "THEY_SENT_REQUEST" ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleAcceptRequest}
                        disabled={relationLoading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>Chấp nhận</span>
                      </button>
                      <button
                        onClick={handleDeclineRequest}
                        disabled={relationLoading}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-full transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                      >
                        <span>Từ chối</span>
                      </button>
                    </div>
                  ) : (
                    // Not Friend
                    <div className="flex flex-col relative">
                      {isAdding ? (
                        <div className="absolute right-0 bottom-12 bg-white p-3 rounded-2xl border border-gray-100 shadow-xl z-20 w-64 flex flex-col gap-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Lời nhắn kết bạn
                          </label>
                          <textarea
                            value={greetingMessage}
                            onChange={(e) => setGreetingMessage(e.target.value)}
                            className="bg-gray-50 border-0 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-14"
                          />
                          <div className="flex gap-1.5 mt-1 justify-end">
                            <button
                              onClick={() => setIsAdding(false)}
                              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-2 py-1"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleAddFriend}
                              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1"
                            >
                              Gửi lời mời
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <button
                        onClick={() => setIsAdding(true)}
                        disabled={relationLoading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        <span>Kết bạn</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TIMELINE POSTS & DETAILS TAB SECTION */}
      <div className="max-w-6xl mx-auto w-full px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Widget Pane: Details information card */}
        <div className="w-full lg:w-[350px] bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-5 shrink-0">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span>Giới thiệu</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <span className="text-xs text-gray-400 block">Giới tính</span>
                <span className="font-semibold text-gray-800">
                  {({
                    MALE: "Nam",
                    FEMALE: "Nữ",
                    OTHER: "Khác",
                    PREFER_NOT_TO_SAY: "Khác",
                  } as Record<string, string>)[profile?.gender || ""] || "Bảo mật"}
                </span>
              </div>
            </div>

            {profile?.dateOfBirth && (
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-xs text-gray-400 block">Ngày sinh</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(profile.dateOfBirth).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <span className="text-xs text-gray-400 block">Số điện thoại</span>
                <span className="font-semibold text-gray-800">{profile?.phoneNumber || "Bảo mật"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <span className="text-xs text-gray-400 block">Thư điện tử</span>
                <span className="font-semibold text-gray-800 break-all">{profile?.email || "Bảo mật"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Posting Area & User Posts Feed */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          {/* Quick Post Box (only on own profile) */}
          {isMe && (
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <img
                    src={getAvatar(currentUser?.avatar, currentUser?.fullName)}
                    alt="My avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-1 text-left text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors rounded-full px-5 py-2.5 border border-gray-50 focus:outline-none"
                >
                  Nghĩ điều gì đó và đăng lên trang cá nhân...
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-xl hover:bg-gray-50"
                >
                  <CameraIcon className="w-5 h-5 text-blue-500" />
                  <span>Đăng ảnh / video mới</span>
                </button>
                <span className="text-[10px] text-gray-400 font-medium">Bài đăng lưu trữ trên dòng thời gian</span>
              </div>
            </div>
          )}

          {/* Timeline Feed posts list */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest px-2 mb-1 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 text-blue-500" />
              <span>Dòng thời gian</span>
            </h2>

            {posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onDeleteSuccess={handleDeletePostSuccess}
                    onLikeUpdate={handleLikePostUpdate}
                    onEditSuccess={handleEditPostSuccess}
                  />
                ))}

                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-6">
                    {loadingPosts && (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-xs text-gray-400 font-semibold">Đang tải thêm...</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : loadingPosts ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-400 font-semibold">Đang tải dòng thời gian...</span>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Chưa có bài đăng nào</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    {isMe 
                      ? "Bạn chưa có khoảnh khắc nào. Hãy đăng bài viết mới để ghi lại những kỉ niệm nhé!" 
                      : "Người dùng này chưa chia sẻ khoảnh khắc nào công khai."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <ProfileModal
        isOpen={isEditProfileOpen}
        onClose={async () => {
          setIsEditProfileOpen(false);
          await loadUserProfile();
        }}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={async (newPost) => {
          loadUserTimeline(true);
        }}
      />

      {/* Story Viewer Modal */}
      {viewingStoryGroupIndex !== null && userStories.length > 0 && (
        <StoryViewer
          storyGroups={[
            {
              userId: userId,
              stories: userStories
            }
          ]}
          initialGroupIndex={viewingStoryGroupIndex}
          userProfiles={{
            [userId]: profile || (currentUser as UserProfileDTO)
          }}
          onClose={() => setViewingStoryGroupIndex(null)}
          onStoryDeleted={(storyId) => {
            setUserStories((prev) => prev.filter((s) => s._id !== storyId));
            setViewingStoryGroupIndex(null);
          }}
          onStoryViewed={(storyId, viewers, viewCount) => {
            setUserStories((prev) =>
              prev.map((s) => (s._id === storyId ? { ...s, viewers, viewCount } : s))
            );
          }}
          onStoryReacted={(storyId, reactions, reactionCount) => {
            setUserStories((prev) =>
              prev.map((s) => (s._id === storyId ? { ...s, reactions, reactionCount } : s))
            );
          }}
        />
      )}
    </div>
  );
}

export default function ProfileTimelinePage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-400 font-semibold">Đang tải trang cá nhân...</span>
      </div>
    }>
      <TimelineContent />
    </Suspense>
  );
}
