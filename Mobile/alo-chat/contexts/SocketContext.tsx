import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

          setSocket(newSocket);
        } catch (error) {
          console.error("Lỗi khởi tạo Socket:", error);
        }
      } else {
        // Nếu user logout -> Đóng Socket an toàn
        if (socket) {
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
