"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  PhotoIcon, 
  ChevronRightIcon, 
  UserGroupIcon,
  SparklesIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";
import { postService, IPost, INotification } from "@/services/postService";
import { contactService, FriendshipResponseDTO } from "@/services/contactService";
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import StoryBar from "@/components/feed/StoryBar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function FeedPageContent() {
  const { user: currentUser } = useAuthStore();
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("postId");
  const [posts, setPosts] = useState<IPost[]>([]);
  const [friends, setFriends] = useState<FriendshipResponseDTO[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 10;

  // Infinite scroll sentinel ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Target Post Scroll Effect
  useEffect(() => {
    if (!targetPostId) return;

    const loadAndScrollToTargetPost = async () => {
      const alreadyInList = posts.some((p) => p._id === targetPostId);
      if (alreadyInList) {
        const element = document.getElementById(`post-${targetPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-blue-500", "ring-offset-2", "duration-1000");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
          }, 4000);
        }
        return;
      }

      try {
        const targetPost = await postService.getPostDetails(targetPostId);
        if (targetPost) {
          setPosts((prev) => {
            if (prev.some((p) => p._id === targetPostId)) return prev;
            return [targetPost, ...prev];
          });

          setTimeout(() => {
            const element = document.getElementById(`post-${targetPostId}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
              element.classList.add("ring-2", "ring-blue-500", "ring-offset-2", "duration-1000");
              setTimeout(() => {
                element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
              }, 4000);
            }
          }, 800);
        }
      } catch (err) {
        console.error("Failed to load target post from notification:", err);
      }
    };

    if (posts.length > 0) {
      loadAndScrollToTargetPost();
    }
  }, [targetPostId, posts.length]);

  // Fetch initial data & setup socket listeners
  useEffect(() => {
    loadHomeFeed(true);
    loadFriendsList();

    // Kết nối socket và lắng nghe bài đăng mới từ bạn bè thời gian thực
    socketService.connect();

    const unsubscribeNewPost = socketService.onNewPostReceived((newPost: IPost) => {
      console.log("🚀 [Real-time] Nhận được bài viết mới từ bạn bè:", newPost);
      setPosts((prev) => [newPost, ...prev]);
    });

    const unsubscribeInteraction = socketService.onPostInteraction((data) => {
      console.log(`🚀 [Real-time] Nhận tương tác cho bài viết ${data.postId}:`, data.eventType);
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
      console.log("🚀 [Real-time] Bạn bè đã xóa bài viết:", data.postId);
      setPosts((prev) => prev.filter((p) => p._id !== data.postId));
    });

    return () => {
      unsubscribeNewPost();
      unsubscribeInteraction();
      unsubscribeDeletePost();
    };
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingPosts) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingPosts) {
          loadHomeFeed(false);
        }
      },
      { threshold: 0.1 }
    );
    const current = loadMoreRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, [hasMore, loadingPosts, skip]);

  // Load home feed posts
  const loadHomeFeed = async (reset = false) => {
    setLoadingPosts(true);
    try {
      const currentSkip = reset ? 0 : skip;
      const data = await postService.getHomeFeed(limit, currentSkip);
      
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
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load friends list for sidebar widget
  const loadFriendsList = async () => {
    setLoadingFriends(true);
    try {
      const list = await contactService.getFriendsList();
      // Only keep accepted friends
      const accepted = list.filter((f) => f.status === "ACCEPTED");
      setFriends(accepted);
    } catch (error) {
      console.error("Error loading friends list:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Handle post deletion success
  const handleDeleteSuccess = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  // Handle post like updates
  const handleLikeUpdate = (updatedPost: IPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handleEditSuccess = (updatedPost: IPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50/50">
      {/* Top Navbar */}
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Nhật ký</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Kết nối & Chia sẻ</span>
          </div>
        </div>
      </div>

      {/* Scrollable feed container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 md:px-8 py-4 md:py-6 flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Middle Column: Feed list */}
          <div className="flex-1 max-w-2xl flex flex-col gap-5">
            {/* Story Bar */}
            <StoryBar />

            {/* Quick Post Card */}
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
                  Hôm nay bạn thế nào, {currentUser?.fullName?.split(" ").pop()}?
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-xl hover:bg-gray-50"
                >
                  <PhotoIcon className="w-5 h-5 text-green-500" />
                  <span>Ảnh / Video</span>
                </button>
                <span className="text-[10px] text-gray-400 font-medium">Chia sẻ với Bạn bè & Công khai</span>
              </div>
            </div>

            {/* Posts List */}
            {posts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onDeleteSuccess={handleDeleteSuccess}
                    onLikeUpdate={handleLikeUpdate}
                    onEditSuccess={handleEditSuccess}
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
              </div>
            ) : loadingPosts ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-400 font-semibold">Đang tải nhật ký...</span>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <BookOpenIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Nhật ký trống</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Chưa có bài đăng nào trên Nhật ký. Hãy là người đầu tiên chia sẻ trạng thái của bạn nhé!
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Đăng bài viết đầu tiên
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Profile widget & Friend list */}
          <div className="hidden lg:flex w-[320px] flex-col gap-6 shrink-0 sticky top-6">
            {/* Profile Card */}
            <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100/50 rounded-3xl p-5 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                <img
                  src={getAvatar(currentUser?.avatar, currentUser?.fullName)}
                  alt="My avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="font-bold text-gray-900 mt-3 text-base">{currentUser?.fullName}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{currentUser?.email || currentUser?.phoneNumber}</p>

              <Link
                href={`/profile/timeline?userId=${currentUser?.id || currentUser?._id}`}
                className="mt-4 w-full py-2 bg-white border border-blue-100 hover:border-blue-200 hover:bg-blue-50/20 text-xs font-bold text-blue-600 rounded-full transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Trang cá nhân của bạn</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Friends Widget */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-700">Bạn bè ({friends.length})</span>
                </div>
                <Link href="/contacts" className="text-[10px] font-bold text-blue-600 hover:text-blue-700">
                  Xem tất cả
                </Link>
              </div>

              <div className="space-y-3.5 max-h-[350px] overflow-y-auto custom-scrollbar">
                {loadingFriends ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                ) : friends.length > 0 ? (
                  friends.map((friend: any) => {
                    const isRequester = friend.requesterId === currentUser?.id || friend.requesterId === currentUser?._id;
                    const friendName = isRequester ? friend.recipientName : friend.requesterName;
                    const friendAvatar = isRequester ? friend.recipientAvatar : friend.requesterAvatar;
                    const friendId = isRequester ? friend.recipientId : friend.requesterId;

                    return (
                      <Link
                        key={friend.id}
                        href={`/profile/timeline?userId=${friendId}`}
                        className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-2xl transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-50 shadow-sm">
                          <img
                            src={getAvatar(friendAvatar, friendName)}
                            alt="Friend avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                          {friendName || "Người dùng"}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                    <p className="text-[10px] text-gray-400">Danh sách bạn bè trống.</p>
                    <Link
                      href="/contacts"
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Tìm thêm bạn bè mới
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal Overlay */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={(newPost) => {
          loadHomeFeed(true);
        }}
      />
    </div>
  );
}

export default function FeedPage() {
  return (
    <React.Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-slate-50/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FeedPageContent />
    </React.Suspense>
  );
}
