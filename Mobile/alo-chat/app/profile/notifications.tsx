import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { postService } from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";

// Cache để tránh gọi API lặp lại
const userCache: Record<string, UserProfileDTO> = {};

interface INotification {
  _id: string;
  recipientId: string;
  senderId: string;
  type: 'LIKE_POST' | 'REACT_POST' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'TAG_POST' | 'NEW_POST';
  postId?: string;
  commentId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const LIMIT = 20;

  const [profiles, setProfiles] = useState<Record<string, UserProfileDTO>>({});

  // Tải thông tin của các người gửi
  const fetchProfilesForNotifications = async (notifs: INotification[]) => {
    const senderIds = Array.from(new Set(notifs.map((n) => n.senderId))).filter(
      (id) => !!id && !userCache[id]
    );

    if (senderIds.length === 0) return;

    try {
      const resolved = await Promise.all(
        senderIds.map(async (id) => {
          const profile = await userService.getUserById(id);
          if (profile) {
            userCache[id] = profile;
            return { id, profile };
          }
          return null;
        })
      );

      const newProfiles: Record<string, UserProfileDTO> = {};
      resolved.forEach((item) => {
        if (item) {
          newProfiles[item.id] = item.profile;
        }
      });

      setProfiles((prev) => ({ ...prev, ...newProfiles }));
    } catch (err) {
      console.log("Lỗi tải profile người gửi thông báo:", err);
    }
  };

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (skip === 0) {
      setLoading(true);
    }

    try {
      const currentSkip = isRefresh ? 0 : skip;
      const data = await postService.getNotifications(LIMIT, currentSkip);
      
      // Lọc các thông báo hợp lệ
      const validData = (data || []).filter((n: any) => !!n._id);

      if (isRefresh) {
        setNotifications(validData);
        setSkip(validData.length);
        setHasMore(validData.length === LIMIT);
      } else {
        setNotifications((prev) => [...prev, ...validData]);
        setSkip((prev) => prev + validData.length);
        setHasMore(validData.length === LIMIT);
      }

      // Tải ảnh đại diện/tên hiển thị của người gửi
      await fetchProfilesForNotifications(validData);
    } catch (error) {
      console.error("Lỗi tải danh sách thông báo:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);

    const sub = DeviceEventEmitter.addListener("refresh_notifications", () => {
      loadNotifications(true);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const handleRefresh = () => {
    loadNotifications(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadNotifications(false);
  };

  const handleMarkAllRead = async () => {
    try {
      const success = await postService.markAllNotificationsAsRead();
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        DeviceEventEmitter.emit("refresh_notifications");
      }
    } catch (err) {
      console.log("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  const handleNotificationPress = async (notif: INotification) => {
    // Đánh dấu là đã đọc
    if (!notif.isRead) {
      try {
        await postService.markNotificationAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        DeviceEventEmitter.emit("refresh_notifications");
      } catch (err) {
        console.log("Lỗi mark notification read:", err);
      }
    }

    // Điều hướng tới bài viết
    if (notif.postId) {
      router.push({
        pathname: "/posts/[id]",
        params: { id: notif.postId },
      });
    } else {
      Alert.alert("Thông báo", `${profiles[notif.senderId]?.fullName || "Ai đó"} ${notif.message}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LIKE_POST":
      case "REACT_POST":
        return {
          name: "heart",
          color: "#EF4444",
          bgColor: "#FEE2E2",
        };
      case "COMMENT_POST":
      case "REPLY_COMMENT":
        return {
          name: "chatbubble-ellipses",
          color: "#10B981",
          bgColor: "#D1FAE5",
        };
      case "TAG_POST":
        return {
          name: "pricetag",
          color: "#8B5CF6",
          bgColor: "#EDE9FE",
        };
      case "NEW_POST":
        return {
          name: "document-text",
          color: "#3B82F6",
          bgColor: "#DBEAFE",
        };
      default:
        return {
          name: "notifications",
          color: "#6B7280",
          bgColor: "#F3F4F6",
        };
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
    } catch {
      return "";
    }
  };

  const renderItem = ({ item }: { item: INotification }) => {
    const profile = profiles[item.senderId] || userCache[item.senderId];
    const iconConfig = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        className={`flex-row items-center p-4 border-b border-gray-100 ${
          item.isRead ? "bg-white" : "bg-blue-50/40"
        }`}
      >
        {/* Avatar */}
        <View className="relative mr-4 shrink-0">
          <Image
            source={{ uri: getAvatar(profile?.avatar, profile?.fullName) }}
            className="w-12 h-12 rounded-full bg-gray-200"
          />
          {/* Badge icon loại thông báo */}
          <View
            style={{ backgroundColor: iconConfig.bgColor }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2 border-white"
          >
            <Ionicons name={iconConfig.name as any} size={11} color={iconConfig.color} />
          </View>
        </View>

        {/* Nội dung thông báo */}
        <View className="flex-1">
          <Text className="text-sm text-gray-800 leading-5">
            <Text className="font-bold text-gray-900">
              {profile?.fullName || "Người dùng"}
            </Text>{" "}
            {item.message}
          </Text>
          <Text className="text-[11px] text-gray-400 mt-1 font-semibold">
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Chấm tròn chưa đọc */}
        {!item.isRead && (
          <View className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2 shrink-0" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Thông báo</Text>
        </View>

        {notifications.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead} className="px-3 py-1.5 bg-blue-50 rounded-full active:scale-95">
            <Text className="text-xs font-bold text-blue-600">Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách thông báo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-2 text-gray-400 text-sm">Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: 50,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2563eb"]}
              tintColor="#2563eb"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#9ca3af" className="py-4" />
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3 text-center">Bạn chưa có thông báo nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
