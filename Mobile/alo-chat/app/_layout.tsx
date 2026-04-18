import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import AppLockWrapper from "./components/AppLockWrapper";
import "../global.css";
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
configureReanimatedLogger({ strict: false, level: ReanimatedLogLevel.error });

// import { GoogleSignin } from "@react-native-google-signin/google-signin";

function RootLayoutNav() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;

    const authScreens = ["login", "register", "index"];
    const inAuthGroup =
      segments.length > 0 && authScreens.includes(segments[0]);

    if (isAuthenticated && inAuthGroup) {
      // Đã đăng nhập nhưng lại vào màn hình login -> Đẩy vào app chính
      router.replace("/(tabs)");
    } else if (!isAuthenticated && !inAuthGroup) {
      // Chưa đăng nhập mà truy cập màn hình trong app -> Đẩy ra login
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, segments]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="groups/create-group" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // GoogleSignin.configure({
    //   webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    //   iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // });
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <AppLockWrapper>
          <RootLayoutNav />
        </AppLockWrapper>
      </SocketProvider>
    </AuthProvider>
  );
}
