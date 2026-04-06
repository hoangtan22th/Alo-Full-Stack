import { Stack } from "expo-router";

export default function GroupsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Screen name="create-group" />
    </Stack>
  );
}
