"use client";
import React, { useState, useEffect, useRef } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { postService, IStoryGroup, IStoryViewer } from "@/services/postService";
import { userService, UserProfileDTO } from "@/services/userService";
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";
import StoryArchiveModal from "./StoryArchiveModal";

// Cache thông tin user
const userCache: Record<string, UserProfileDTO> = {};

interface StoryBarProps {
  onStoryCreated?: () => void;
}

export default function StoryBar({ onStoryCreated }: StoryBarProps) {
  const currentUserId = useAuthStore((state) => state.userId);
  const { user: currentUser } = useAuthStore();
  const [storyGroups, setStoryGroups] = useState<IStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileDTO>>({});

  // Viewer state
  const [viewingGroupIndex, setViewingGroupIndex] = useState<number | null>(null);

  // Create story modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch story feed
  useEffect(() => {
    fetchStoryFeed();
  }, []);

  // 3.1 Real-time story synchronization
  useEffect(() => {
    const unsubscribeNew = socketService.onNewStoryReceived((newStory) => {
      console.log("🚀 [Real-time] Nhận được Story mới từ bạn bè:", newStory);
      fetchStoryFeed();
    });

    const unsubscribeDelete = socketService.onStoryDeletedReceived((data) => {
      console.log("🚀 [Real-time] Bạn bè đã xóa Story:", data.storyId);
      fetchStoryFeed();
    });

    const unsubscribeViewed = socketService.onStoryViewed((data) => {
      console.log("🚀 [Real-time] Story viewed:", data);
      setStoryGroups((prevGroups) => {
        return prevGroups.map((group) => {
          return {
            ...group,
            stories: group.stories.map((story) => {
              if (story._id === data.storyId) {
                fetchUserProfileBackground(data.viewerId);
                return {
                  ...story,
                  viewers: data.viewers || story.viewers,
                  viewCount: data.viewCount,
                };
              }
              return story;
            }),
          };
        });
      });
    });

    const unsubscribeReacted = socketService.onStoryReacted((data) => {
      console.log("🚀 [Real-time] Story reacted:", data);
      setStoryGroups((prevGroups) => {
        return prevGroups.map((group) => {
          return {
            ...group,
            stories: group.stories.map((story) => {
              if (story._id === data.storyId) {
                return {
                  ...story,
                  reactions: data.reactions,
                  reactionCount: data.reactionCount,
                };
              }
              return story;
            }),
          };
        });
      });
    });

    return () => {
      unsubscribeNew();
      unsubscribeDelete();
      unsubscribeViewed();
      unsubscribeReacted();
    };
  }, []);

  const fetchUserProfileBackground = async (uid: string) => {
    if (userCache[uid] || userProfiles[uid]) return;
    try {
      const prof = await userService.getUserById(uid);
      if (prof) {
        userCache[uid] = prof;
        setUserProfiles((prev) => ({ ...prev, [uid]: prof }));
      }
    } catch { /* bỏ qua */ }
  };

  const fetchStoryFeed = async () => {
    setLoading(true);
    try {
      const groups = await postService.getStoryFeed();
      setStoryGroups(groups);

      // Fetch user profiles
      const userIds = groups.map((g) => g.userId);
      const profiles: Record<string, UserProfileDTO> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          if (userCache[uid]) {
            profiles[uid] = userCache[uid]!;
            return;
          }
          try {
            const prof = await userService.getUserById(uid);
            if (prof) {
              userCache[uid] = prof;
              profiles[uid] = prof;
            }
          } catch { /* bỏ qua */ }
        })
      );
      setUserProfiles(profiles);
    } catch (error) {
      console.error("Error fetching story feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  // Kiểm tra story đã xem chưa
  const hasUnviewedStories = (group: IStoryGroup) => {
    if (!currentUserId) return true;
    return group.stories.some(
      (s) => !s.viewers.some((v) => v.userId?.toLowerCase() === currentUserId.toLowerCase())
    );
  };

  const handleStoryCreated = () => {
    fetchStoryFeed();
    if (onStoryCreated) onStoryCreated();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
              <div className="w-12 h-2.5 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tách nhóm story của bản thân ra đầu
  const myGroup = storyGroups.find((g) => g.userId?.toLowerCase() === currentUserId?.toLowerCase());
  const otherGroups = storyGroups.filter((g) => g.userId?.toLowerCase() !== currentUserId?.toLowerCase());

  return (
    <>
      <div className="bg-white dark:bg-zinc-950 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto scrollbar-hide py-1.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Nút tạo Story / Story của mình */}
          <div
            onClick={() => {
              if (myGroup && myGroup.stories.length > 0) {
                const idx = storyGroups.findIndex((g) => g.userId?.toLowerCase() === currentUserId?.toLowerCase());
                setViewingGroupIndex(idx >= 0 ? idx : null);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="w-[90px] h-[120px] rounded-2xl overflow-hidden relative shrink-0 cursor-pointer shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 group"
          >
            {myGroup && myGroup.stories.length > 0 ? (
              <>
                {myGroup.stories[0]?.mediaType === "VIDEO" ? (
                  <video src={myGroup.stories[0]?.mediaUrl} className="w-full h-full object-cover" preload="metadata" />
                ) : (
                  <img
                    src={myGroup.stories[0]?.mediaUrl}
                    alt="My story thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* User details overlay at bottom */}
                <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1 z-10">
                  {/* Floating Avatar with Active Ring */}
                  <div className={`w-8 h-8 rounded-full overflow-hidden p-0.5 shadow-md ${
                    hasUnviewedStories(myGroup)
                      ? "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500"
                      : "bg-gray-400"
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden border border-white">
                      <img
                        src={getAvatar(currentUser?.avatar, currentUser?.fullName)}
                        alt="My avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-white truncate max-w-[76px] tracking-wide text-center">
                    Bạn
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Blurred avatar as background */}
                <div className="absolute inset-0 bg-slate-900 overflow-hidden">
                  <img
                    src={getAvatar(currentUser?.avatar, currentUser?.fullName)}
                    alt="My avatar background"
                    className="w-full h-full object-cover blur-md opacity-40 scale-110"
                  />
                </div>
                {/* Blue circular button with pencil icon in the center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10 bg-black/20">
                  <div className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-110">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-white tracking-wide select-none drop-shadow-sm">
                    Tạo mới
                  </span>
                </div>
              </>
            )}
            
            {/* Small creation shortcut in top corner if stories exist */}
            {myGroup && myGroup.stories.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center border border-white shadow-lg z-20 transition-transform hover:scale-110"
                title="Tạo story mới"
              >
                <PlusIcon className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Nút Kho lưu trữ */}
          <div
            onClick={() => setShowArchiveModal(true)}
            className="w-[90px] h-[120px] rounded-2xl overflow-hidden relative shrink-0 cursor-pointer shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-800 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center gap-1.5 group transition-all"
          >
            <div className="w-9 h-9 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-slate-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 tracking-wide select-none text-center">
              Kho lưu trữ
            </span>
          </div>

          {/* Stories của bạn bè */}
          {otherGroups.map((group) => {
            const profile = userProfiles[group.userId];
            const unviewed = hasUnviewedStories(group);
            const globalIdx = storyGroups.findIndex((g) => g.userId === group.userId);
            const latestStory = group.stories[0];

            return (
              <div
                key={group.userId}
                onClick={() => setViewingGroupIndex(globalIdx)}
                className="w-[90px] h-[120px] rounded-2xl overflow-hidden relative shrink-0 cursor-pointer shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 group"
              >
                {/* Story Background (Image/Video thumbnail) */}
                {latestStory ? (
                  latestStory.mediaType === "VIDEO" ? (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                      <video src={latestStory.mediaUrl} className="w-full h-full object-cover" preload="metadata" />
                    </div>
                  ) : (
                    <img
                      src={latestStory.mediaUrl}
                      alt="Story thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-blue-500" />
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Overlay user details & avatar */}
                <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1 z-10">
                  {/* Floating Avatar with Active Ring */}
                  <div className={`w-8 h-8 rounded-full overflow-hidden p-0.5 shadow-md ${
                    unviewed
                      ? "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500"
                      : "bg-gray-400"
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden border border-white">
                      <img
                        src={getAvatar(profile?.avatar, profile?.fullName)}
                        alt={profile?.fullName || "User"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-white truncate max-w-[76px] tracking-wide text-center">
                    {profile?.fullName?.split(" ").pop() || "..."}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {viewingGroupIndex !== null && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={viewingGroupIndex}
          userProfiles={userProfiles}
          onClose={() => setViewingGroupIndex(null)}
          onStoryDeleted={(storyId) => {
            setStoryGroups((prevGroups) => {
              return prevGroups
                .map((group) => {
                  return {
                    ...group,
                    stories: group.stories.filter((story) => story._id !== storyId),
                  };
                })
                .filter((group) => group.stories.length > 0);
            });
          }}
          onStoryViewed={(storyId, viewers, viewCount) => {
            setStoryGroups((prevGroups) => {
              return prevGroups.map((group) => {
                return {
                  ...group,
                  stories: group.stories.map((story) => {
                    if (story._id === storyId) {
                      return {
                        ...story,
                        viewers,
                        viewCount,
                      };
                    }
                    return story;
                  }),
                };
              });
            });
          }}
          onStoryReacted={(storyId, reactions, reactionCount) => {
            setStoryGroups((prevGroups) => {
              return prevGroups.map((group) => {
                return {
                  ...group,
                  stories: group.stories.map((story) => {
                    if (story._id === storyId) {
                      return {
                        ...story,
                        reactions,
                        reactionCount,
                      };
                    }
                    return story;
                  }),
                };
              });
            });
          }}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onStoryCreated={handleStoryCreated}
      />

      {/* Story Archive Modal */}
      <StoryArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onStoryReposted={handleStoryCreated}
      />
    </>
  );
}
