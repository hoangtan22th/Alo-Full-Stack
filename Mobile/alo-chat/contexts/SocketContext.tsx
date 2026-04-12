import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
