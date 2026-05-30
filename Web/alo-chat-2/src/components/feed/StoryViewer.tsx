"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, TrashIcon, MusicalNoteIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/solid";
import { postService, IStoryGroup, IStory, IReaction, ReactionType, REACTION_EMOJI, REACTION_LABELS, IStoryViewer } from "@/services/postService";
import { userService, UserProfileDTO } from "@/services/userService";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import { contactService } from "@/services/contactService";

interface StoryViewerProps {
  storyGroups: IStoryGroup[];
  initialGroupIndex: number;
  userProfiles: Record<string, UserProfileDTO>;
  onClose: () => void;
  onStoryViewed?: (storyId: string, viewers: IStoryViewer[], viewCount: number) => void;
  onStoryReacted?: (storyId: string, reactions: any[], reactionCount: number) => void;
  onStoryDeleted?: (storyId: string) => void;
}

const STORY_DURATION = 5000; // 5 giây mỗi story

export default function StoryViewer({
  storyGroups,
  initialGroupIndex,
  userProfiles,
  onClose,
  onStoryViewed,
  onStoryReacted,
  onStoryDeleted,
}: StoryViewerProps) {
  const currentUserId = useAuthStore((state) => state.userId);
  const { user: currentUser } = useAuthStore();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewerFilter, setViewerFilter] = useState<"ALL" | ReactionType>("ALL");
  const [localUserProfiles, setLocalUserProfiles] = useState<Record<string, UserProfileDTO>>({});
  const [panelTab, setPanelTab] = useState<"VIEWERS" | "REACTIONS">("VIEWERS");
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; left: number; delay: number }[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<number>(0);
  const fetchingUidsRef = useRef<Set<string>>(new Set());
  const storyMusicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset viewer filter when story changes
  useEffect(() => {
    setViewerFilter("ALL");
  }, [groupIndex, storyIndex]);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const currentProfile = currentGroup ? userProfiles[currentGroup.userId] : null;
  const isOwnStory = currentGroup?.userId?.toLowerCase() === currentUserId?.toLowerCase();

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && currentUserId) {
      const alreadyViewed = currentStory.viewers.some(
        (v) => v.userId?.toLowerCase() === currentUserId.toLowerCase()
      );
      if (!alreadyViewed) {
        // Optimistic update — immediately mark as viewed in parent state
        // so the ring turns gray without waiting for API
        if (onStoryViewed) {
          const optimisticViewers = [
            ...currentStory.viewers,
            { userId: currentUserId, viewedAt: new Date().toISOString() },
          ];
          onStoryViewed(currentStory._id, optimisticViewers, optimisticViewers.length);
        }

        // Then confirm with server
        postService.viewStory(currentStory._id)
          .then((updatedStory) => {
            if (updatedStory && onStoryViewed) {
              onStoryViewed(currentStory._id, updatedStory.viewers || [], updatedStory.viewCount || 0);
            }
          })
          .catch((err) => {
            console.error("Lỗi viewStory:", err);
          });
      }
    }
  }, [currentStory?._id, currentUserId]);

  // Fetch profiles of viewers & reactors (optimized with in-flight set to prevent duplicates)
  useEffect(() => {
    if (showViewers && currentStory) {
      const viewerUids = (currentStory.viewers || []).map((v) => v.userId);
      const reactionUids = (currentStory.reactions || []).map((r) => r.userId);
      const uidsToFetch = Array.from(new Set([...viewerUids, ...reactionUids]))
        .filter((uid) => !userProfiles[uid] && !localUserProfiles[uid] && !fetchingUidsRef.current.has(uid));

      if (uidsToFetch.length > 0) {
        uidsToFetch.forEach((uid) => fetchingUidsRef.current.add(uid));
        
        Promise.all(
          uidsToFetch.map(async (uid) => {
            try {
              const prof = await userService.getUserById(uid);
              if (prof) {
                setLocalUserProfiles((prev) => ({ ...prev, [uid]: prof }));
              }
            } catch (err) {
              console.error("Error fetching user profile:", uid, err);
            } finally {
              fetchingUidsRef.current.delete(uid);
            }
          })
        );
      }
    }
  }, [showViewers, currentStory?.viewers, currentStory?.reactions, userProfiles, localUserProfiles]);

  const handleReact = async (type: ReactionType) => {
    if (!currentUserId || !currentStory) return;

    // Trigger flying emojis animation Zalo-style
    const emojiSymbol = REACTION_EMOJI[type];
    const newFlying: any[] = [];
    for (let i = 0; i < 8; i++) {
      newFlying.push({
        id: Date.now() + Math.random(),
        emoji: emojiSymbol,
        left: 20 + Math.random() * 60, // random offset from 20% to 80%
        delay: Math.random() * 0.4,
      });
    }
    setFlyingEmojis((prev) => [...prev, ...newFlying]);

    // Clean up flying emojis after 2s
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((item) => !newFlying.some((n) => n.id === item.id)));
    }, 2000);

    // Optimistic local update — Additive: mỗi lần nhấn luôn thêm 1 reaction mới
    const reactions = currentStory.reactions || [];
    let newReactions = [...reactions, { userId: currentUserId, type }];

    if (onStoryReacted) {
      onStoryReacted(currentStory._id, newReactions, newReactions.length);
    }

    try {
      const updated = await postService.reactToStory(currentStory._id, type);
      if (updated) {
        if (onStoryReacted) {
          onStoryReacted(currentStory._id, updated.reactions || [], updated.reactionCount || 0);
        }
      } else {
        toast.error("Không thể thả cảm xúc lúc này.");
      }
    } catch (err) {
      console.error("Lỗi reactToStory:", err);
      toast.error("Không thể thả cảm xúc lúc này.");
    }
  };

  const getStoryReactionSummary = (reactionsList?: IReaction[]) => {
    const typeCounts: Partial<Record<ReactionType, number>> = {};
    (reactionsList || []).forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([type]) => type as ReactionType);
  };

  const getMyStoryReaction = (reactionsList?: IReaction[]) => {
    const found = (reactionsList || []).find((r) => r.userId?.toLowerCase() === currentUserId?.toLowerCase());
    return found ? found.type : null;
  };

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    progressRef.current = 0;
    setProgress(0);

    const duration = currentStory?.duration || 5000;
    const interval = 50; // Update progress every 50ms
    timerRef.current = setInterval(() => {
      progressRef.current += interval;
      const pct = Math.min((progressRef.current / duration) * 100, 100);
      setProgress(pct);

      if (progressRef.current >= duration) {
        goNext();
      }
    }, interval);
  }, [groupIndex, storyIndex, storyGroups, currentStory?.duration]);

  useEffect(() => {
    if (!paused) {
      startTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, startTimer]);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Control story background music playback
  useEffect(() => {
    const audio = storyMusicRef.current;
    if (!audio) return;

    if (currentStory && currentStory.music && currentStory.music.url) {
      audio.muted = isMuted;

      if (!paused) {
        audio.play().catch((err) => {
          console.warn("Background music play blocked:", err);
        });
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      audio.src = "";
      audio.load();
    }

    return () => {
      audio.pause();
    };
  }, [currentStory?._id, currentStory?.music?.url, paused]);

  // Ensure all media stops playing immediately on unmount
  useEffect(() => {
    return () => {
      if (storyMusicRef.current) {
        storyMusicRef.current.pause();
        storyMusicRef.current.src = "";
        try { storyMusicRef.current.load(); } catch (e) {}
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        try { videoRef.current.load(); } catch (e) {}
      }
    };
  }, []);

  // Sync mute state and trigger play on unmute
  useEffect(() => {
    if (storyMusicRef.current) {
      storyMusicRef.current.muted = isMuted;
      if (!isMuted && !paused && currentStory?.music?.url) {
        storyMusicRef.current.play().catch((err) => {
          console.warn("Play on unmute blocked:", err);
        });
      }
    }
  }, [isMuted, paused, currentStory?._id]);

  // Sync video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.warn("Video play blocked:", err);
        });
      }
    }
  }, [paused, currentStory?._id]);

  // Helper to resume/play audio & video on user gesture
  const handleUserGesture = () => {
    if (storyMusicRef.current && storyMusicRef.current.paused && !pausedRef.current && currentStory?.music?.url) {
      storyMusicRef.current.play().catch((err) => {
        console.warn("Gesture background music play failed:", err);
      });
    }
    if (videoRef.current && videoRef.current.paused && !pausedRef.current && currentStory?.mediaType === "VIDEO") {
      videoRef.current.play().catch((err) => {
        console.warn("Gesture video play failed:", err);
      });
    }
  };

  const goNext = () => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      // Next story in same group
      setStoryIndex((prev) => prev + 1);
      progressRef.current = 0;
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      // Next group
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      progressRef.current = 0;
      setProgress(0);
    } else {
      // End — close viewer
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      progressRef.current = 0;
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1]!;
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      progressRef.current = 0;
      setProgress(0);
    }
  };

  const handleDelete = () => {
    if (!currentStory || !isOwnStory) return;
    setPaused(true); // Tạm dừng story khi hiện hộp thoại xác nhận
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!currentStory) return;
    const storyIdToDelete = currentStory._id;
    const success = await postService.deleteStory(storyIdToDelete);
    if (success) {
      toast.success("Đã xóa story!");
      if (onStoryDeleted) {
        onStoryDeleted(storyIdToDelete);
      }
      onClose();
    } else {
      toast.error("Không thể xóa story.");
      setPaused(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPaused(false);
  };

  const [loadingReload, setLoadingReload] = useState(false);

  const handleReloadStory = async () => {
    if (!currentStory) return;
    setLoadingReload(true);
    try {
      const updatedStory = await postService.getStoryDetails(currentStory._id);
      if (updatedStory) {
        if (onStoryViewed) {
          onStoryViewed(currentStory._id, updatedStory.viewers || [], updatedStory.viewCount || 0);
        }
        if (onStoryReacted) {
          onStoryReacted(currentStory._id, updatedStory.reactions || [], updatedStory.reactionCount || 0);
        }
        toast.success("Đã làm mới lượt xem và cảm xúc!");
      }
    } catch (err) {
      console.error("Lỗi reload story:", err);
      toast.error("Không thể làm mới lượt xem và cảm xúc.");
    } finally {
      setLoadingReload(false);
    }
  };

  const getAvatar = (url?: string, fullName?: string) => {
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
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
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch { return ""; }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Progress bars at top */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-3 z-20 flex gap-1">
        {currentGroup.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{
                width: idx < storyIndex
                  ? "100%"
                  : idx === storyIndex
                  ? `${progress}%`
                  : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 px-5 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
            <img
              src={getAvatar(currentProfile?.avatar, currentProfile?.fullName)}
              alt="Story author"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-bold text-sm drop-shadow-lg">
              {currentProfile?.fullName || "Người dùng"}
            </p>
            <div className="flex flex-col gap-0.5">
              <p className="text-white/70 text-[10px] font-medium">
                {formatTime(currentStory.createdAt)}
              </p>
              {currentStory.music && currentStory.music.url && (
                <div className="flex items-center gap-1 text-[10px] text-blue-300 font-bold bg-black/30 rounded-full px-2 py-0.5 w-fit">
                  <MusicalNoteIcon className="w-3 h-3 text-blue-300 animate-pulse" />
                  <span>{currentStory.music.title} - {currentStory.music.artist}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Pause/Play */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPaused(!paused);
              setTimeout(handleUserGesture, 50);
            }}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            {paused ? (
              <PlayIcon className="w-5 h-5" />
            ) : (
              <PauseIcon className="w-5 h-5" />
            )}
          </button>
          {/* Sound control for video or background music */}
          {(currentStory.mediaType === "VIDEO" || (currentStory.music && currentStory.music.url)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
                setTimeout(handleUserGesture, 50);
              }}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
          )}
          {/* Viewers count (chỉ chủ story) */}
          {isOwnStory && (
            <button
              onClick={() => setShowViewers(!showViewers)}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors flex items-center gap-1"
            >
              <EyeIcon className="w-5 h-5" />
              <span className="text-xs font-bold">{currentStory.viewCount}</span>
            </button>
          )}
          {/* Delete (chỉ chủ story) */}
          {isOwnStory && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-full bg-black/30 hover:bg-red-500/70 text-white transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="w-full h-full flex items-center justify-center"
        onMouseDown={() => setPaused(true)}
        onMouseUp={(e) => {
          e.stopPropagation();
          setPaused(false);
          setTimeout(handleUserGesture, 50);
        }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={(e) => {
          e.stopPropagation();
          setPaused(false);
          setTimeout(handleUserGesture, 50);
        }}
        onClick={handleUserGesture}
      >
        {currentStory.mediaType === "VIDEO" ? (
          <video
            ref={videoRef}
            key={currentStory._id}
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted={currentStory.music && currentStory.music.url ? true : isMuted}
            playsInline
          />
        ) : (
          <img
            key={currentStory._id}
            src={currentStory.mediaUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div className="absolute bottom-20 left-0 right-0 px-8 z-20">
          <p className="text-white text-center text-sm font-medium drop-shadow-xl bg-black/30 rounded-2xl px-4 py-2 backdrop-blur-sm max-w-md mx-auto">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
          setTimeout(handleUserGesture, 50);
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-20"
      >
        <ChevronLeftIcon className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          goNext();
          setTimeout(handleUserGesture, 50);
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-20"
      >
        <ChevronRightIcon className="w-6 h-6" />
      </button>

      {/* Persistent DOM audio element */}
      <audio
        ref={storyMusicRef}
        src={currentStory.music && currentStory.music.url ? currentStory.music.url : undefined}
        loop
        muted={isMuted}
      />
      {/* Reaction Summary badge */}
      {currentStory.reactionCount !== undefined && currentStory.reactionCount > 0 && (
        <div className="absolute bottom-24 right-5 flex items-center gap-1 bg-black/40 text-white border border-white/10 shadow-lg rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm z-20">
          <div className="flex -space-x-1">
            {getStoryReactionSummary(currentStory.reactions).map((type) => (
              <span key={type} className="text-[14px]">
                {REACTION_EMOJI[type]}
              </span>
            ))}
          </div>
          <span>{currentStory.reactionCount}</span>
        </div>
      )}

      {/* Bottom Emoji Reaction bar */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-2 z-20">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {(["LIKE", "HEART", "HAHA", "WOW", "SAD", "ANGRY"] as ReactionType[]).map((type) => {
            return (
              <button
                key={type}
                onClick={() => handleReact(type)}
                className="text-2xl p-1 transition-transform rounded-full hover:bg-white/10 hover:scale-125 active:scale-90"
                title={REACTION_LABELS[type]}
              >
                {REACTION_EMOJI[type]}
              </button>
            );
          })}
        </div>
      </div>
      {/* Viewers Panel (chỉ chủ story) */}
      {showViewers && isOwnStory && (() => {
        const rawViewers = currentStory.viewers || [];
        const rawReactions = currentStory.reactions || [];

        // Lọc trùng lặp người xem (theo userId case-insensitive)
        const uniqueViewers: typeof rawViewers = [];
        const seenViewers = new Set<string>();
        for (const viewer of rawViewers) {
          const uid = viewer.userId?.toLowerCase();
          if (uid && !seenViewers.has(uid)) {
            seenViewers.add(uid);
            uniqueViewers.push(viewer);
          }
        }

        // Additive mode: group reactions theo user, đếm số lượng mỗi loại
        const userReactionMap = new Map<string, { userId: string; counts: Partial<Record<ReactionType, number>>; total: number }>();
        for (const rx of rawReactions) {
          const uid = rx.userId?.toLowerCase();
          if (!uid) continue;
          if (!userReactionMap.has(uid)) {
            userReactionMap.set(uid, { userId: rx.userId, counts: {}, total: 0 });
          }
          const entry = userReactionMap.get(uid)!;
          entry.counts[rx.type] = (entry.counts[rx.type] || 0) + 1;
          entry.total += 1;
        }
        const groupedReactors = Array.from(userReactionMap.values());

        // Tổng reactions theo type (đếm tất cả, bao gồm duplicate)
        const allReactionTypes = Array.from(new Set(rawReactions.map((r) => r.type))) as ReactionType[];
        const reactionTabs: ("ALL" | ReactionType)[] = ["ALL", ...allReactionTypes];

        const filteredReactors = groupedReactors.filter((entry) => {
          if (viewerFilter === "ALL") return true;
          return entry.counts[viewerFilter as ReactionType] !== undefined;
        });

        return (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 rounded-t-3xl p-6 z-30 max-h-[50vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Main Tabs Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800/80 pb-2">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPanelTab("VIEWERS")}
                  className={`pb-1 text-sm font-bold transition-all relative ${
                    panelTab === "VIEWERS"
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-600"
                  }`}
                >
                  Người đã xem ({uniqueViewers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab("REACTIONS")}
                  className={`pb-1 text-sm font-bold transition-all relative ${
                    panelTab === "REACTIONS"
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-600"
                  }`}
                >
                  Cảm xúc ({rawReactions.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReloadStory}
                  disabled={loadingReload}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors disabled:opacity-50"
                  title="Làm mới"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loadingReload ? "animate-spin text-blue-500" : ""}`} />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowViewers(false)} 
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {panelTab === "VIEWERS" ? (
              /* Viewers List Tab */
              uniqueViewers.length === 0 ? (
                <p className="text-center text-xs text-gray-400 dark:text-zinc-500 py-6">
                  Chưa có ai xem story này.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {uniqueViewers.map((viewer) => {
                    const vProfile = userProfiles[viewer.userId] || localUserProfiles[viewer.userId];
                    return (
                      <div key={viewer.userId} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-zinc-800/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shrink-0">
                            <img
                              src={getAvatar(vProfile?.avatar, vProfile?.fullName)}
                              alt="Viewer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              {vProfile?.fullName || "Người dùng"}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                              {formatTime(viewer.viewedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Reactions List Tab — Additive mode */
              <>
                {/* Reaction Filter Sub-tabs */}
                {reactionTabs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-100 dark:border-zinc-800/80 scrollbar-hide">
                    {reactionTabs.map((tab) => {
                      const isActive = viewerFilter === tab;
                      const count = tab === "ALL" 
                        ? rawReactions.length 
                        : rawReactions.filter((r) => r.type === tab).length;
                      
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setViewerFilter(tab)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {tab === "ALL" ? "Tất cả" : REACTION_EMOJI[tab]}
                          <span className={`text-[10px] ${isActive ? "text-white/80" : "text-gray-400 dark:text-zinc-500"}`}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredReactors.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 dark:text-zinc-500 py-6">
                    Chưa có ai thả cảm xúc tương ứng.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {filteredReactors.map((entry) => {
                      const vProfile = userProfiles[entry.userId] || localUserProfiles[entry.userId];
                      return (
                        <div key={entry.userId} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-zinc-800/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shrink-0">
                              <img
                                src={getAvatar(vProfile?.avatar, vProfile?.fullName)}
                                alt="Reactor"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                                {vProfile?.fullName || "Người dùng"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/40 px-2.5 py-1 rounded-full border border-gray-100/50 dark:border-zinc-800/20">
                            {Object.entries(entry.counts).map(([type, count]) => (
                              <span key={type} className="flex items-center gap-0.5" title={REACTION_LABELS[type as ReactionType]}>
                                <span className="text-sm">{REACTION_EMOJI[type as ReactionType]}</span>
                                <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold">{count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Custom Confirmation Modal (Zalo-style) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-gray-950 dark:text-zinc-50 mb-1">
              Lưu trữ Story?
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Bạn có chắc muốn lưu trữ Story này? Story sẽ được chuyển vào kho lưu trữ cá nhân của bạn và có thể khôi phục lại bất kỳ lúc nào.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-red-500/20"
              >
                Lưu trữ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flying Emojis Layer */}
      <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden">
        {flyingEmojis.map((item) => (
          <span
            key={item.id}
            className="absolute text-3xl animate-float-up opacity-0"
            style={{
              left: `${item.left}%`,
              bottom: "10%",
              animationDelay: `${item.delay}s`,
              animationDuration: "1.5s",
              animationTimingFunction: "ease-out",
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.2) rotate(15deg);
          }
          100% {
            transform: translateY(-400px) scale(1) rotate(-30deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation-name: floatUp;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
