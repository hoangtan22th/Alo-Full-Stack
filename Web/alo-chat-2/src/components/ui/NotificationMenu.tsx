"use client";
import React, { useState, useEffect, useCallback } from "react";
import { XMarkIcon, BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { postService, INotification } from "@/services/postService";
import { userService, UserProfileDTO } from "@/services/userService";
import { useChatStore } from "@/store/useChatStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NotificationMenuProps {
  onClose: () => void;
}

const userCache: Record<string, UserProfileDTO> = {};

export default function NotificationMenu({ onClose }: NotificationMenuProps) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, UserProfileDTO>>({});
  const { unreadNotifsCount, setUnreadNotifsCount } = useChatStore();
  const router = useRouter();

  // Fetch unique user profiles for notifications
  const fetchProfiles = useCallback(async (notifs: INotification[]) => {
    const uniqueSenderIds = Array.from(new Set(notifs.map(n => n.senderId)));
    const newProfilesToFetch = uniqueSenderIds.filter(id => !userCache[id] && id);

    if (newProfilesToFetch.length === 0) {
      // All profiles already cached
      const profilesMap: Record<string, UserProfileDTO> = {};
      uniqueSenderIds.forEach(id => {
        if (userCache[id]) profilesMap[id] = userCache[id]!;
      });
      setSenderProfiles(prev => ({ ...prev, ...profilesMap }));
      return;
    }

    try {
      const profilesMap: Record<string, UserProfileDTO> = {};
      await Promise.all(
        newProfilesToFetch.map(async (id) => {
          try {
            const profile = await userService.getUserById(id);
            if (profile) {
              userCache[id] = profile;
              profilesMap[id] = profile;
            }
          } catch (e) {
            console.error(`Failed to fetch user profile for notifications: ${id}`, e);
          }
        })
      );

      // Merge current cached profiles
      uniqueSenderIds.forEach(id => {
        if (userCache[id]) {
          profilesMap[id] = userCache[id]!;
        }
      });
      setSenderProfiles(prev => ({ ...prev, ...profilesMap }));
    } catch (err) {
      console.error("Error fetching notification user profiles:", err);
    }
  }, []);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;

  const loadNotifications = useCallback(async (currentSkip = 0) => {
    const isInitial = currentSkip === 0;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const list = await postService.getNotifications(limit, currentSkip);
      setNotifications(prev => {
        const nextList = isInitial ? list : [...prev, ...list];
        setHasMore(list.length === limit);
        return nextList;
      });
      await fetchProfiles(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchProfiles]);

  useEffect(() => {
    loadNotifications(0);

    // Listen for custom event to reload notifications in real time
    const handleRefresh = () => {
      loadNotifications(0);
    };

    window.addEventListener("refresh_notifications", handleRefresh);
    return () => {
      window.removeEventListener("refresh_notifications", handleRefresh);
    };
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const success = await postService.markAllNotificationsAsRead();
      if (success) {
        setUnreadNotifsCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("Đã đánh dấu đọc tất cả thông báo.");
      }
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const handleNotifClick = async (notif: INotification) => {
    try {
      if (!notif.isRead) {
        await postService.markNotificationAsRead(notif._id);
        setUnreadNotifsCount(Math.max(0, unreadNotifsCount - 1));
        setNotifications(prev =>
          prev.map(n => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      }
      onClose();

      if (notif.postId) {
        router.push(`/feed?postId=${notif.postId}`);
      } else {
        router.push(`/feed`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
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

      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return "";
    }
  };

  const getAvatarUrl = (userId: string) => {
    const profile = senderProfiles[userId];
    if (profile?.avatar) {
      const avatarStr = profile.avatar;
      if (avatarStr.startsWith("http") || avatarStr.startsWith("data:")) {
        return avatarStr;
      }
      return `http://localhost:8888${avatarStr.startsWith("/") ? "" : "/"}${avatarStr}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  return (
    <div className="h-full w-80 bg-white border-r border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200 notification-menu-container">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellIcon className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900 text-sm">Thông báo</h2>
          {unreadNotifsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unreadNotifsCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifsCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors"
              title="Đọc tất cả"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            Không có thông báo nào.
          </div>
        ) : (
          notifications.map((notif) => {
            const profile = senderProfiles[notif.senderId];
            const senderName = profile?.fullName || "Người dùng";
            const avatar = getAvatarUrl(notif.senderId);

            return (
              <div
                key={notif._id}
                onClick={() => handleNotifClick(notif)}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors relative group ${!notif.isRead ? "bg-blue-50/20" : ""
                  }`}
              >
                {/* Unread indicator */}
                {!notif.isRead && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-gray-100">
                  <img
                    src={avatar}
                    alt={senderName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=E5E7EB&color=374151&rounded=true`;
                    }}
                  />
                </div>

                {/* Text Content */}
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs text-gray-700 leading-normal break-words">
                    <span className="font-semibold text-gray-900 mr-1">{senderName}</span>
                    <span>{notif.message}</span>
                  </p>
                  <span className="text-[10px] text-gray-400">{formatTime(notif.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}

        {notifications.length > 0 && hasMore && (
          <div className="p-3 text-center border-t border-gray-50 shrink-0">
            <button
              onClick={() => loadNotifications(notifications.length)}
              disabled={loadingMore}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors w-full py-1.5 rounded-lg hover:bg-slate-50 active:scale-98"
            >
              {loadingMore ? "Đang tải thêm..." : "Xem thêm thông báo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
