import { Tabs } from "expo-router";
import { Platform } from "react-native";
import {
  ChatBubbleLeftEllipsisIcon as ChatOutlineIcon,
  Cog6ToothIcon as Cog6OutlineIcon,
  UserGroupIcon as UserGroupOutlineIcon,
  UsersIcon as UserOutlineIcon,
} from "react-native-heroicons/outline";
import {
  ChatBubbleLeftEllipsisIcon as ChatSolidIcon,
  Cog6ToothIcon as Cog6SolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  UsersIcon as UserSolidIcon,
} from "react-native-heroicons/solid";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#999999",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginTop: 4 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#ffffff",
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          paddingTop: 10,
          elevation: 10, // Shadow Android
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.09,
          shadowRadius: 10, // Shadow iOS
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <ChatSolidIcon size={24} color={color} />
            ) : (
              <ChatOutlineIcon size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Liên hệ",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <UserSolidIcon size={24} color={color} />
            ) : (
              <UserOutlineIcon size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Nhóm",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <UserGroupSolidIcon size={24} color={color} />
            ) : (
              <UserGroupOutlineIcon size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Cog6SolidIcon size={24} color={color} />
            ) : (
              <Cog6OutlineIcon size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
