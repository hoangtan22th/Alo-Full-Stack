import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import {
  contactService,
  SearchFriendResponseDTO,
} from "../../../services/contactService";

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [greetingMessage, setGreetingMessage] = useState(
    "Xin chào, mình kết bạn nhé!",
  );
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] =
    useState<SearchFriendResponseDTO | null>(null);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    setLoading(true);
    setSearchResult(null);
    try {
      const result = await contactService.searchUserByPhone(phoneNumber);
      if (result) {
        setSearchResult(result);
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

  const handleSendRequest = async (recipientId: string) => {
    try {
      const response = await contactService.sendFriendRequest(
        recipientId,
        greetingMessage,
      );
      if (response) {
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
        setSearchResult((prev) =>
          prev
            ? {
                ...prev,
                relationStatus: "PENDING",
                friendshipStatus: undefined,
              }
            : null,
        );
      } else {
        Alert.alert("Lỗi", "Gửi lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi gửi lời mời");
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
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
                uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=Duy",
              }} // Thay bằng avatar thật
              className="w-full h-full rounded-full bg-gray-200"
            />
          </View>

          <Text className="text-lg font-bold text-gray-900 mb-1">
            Phan Tấn Duy
          </Text>
          <Text className="text-sm text-gray-500 mb-6">
            Quét mã để thêm bạn Alo với tôi
          </Text>

          {/* QR Code */}
          <View className="bg-white p-4 rounded-3xl shadow-sm">
            <Image
              // Dùng API tạo mã QR giả lập
              source={{
                uri: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PhanTanDuy",
              }}
              className="w-40 h-40"
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

        {/* --- Kết quả Tìm kiếm --- */}
        {searchResult && (
          <View className="bg-[#f9fafb] p-4 rounded-3xl mb-8 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <Image
                  source={
                    searchResult.avatarUrl
                      ? { uri: searchResult.avatarUrl }
                      : {
                          uri: `https://api.dicebear.com/7.x/initials/svg?seed=${searchResult.fullName}`,
                        }
                  }
                  className="w-14 h-14 rounded-full bg-gray-200"
                />
                <View className="ml-3 flex-1">
                  <Text
                    className="text-base font-bold text-gray-900 mb-1"
                    numberOfLines={1}
                  >
                    {searchResult.fullName}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {searchResult.phone}
                  </Text>
                </View>
              </View>

              <View className="ml-2">
                {searchResult.relationStatus === "NOT_FRIEND" ||
                !searchResult.relationStatus ? (
                  <TouchableOpacity
                    className="bg-black px-4 py-2 rounded-full"
                    onPress={() => handleSendRequest(searchResult.userId)}
                  >
                    <Text className="text-white font-medium text-sm">
                      Kết bạn
                    </Text>
                  </TouchableOpacity>
                ) : searchResult.relationStatus === "PENDING" ||
                  searchResult.relationStatus === "YOU_SENT_REQUEST" ? (
                  <View className="bg-gray-200 px-4 py-2 rounded-full">
                    <Text className="text-gray-600 font-medium text-sm">
                      Đã gửi
                    </Text>
                  </View>
                ) : searchResult.relationStatus === "THEY_SENT_REQUEST" ? (
                  <View className="bg-gray-200 px-4 py-2 rounded-full">
                    <Text className="text-gray-600 font-medium text-sm">
                      Đã nhận lời mời
                    </Text>
                  </View>
                ) : searchResult.relationStatus === "ACCEPTED" ? (
                  <View className="bg-gray-200 px-4 py-2 rounded-full">
                    <Text className="text-gray-600 font-medium text-sm">
                      Bạn bè
                    </Text>
                  </View>
                ) : (
                  <View className="bg-gray-200 px-4 py-2 rounded-full">
                    <Text className="text-gray-600 font-medium text-sm">
                      {searchResult.relationStatus}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Ô nhập lời mời kết bạn (chỉ hiện khi chưa là bạn) */}
            {(searchResult.relationStatus === "NOT_FRIEND" ||
              !searchResult.relationStatus) && (
              <View className="bg-white rounded-xl px-4 py-2 border border-gray-100">
                <TextInput
                  className="text-sm text-gray-800"
                  placeholder="Nhập lời mời kết bạn..."
                  placeholderTextColor="#9ca3af"
                  value={greetingMessage}
                  onChangeText={setGreetingMessage}
                  multiline
                  maxLength={100}
                />
              </View>
            )}
          </View>
        )}

        {/* 4. Các menu chức năng khác */}
        <View className="px-2">
          <ActionMenu
            icon={<QrCodeIcon size={24} color="#3b82f6" />} // Màu xanh dương
            title="Quét mã QR"
            showBorder={true}
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
}: {
  icon: any;
  title: string;
  showBorder: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-5 ${showBorder ? "border-b border-gray-100" : ""}`}
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
