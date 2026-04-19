import { View, ActivityIndicator, DeviceEventEmitter } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import AppLockWrapper from "./components/AppLockWrapper";
import InAppNotification from "../components/ui/InAppNotification";
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

  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: string;
    data: any;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "",
    data: null,
  });

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener(
      "show_in_app_notification",
      (data) => {
        setNotification({
          visible: true,
          title: data.title,
          message: data.message,
          type: data.type,
          data: data.data,
        });
      },
    );

    return () => {
      showSub.remove();
    };
  }, []);

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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="groups/create-group" />
      </Stack>

      <InAppNotification
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
        onHide={() => setNotification((prev) => ({ ...prev, visible: false }))}
        onPress={() => {
          if (notification.type === "JOIN_REQUEST") {
            if (notification.data?.groupId) {
              router.push({
                pathname: "/chat/pending-members",
                params: { id: notification.data.groupId },
              });
            }
          } else if (notification.type === "JOIN_APPROVED") {
            if (notification.data?.groupId) {
              router.push({
                pathname: `/chat/${notification.data.groupId}` as any,
                params: {
                  name: notification.data.name,
                  avatar: notification.data.avatar,
                  membersCount: String(notification.data.membersCount),
                  isGroup: "true",
                },
              });
            }
          }
        }}
      />
    </>
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
