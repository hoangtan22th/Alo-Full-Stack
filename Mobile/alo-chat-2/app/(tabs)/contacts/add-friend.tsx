import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  QrCodeIcon,
  UserPlusIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import {
  contactService,
  SearchFriendResponseDTO,
} from "../../../services/contactService";
import QRCode from "react-native-qrcode-svg";

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    setLoading(true);
    try {
      const result = await contactService.searchUserByPhone(phoneNumber);
      if (result) {
        router.push({
          pathname: "/contacts/send-request",
          params: {
            userId: result.userId,
            fullName: result.fullName,
            phone: result.phone,
            avatarUrl: result.avatarUrl || "",
            relationStatus: result.relationStatus || "NOT_FRIEND",
          },
        });
      } else {
        Alert.alert(
          "Thông báo",
          "Không tìm thấy người dùng với số điện thoại này",
        );
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
    >
      {/* 1. Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Thêm bạn</Text>
        <TouchableOpacity>
          <EllipsisVerticalIcon size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      >
        {/* 2. Thẻ QR Code Cá nhân */}
        <View className="bg-[#f2f7fd] rounded-[32px] items-center p-8 mt-4 mb-8">
          {/* Avatar đè lền trên */}
          <View className="w-[60px] h-[60px] rounded-full border-2 border-white shadow-sm mb-3">
            <Image
              source={{
                uri:
                  user?.avatar ||
                  "https://api.dicebear.com/7.x/avataaars/svg?seed=Duy",
              }} // Thay bằng avatar thật
              className="w-full h-full rounded-full bg-gray-200"
            />
          </View>

          <Text className="text-lg font-bold text-gray-900 mb-1">
            {user?.fullName || "Đang tải..."}
          </Text>
          <Text className="text-sm text-gray-500 mb-6">
            Quét mã để thêm bạn Alo với tôi
          </Text>

          {/* QR Code */}
          <View className="bg-white p-4 rounded-3xl shadow-sm items-center justify-center">
            <QRCode
              value={user?.phoneNumber || user?.phone || "0000000000"}
              size={200}
            />
          </View>
        </View>

        {/* 3. Ô nhập số điện thoại */}
        <View className="flex-row items-center justify-between mb-8">
          <View className="flex-1 flex-row items-center bg-[#f4f5f7] h-14 rounded-full px-4 mr-3">
            {/* Mã vùng */}
            <TouchableOpacity className="flex-row items-center mr-2 pr-2 border-r border-gray-300">
              <Text className="text-base font-semibold text-gray-900 mr-1">
                +84
              </Text>
              <ChevronDownIcon size={14} color="#6b7280" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 text-base text-gray-900"
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          {/* Nút Submit */}
          <TouchableOpacity
            className="w-14 h-14 bg-black rounded-full items-center justify-center shadow-md"
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ArrowRightIcon size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* 4. Các menu chức năng khác */}
        <View className="px-2">
          <ActionMenu
            icon={<QrCodeIcon size={24} color="#3b82f6" />} // Màu xanh dương
            title="Quét mã QR"
            showBorder={true}
            onPress={() => router.push("/contacts/scan-qr")}
          />
          <ActionMenu
            icon={<UserPlusIcon size={24} color="#f97316" />} // Màu cam
            title="Bạn bè có thể quen"
            showBorder={false}
          />
        </View>

        {/* 5. Footer Text */}
        <View className="mt-auto pt-10 pb-4">
          <Text className="text-center text-sm text-gray-400">
            Xem lời mời kết bạn đã gửi tại trang{" "}
            <Text className="font-semibold text-gray-600 underline">
              Danh bạ Alo
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Component Phụ ---
function ActionMenu({
  icon,
  title,
  showBorder,
  onPress,
}: {
  icon: any;
  title: string;
  showBorder: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-5 ${showBorder ? "border-b border-gray-100" : ""}`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="w-10 items-center justify-center">{icon}</View>
        <Text className="text-base font-semibold text-gray-900 ml-2">
          {title}
        </Text>
      </View>
      <ChevronRightIcon size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}
