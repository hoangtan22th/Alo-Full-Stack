import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, Alert } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

export type OnlineUser = {
  status: "online" | "offline";
  last_active?: number;
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, OnlineUser>;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>(
    {},
  );

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

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
