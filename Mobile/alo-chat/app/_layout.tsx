import { View, ActivityIndicator, DeviceEventEmitter } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments, useLocalSearchParams } from "expo-router";
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
  const searchParams = useLocalSearchParams();

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
        // Kiểm tra nếu là thông báo bị mời ra khỏi nhóm
        if (data.type === "REMOVED") {
          const groupId = data.data?.groupId;
          const currentPathId = segments[1];
          const queryId = searchParams.id;

          // Nếu đang ở màn hình chat của nhóm đó hoặc màn hình info của nhóm đó
          // ['chat', 'id'] hoặc ['chat', 'info'] với ?id=...
          const isAtChat = segments[0] === "chat" && currentPathId === groupId;
          const isAtInfo =
            segments[0] === "chat" &&
            currentPathId === "info" &&
            queryId === groupId;

          if (isAtChat || isAtInfo) {
            console.log(
              "User is currently on the group screen, letting local Alert handle it.",
            );
            return;
          }
        }

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
          } else if (notification.type === "REMINDER") {
            if (notification.data?.groupId) {
              router.push({
                pathname: `/chat/${notification.data.groupId}` as any,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SocketProvider>
          <AppLockWrapper>
            <RootLayoutNav />
          </AppLockWrapper>
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
