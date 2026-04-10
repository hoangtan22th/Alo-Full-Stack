import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../services/api";

export default function MainProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { signOut, user, refreshUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn thoát tài khoản?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thoát",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post("/auth/logout");
          } catch (e) {}
          // signOut() sẽ xóa token + cập nhật trạng thái -> _layout.tsx tự chuyển về Login
          await signOut();
        },
      },
    ]);
  };

  return (
    // Dùng class NativeWind thay cho style backgroundColor
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b-[1px] border-gray-200">
        <TouchableOpacity>
          {/* <Ionicons name="settings-outline" size={24} color="#000" /> */}
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Cá nhân</Text>
        <TouchableOpacity>
          {/* <Ionicons name="search-outline" size={24} color="#000" /> */}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-[#f9fafb]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]} // Android
            tintColor="#000" // iOS
          />
        }
        // Thêm flexGrow: 1 để ScrollView có thể giãn hết chiều cao, paddingBottom để không bị lẹm TabBar
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 120,
        }}
      >
        {/* Nhóm các nội dung phía trên lại */}
        <View>
          {/* Profile Card */}
          <TouchableOpacity
            className="bg-white p-4 rounded-3xl flex-row items-center justify-between mb-6 border-[1px] border-gray-200"
            onPress={() => router.push("/profile/edit")}
          >
            <View className="flex-row items-center flex-1">
              <Image
                source={{
                  uri:
                    user?.avatar ||
                    "https://api.dicebear.com/7.x/avataaars/png?seed=Felix",
                }}
                className="w-16 h-16 rounded-full bg-gray-200"
              />
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-gray-900 mb-1">
                  {user?.fullName || "Nguyễn Hoàng Tấn"}
                </Text>
                <Text className="text-sm text-gray-500">Xem trang cá nhân</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Menu Items */}
          <MenuOption
            icon={<Ionicons name="qr-code-outline" size={22} color="#4b5563" />}
            title="Quét mã QR đăng nhập Web"
            onPress={() => router.push("/profile/scan-qr")}
          />
          <MenuOption
            icon={
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#4b5563"
              />
            }
            title="Tài khoản và bảo mật"
            onPress={() => router.push("/profile/account-security")}
          />
          <MenuOption
            icon={
              <Ionicons name="lock-closed-outline" size={22} color="#4b5563" />
            }
            title="Quyền riêng tư"
            onPress={() => router.push("/profile/privacy")}
          />
        </View>

        {/* Nút Đăng xuất: Dùng mt-auto để đẩy nó xuống dưới đáy */}
        <TouchableOpacity
          className="flex-row justify-center items-center mt-auto py-3 gap-2"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
          <Text className="text-red-600 font-semibold text-base">
            Đăng xuất
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Component phụ
function MenuOption({
  icon,
  title,
  onPress,
}: {
  icon: any;
  title: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-white p-5 rounded-3xl flex-row items-center justify-between mb-4 border-[1px] border-gray-200"
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
          {icon}
        </View>
        <Text className="text-base font-medium text-gray-900">{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
