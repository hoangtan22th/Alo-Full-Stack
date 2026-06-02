import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, Alert } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { presenceService } from "../services/presenceService";
import { userService } from "../services/userService";
import { createAudioPlayer } from "expo-audio";
import { getMessageTextContent } from "../utils/messageUtils";

export type OnlineUser = {
  status: "online" | "offline";
  last_active?: number;
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, OnlineUser>;
  fetchBulkPresence: (userIds: string[]) => Promise<void>;
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  emitNewPost: (friendIds: string[], post: any) => void;
  emitPostDeleted: (friendIds: string[], postId: string) => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: {},
  fetchBulkPresence: async () => {},
  joinPost: () => {},
  leavePost: () => {},
  emitNewPost: () => {},
  emitPostDeleted: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

let notificationPlayer: any = null;

const playNotificationSound = () => {
  try {
    if (!notificationPlayer) {
      notificationPlayer = createAudioPlayer(require("../assets/audio_nhan.mp3"));
    }
    notificationPlayer.seekTo(0);
    notificationPlayer.play();
  } catch (error) {
    console.log("Lỗi phát âm thanh thông báo:", error);
  }
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>(
    {},
  );

  const fetchBulkPresence = async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return;
    const result = await presenceService.getBulkPresence(userIds);
    if (result) {
      const formatted: Record<string, OnlineUser> = {};
      Object.entries(result).forEach(([userId, info]) => {
        formatted[userId] = {
          status: info.isOnline ? "online" : "offline",
          last_active: info.lastActiveAt,
        };
      });
      setOnlineUsers((prev) => ({ ...prev, ...formatted }));
    }
  };

  useEffect(() => {
    let newSocket: Socket | null = null;

    const initSocket = async () => {
      // Chỉ kết nối Socket nếu User đã đăng nhập thành công
      if (isAuthenticated) {
        try {
          const token = await AsyncStorage.getItem("accessToken");
          if (!token) return;

          const ipAddress = process.env.EXPO_PUBLIC_IP_ADDRESS || "localhost";

          // Kết nối vào Spring Cloud Gateway (Port 8888)
          newSocket = io(`http://${ipAddress}:8888`, {
            auth: { token },
            transports: ["websocket"],
          });

          newSocket.on("connect", () => {
            console.log("🟢 Socket Connected: ", newSocket?.id);
            setIsConnected(true);
          });

          newSocket.on("disconnect", () => {
            console.log("🔴 Socket Disconnected");
            setIsConnected(false);
          });

          // Test lắng nghe các Event do Realtime-Service ném xuống (Group)
          newSocket.on("TYPING", (data) => {
            console.log("Có người đang gõ trong nhóm bạn tham gia: ", data);
          });

          // Lắng nghe lệnh Đăng Xuất Tự Động từ hệ thống (khi có thiết bị khác đăng nhập)
          newSocket.on("FORCE_LOGOUT", (data) => {
            console.warn("⚠️ Received FORCE_LOGOUT from server:", data);
            DeviceEventEmitter.emit("force_logout");
          });

          // Lắng nghe lệnh Tài Khoản Bị Khóa (Banned) từ Admin
          newSocket.on("ACCOUNT_BANNED", (data: { reason?: string }) => {
            console.warn("⚠️ Received ACCOUNT_BANNED from server:", data);
            Alert.alert(
              "Tài khoản bị khóa",
              data.reason 
                ? `Tài khoản của bạn đã bị khóa bởi Quản trị viên.\nLý do: ${data.reason}` 
                : "Tài khoản của bạn đã bị khóa bởi Quản trị viên do vi phạm điều khoản.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    DeviceEventEmitter.emit("force_logout");
                  }
                }
              ],
              { cancelable: false }
            );
          });

          // Lắng nghe yêu cầu tham gia nhóm mới (Dành cho Admin)
          newSocket.on("NEW_JOIN_REQUEST", (data: { groupId: string, requesterName: string, groupName: string }) => {
            console.log("📥 [Mobile Socket] Received NEW_JOIN_REQUEST:", data);
            // Thay vì dùng Alert.alert (popup), bắn event để UI hiển thị sliding notification
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Yêu cầu tham gia nhóm",
              message: `${data.requesterName} muốn tham gia nhóm ${data.groupName}`,
              data: { groupId: data.groupId },
              type: "JOIN_REQUEST",
            });
          });

          // Duyệt thành viên (Dành cho Member được duyệt)
          newSocket.on(
            "JOIN_REQUEST_APPROVED",
            (data: {
              groupId: string;
              groupName: string;
              groupAvatar: string;
              membersCount: number;
            }) => {
              console.log(
                "📥 [Mobile Socket] Received JOIN_REQUEST_APPROVED:",
                data,
              );
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Yêu cầu đã được duyệt",
                message: `Chúc mừng! Bạn đã trở thành thành viên của nhóm ${data.groupName}`,
                avatar: data.groupAvatar,
                data: {
                  groupId: data.groupId,
                  name: data.groupName,
                  avatar: data.groupAvatar,
                  membersCount: data.membersCount,
                },
                type: "JOIN_APPROVED",
              });
            },
          );

          // Được thêm vào nhóm (trực tiếp)
          newSocket.on(
            "ADDED_TO_GROUP",
            (data: {
              groupId: string;
              groupName: string;
              groupAvatar: string;
              membersCount: number;
            }) => {
              console.log("📥 [Mobile Socket] Received ADDED_TO_GROUP:", data);
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Nhóm mới",
                message: `Bạn đã được thêm vào nhóm ${data.groupName}`,
                avatar: data.groupAvatar,
                data: {
                  groupId: data.groupId,
                  name: data.groupName,
                  avatar: data.groupAvatar,
                  membersCount: data.membersCount,
                },
                type: "JOIN_APPROVED",
              });
            },
          );

          // Phê duyệt bị từ chối
          newSocket.on("JOIN_REQUEST_REJECTED", (data: { groupName: string }) => {
            console.log("📥 [Mobile Socket] Received JOIN_REQUEST_REJECTED:", data);
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Yêu cầu bị từ chối",
              message: `Rất tiếc, yêu cầu tham gia nhóm ${data.groupName} của bạn đã bị từ chối.`,
              type: "REJECTED",
            });
          });

          // Nhận lời mời vào nhóm mới
          newSocket.on("NEW_INVITATION", (data: { groupId: string, groupName: string, groupAvatar: string, invitedBy: string }) => {
            console.log("📥 [Mobile Socket] Received NEW_INVITATION:", data);
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Lời mời vào nhóm",
              message: `Bạn được mời tham gia nhóm ${data.groupName}`,
              avatar: data.groupAvatar,
              data: { groupId: data.groupId },
              type: "INVITATION",
            });
            // Bắn event để màn hình invitations refresh
            DeviceEventEmitter.emit("refresh_invitations");
            // Bắn event để tab group (index.tsx) refresh badge
            DeviceEventEmitter.emit("refresh_group_badges");
          });

          // Bị mời khỏi nhóm / Giải tán nhóm
          newSocket.on(
            "CONVERSATION_REMOVED",
            (data: {
              conversationId: string;
              groupName: string;
              reason: "kick" | "leave" | "delete";
            }) => {
              console.log("📥 [Mobile Socket] Received CONVERSATION_REMOVED:", data);
              // Chỉ hiện notification nếu lý do không phải là User tự rời
              if (data.reason !== "leave") {
                DeviceEventEmitter.emit("show_in_app_notification", {
                  title:
                    data.reason === "delete" ? "Nhóm đã giải tán" : "Thông báo",
                  message:
                    data.reason === "delete"
                      ? `Nhóm ${data.groupName} đã ngừng hoạt động`
                      : `Bạn không còn là thành viên của nhóm ${data.groupName}`,
                  data: { groupId: data.conversationId },
                  type: "REMOVED",
                });
              }
            },
          );

          // Nhắc hẹn đến hạn (Riêng tư)
          newSocket.on("REMINDER_DUE", (data: { title: string, conversationId: string }) => {
            console.log("📥 [Mobile Socket] Received REMINDER_DUE:", data);
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Nhắc hẹn",
              message: `Đã đến giờ: ${data.title}`,
              data: { groupId: data.conversationId },
              type: "REMINDER",
            });
          });

          // Lắng nghe tin nhắn mới để hiện Notification toàn cục
          newSocket.on("message-received", async (data: any) => {
            const message = data.message || data;
            
            // Bỏ qua tin nhắn do chính mình gửi
            if (String(message.senderId) === String(currentUserId)) return;

            // Nếu là tin nhắn hệ thống loại nhắc hẹn
            if (message.type === "system" && message.metadata?.isReminder) {
              console.log("📥 [Mobile Socket] Received Group REMINDER:", message);
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Nhắc hẹn nhóm",
                message: message.metadata.title || message.content,
                data: { groupId: message.conversationId },
                type: "REMINDER",
              });
            } else if (message.type !== "system") {
              // Tin nhắn bình thường
              console.log("📥 [Mobile Socket] Received NORMAL MESSAGE:", message._id);
              await playNotificationSound();
              
              let content = getMessageTextContent(message.content);
              if (message.type === "image") content = "[Hình ảnh]";
              else if (message.type === "video") content = "[Video]";
              else if (message.type === "file") content = "[Tệp đính kèm]";
              else if (message.type === "poll") content = "[Bình chọn]";
              else if (message.type === "contact") content = "[Danh thiếp]";

              DeviceEventEmitter.emit("show_in_app_notification", {
                title: message.senderName || "Tin nhắn mới",
                message: content,
                avatar: message.senderAvatar,
                data: { conversationId: message.conversationId, senderId: message.senderId },
                type: "NEW_MESSAGE",
              });
            }
          });

          // Tiện ích: Ghi chú (Notes)
          newSocket.on("NOTE_CREATED", (data: any) => {
            if (String(data.creatorId) !== String(currentUserId)) {
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Ghi chú mới",
                message: `Một ghi chú mới đã được tạo: "${data.content.substring(0, 30)}${data.content.length > 30 ? "..." : ""}"`,
                data: { groupId: data.conversationId },
                type: "NOTE",
              });
            }
          });

          newSocket.on("NOTE_UPDATED", (data: any) => {
            if (String(data.creatorId) !== String(currentUserId)) {
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Ghi chú cập nhật",
                message: "Một ghi chú vừa được chỉnh sửa",
                data: { groupId: data.conversationId },
                type: "NOTE",
              });
            }
          });

          newSocket.on("NOTE_DELETED", (data: any) => {
            // Note: NOTE_DELETED payload often doesn't have actorId, but we can still notify others
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Ghi chú đã xóa",
              message: "Một ghi chú trong nhóm đã bị gỡ bỏ",
              data: { groupId: data.conversationId },
              type: "NOTE",
            });
          });

          // Tiện ích: Nhắc hẹn (Reminders)
          newSocket.on("REMINDER_CREATED", (data: any) => {
            if (String(data.creatorId) !== String(currentUserId)) {
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Nhắc hẹn mới",
                message: `Nhắc hẹn: "${data.title}"`,
                data: { groupId: data.conversationId },
                type: "REMINDER",
              });
            }
          });

          newSocket.on("REMINDER_UPDATED", (data: any) => {
            if (String(data.creatorId) !== String(currentUserId)) {
              DeviceEventEmitter.emit("show_in_app_notification", {
                title: "Nhắc hẹn cập nhật",
                message: `Nhắc hẹn "${data.title}" đã được thay đổi`,
                data: { groupId: data.conversationId },
                type: "REMINDER",
              });
            }
          });

          newSocket.on("REMINDER_DELETED", (data: any) => {
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Nhắc hẹn đã xóa",
              message: "Một nhắc hẹn trong nhóm đã bị hủy",
              data: { groupId: data.conversationId },
              type: "REMINDER",
            });
          });

          // Tiện ích: Bình chọn (Polls)
          newSocket.on("POLL_UPDATED", (data: any) => {
             // data typically { pollId, conversationId }
             // We don't necessarily know the actor here, but we can notify
             DeviceEventEmitter.emit("show_in_app_notification", {
               title: "Bình chọn cập nhật",
               message: "Có thay đổi mới trong cuộc bình chọn",
               data: { groupId: data.conversationId },
               type: "POLL",
             });
          });

          // ============ Friend Request Real-time Events ============
          newSocket.on("NEW_FRIEND_REQUEST", async (data: any) => {
            console.log("📥 [Mobile Socket] Received NEW_FRIEND_REQUEST:", data);
            await playNotificationSound();
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Lời mời kết bạn mới",
              message: `${data.requesterName} đã gửi cho bạn lời mời kết bạn`,
              avatar: data.requesterAvatar,
              type: "NEW_FRIEND_REQUEST",
            });
            // Bắn event refresh để cập nhật UI danh sách lời mời (nếu có)
            DeviceEventEmitter.emit("refresh_received_requests");
            DeviceEventEmitter.emit("refresh_contact_badges");
          });

          newSocket.on("FRIEND_REQUEST_ACCEPTED", async (data: any) => {
            console.log("📥 [Mobile Socket] Received FRIEND_REQUEST_ACCEPTED:", data);
            await playNotificationSound();
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Chấp nhận kết bạn",
              message: `${data.accepterName || "Một người dùng"} đã trở thành bạn bè với bạn`,
              type: "FRIEND_ACCEPTED",
            });
            // Bắn event refresh danh sách bạn bè
            DeviceEventEmitter.emit("refresh_friends_list");
          });

          // ============ Post Real-time Events ============
          newSocket.on("NEW_POST_RECEIVED", (data: any) => {
            console.log("📰 [Socket] NEW_POST_RECEIVED:", data?._id);
            DeviceEventEmitter.emit("new_post_received", data);
          });

          newSocket.on("POST_DELETED_RECEIVED", (data: { postId: string }) => {
            console.log("🗑️ [Socket] POST_DELETED_RECEIVED:", data?.postId);
            DeviceEventEmitter.emit("post_deleted_received", data);
          });

          newSocket.on("POST_INTERACTION", (data: any) => {
            console.log("🔄 [Socket] POST_INTERACTION:", data?.eventType, data?.postId);
            DeviceEventEmitter.emit("post_interaction", data);
          });

          // ============ Story Real-time Events ============
          newSocket.on("NEW_STORY_RECEIVED", (data: any) => {
            console.log("📸 [Socket] NEW_STORY_RECEIVED:", data?._id);
            DeviceEventEmitter.emit("new_story_received", data);
          });

          newSocket.on("STORY_DELETED_RECEIVED", (data: { storyId: string }) => {
            console.log("🗑️ [Socket] STORY_DELETED_RECEIVED:", data?.storyId);
            DeviceEventEmitter.emit("story_deleted_received", data);
          });

          newSocket.on("STORY_VIEWED", (data: any) => {
            console.log("👁️ [Socket] STORY_VIEWED:", data?.storyId);
            DeviceEventEmitter.emit("story_viewed", data);
          });

          newSocket.on("STORY_REACTED", (data: any) => {
            console.log("❤️ [Socket] STORY_REACTED:", data?.storyId);
            DeviceEventEmitter.emit("story_reacted", data);
          });

          // ============ Notification Real-time Events ============
          newSocket.on("NEW_NOTIFICATION", async (data: any) => {
            console.log("📥 [Mobile Socket] Received NEW_NOTIFICATION:", data);
            
            // Play notification sound
            await playNotificationSound();
            
            // Refresh notifications list event
            DeviceEventEmitter.emit("refresh_notifications");
            
            // Resolve sender details to show beautiful in-app notification
            let senderName = "Ai đó";
            try {
              if (data.senderId) {
                const profile = await userService.getUserById(data.senderId);
                if (profile) {
                  senderName = profile.fullName;
                }
              }
            } catch (err) {
              console.log("Lỗi tải thông tin người gửi thông báo:", err);
            }
            
            // Show in-app notification popup
            DeviceEventEmitter.emit("show_in_app_notification", {
              title: "Thông báo mới",
              message: `${senderName} ${data.message}`,
              data: { 
                postId: data.postId, 
                commentId: data.commentId,
                type: data.type
              },
              type: "NEW_NOTIFICATION",
            });
          });

          // Lắng nghe trạng thái Online/Offline chung của các User khác
          newSocket.on(
            "USER_ONLINE",
            (data: { userId: string; status: "online" }) => {
              setOnlineUsers((prev) => ({
                ...prev,
                [data.userId]: { status: data.status },
              }));
            },
          );

          newSocket.on(
            "USER_OFFLINE",
            (data: {
              userId: string;
              status: "offline";
              last_active: number;
            }) => {
              setOnlineUsers((prev) => ({
                ...prev,
                [data.userId]: {
                  status: data.status,
                  last_active: data.last_active,
                },
              }));
            },
          );

          newSocket.on(
            "USER_STATUS_RESULT",
            (data: {
              userId: string;
              status: "online" | "offline";
              last_active?: number;
            }) => {
              setOnlineUsers((prev) => ({
                ...prev,
                [data.userId]: {
                  status: data.status,
                  last_active: data.last_active,
                },
              }));
            },
          );

          // Refresh Token handling
          const tokenRefreshListener = DeviceEventEmitter.addListener(
            "token_refreshed",
            async () => {
              console.log(
                "🔄 SocketContext detected token refresh -> Reconnecting Socket",
              );
              const newToken = await AsyncStorage.getItem("accessToken");
              if (newSocket && newToken) {
                newSocket.auth = { token: newToken };
                newSocket.disconnect().connect();
              }
            },
          );

          setSocket(newSocket);

          // Return listener to clean it up later via side effect cleanup
          (newSocket as any)._tokenListener = tokenRefreshListener;
        } catch (error) {
          console.error("Lỗi khởi tạo Socket:", error);
        }
      } else {
        // Nếu user logout -> Đóng Socket an toàn
        if (socket) {
          if ((socket as any)._tokenListener) {
            (socket as any)._tokenListener.remove();
          }
          socket.disconnect();
          setSocket(null);
          setIsConnected(false);
        }
      }
    };

    initSocket();

    // Dọn dẹp memory rác khi unmount ứng dụng
    return () => {
      if (newSocket) {
        if ((newSocket as any)._tokenListener) {
          (newSocket as any)._tokenListener.remove();
        }
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated]);

  const joinPost = (postId: string) => {
    if (socket && isConnected) {
      socket.emit("joinPost", postId);
    }
  };

  const leavePost = (postId: string) => {
    if (socket && isConnected) {
      socket.emit("leavePost", postId);
    }
  };

  const emitNewPost = (friendIds: string[], post: any) => {
    if (socket && isConnected) {
      socket.emit("EMIT_NEW_POST", { friendIds, post });
    }
  };

  const emitPostDeleted = (friendIds: string[], postId: string) => {
    if (socket && isConnected) {
      socket.emit("EMIT_POST_DELETED", { friendIds, postId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, fetchBulkPresence, joinPost, leavePost, emitNewPost, emitPostDeleted }}>
      {children}
    </SocketContext.Provider>
  );
}
