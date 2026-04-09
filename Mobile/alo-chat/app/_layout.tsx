import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import AppLockWrapper from "./components/AppLockWrapper";
import "../global.css";
// import { GoogleSignin } from "@react-native-google-signin/google-signin";

function RootLayoutNav() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (isAuthenticated && !inTabsGroup) {
      router.replace("/(tabs)");
    } else if (!isAuthenticated && inTabsGroup) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
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
      <AppLockWrapper>
        <RootLayoutNav />
      </AppLockWrapper>
    </AuthProvider>
  );
}
