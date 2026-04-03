import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

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
          shadowOpacity: 0.05,
          shadowRadius: 10, // Shadow iOS
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Liên hệ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Nhóm",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
