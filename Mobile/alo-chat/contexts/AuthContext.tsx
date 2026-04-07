import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

type AuthContextType = {
  isAuthenticated: boolean;
  isReady: boolean;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isReady: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        setIsAuthenticated(!!token);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsReady(true);
      }
    };
    checkToken();

    // Lắng nghe sự kiện force_logout từ api.ts (khi token hết hạn mà không refresh được)
    const subscription = DeviceEventEmitter.addListener('force_logout', () => {
      setIsAuthenticated(false);
    });

    return () => subscription.remove();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    await AsyncStorage.setItem("refreshToken", refreshToken);
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isReady, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
