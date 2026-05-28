import { Stack } from "expo-router";

export default function ContactsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Màn hình chính của tab Danh bạ */}
      <Stack.Screen name="index" />

      {/* Các màn hình con */}
      <Stack.Screen name="add-friend" />
      <Stack.Screen name="received-requests" />
      <Stack.Screen name="sent-requests" />
    </Stack>
  );
}
