import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, Alert } from "react-native";
import api from "../services/api";

type AuthContextType = {
  isAuthenticated: boolean;
  isReady: boolean;
  user: any | null;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isReady: false,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res);
      await AsyncStorage.setItem("userData", JSON.stringify(res));
    } catch (err) {
      console.log("Lỗi tải thông tin user context:", err);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (token) {
          const cachedUser = await AsyncStorage.getItem("userData");
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
          setIsAuthenticated(true);
          // Lấy lại user data ngầm để đề phòng cập nhật phiên
          fetchProfile().catch(console.error);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsReady(true);
      }
    };
    checkToken();

    // Lắng nghe sự kiện force_logout từ api.ts (khi token hết hạn mà không refresh được)
    const subscription = DeviceEventEmitter.addListener("force_logout", () => {
      Alert.alert(
        "Đã đăng xuất",
        "Tài khoản của bạn đã bị đăng xuất từ xa hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        [{ text: "Đã hiểu" }],
      );
      signOut();
    });

    return () => subscription.remove();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    await AsyncStorage.setItem("refreshToken", refreshToken);

    // Lấy thông tin user ngay khi login (Gắn kèm thủ công token luôn do interceptor lúc này chưa chắc đã lấy kịp giá trị thay đổi từ cục bộ)
    try {
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser(res);
      await AsyncStorage.setItem("userData", JSON.stringify(res));
    } catch (err) {
      console.error("Lấy thông tin User khi login lỗi:", err);
    }

    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("userData");
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isReady, user, signIn, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
