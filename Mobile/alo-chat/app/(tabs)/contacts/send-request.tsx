import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { contactService } from "../../../services/contactService";
import { userService, UserProfileDTO } from "../../../services/userService";

export default function SendRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Nhận dữ liệu truyền qua params
  const { userId, fullName, phone, avatarUrl, relationStatus, requestId } =
    useLocalSearchParams();

  // Kiểm tra trạng thái hiện tại
  const isNotFriend = relationStatus === "NOT_FRIEND";
  const isAlreadyFriend = relationStatus === "ACCEPTED";
  const isYouSent =
    relationStatus === "YOU_SENT_REQUEST" || relationStatus === "PENDING"; // Do PENDING từ send-request = đã gửi
  const isTheySent = relationStatus === "THEY_SENT_REQUEST";

  const defaultMsg =
    "Xin chào, mình tìm thấy bạn qua số điện thoại. Kết bạn với mình nhé!";
  const [message, setMessage] = useState(defaultMsg);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(relationStatus);
  const [userData, setUserData] = useState<UserProfileDTO | null>(null);

  React.useEffect(() => {
    if (userId) {
      userService.getUserById(userId as string).then((res) => {
        if (res) {
          setUserData(res);
        }
      });
    }
  }, [userId]);

  const displayAvatar = userData?.avatar
    ? { uri: userData.avatar }
    : avatarUrl
      ? { uri: avatarUrl as string }
      : { uri: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}` };

  const displayFullName =
    userData?.fullName || fullName || "Người dùng ẩn danh";
  const displayPhone = userData?.phoneNumber || phone || "Chưa cập nhật";
  const displayGender =
    userData?.gender === 1
      ? "Nam"
      : userData?.gender === 2
        ? "Nữ"
        : "Chưa cập nhật";
  const displayEmail = userData?.email || "Đang cập nhật...";
  // Ngày sinh đơn giản
  const displayDob = userData?.dateOfBirth
    ? new Date(userData.dateOfBirth).toLocaleDateString("vi-VN")
    : "01/01/2000";

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const response = await contactService.sendFriendRequest(
        userId as string,
        message,
      );
      if (response) {
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
        setCurrentStatus("YOU_SENT_REQUEST");
      } else {
        Alert.alert("Lỗi", "Gửi lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi gửi lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return; // Cần requestId để accept
    setLoading(true);
    try {
      const res = await contactService.acceptRequest(requestId as string);
      if (res) {
        Alert.alert("Thành công", "Đã trở thành bạn bè");
        setCurrentStatus("ACCEPTED");
      } else {
        Alert.alert("Lỗi", "Chấp nhận lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await contactService.declineRequest(requestId as string);
      if (res) {
        Alert.alert("Thành công", "Đã từ chối lời mời");
        setCurrentStatus("NOT_FRIEND");
      } else {
        Alert.alert("Lỗi", "Từ chối lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể từ chối lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    setLoading(true);
    try {
      const res = await contactService.revokeRequest(userId as string);
      if (res) {
        Alert.alert("Thành công", "Đã thu hồi lời mời");
        setCurrentStatus("NOT_FRIEND");
      } else {
        Alert.alert("Lỗi", "Thu hồi lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thu hồi lời mời");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* 1. Header */}
        <View className="flex-row items-center px-4 py-3 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeftIcon size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            Thông tin tài khoản
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140, flexGrow: 1 }}
        >
          {/* 2. Ảnh đại diện và Thông tin nổi bật */}
          <View className="items-center mt-8 mb-8">
            <Image
              source={displayAvatar}
              className="w-28 h-28 rounded-full bg-gray-200 border-4 border-white shadow-sm mb-4"
            />
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              {displayFullName}
            </Text>
            <Text className="text-[15px] text-gray-500 mb-1">
              {displayPhone}
            </Text>
          </View>

          {/* Action Section dựa trên currentStatus */}
          {currentStatus === "ACCEPTED" && (
            <View className="mt-4 px-4 items-center">
              <View className="bg-green-50 py-3 rounded-xl shadow-sm border border-green-200 w-full items-center">
                <Text className="text-green-700 font-bold text-base">
                  Bạn bè
                </Text>
                <Text className="text-green-600 text-xs mt-0.5">
                  Hai bạn đã là bạn bè
                </Text>
              </View>
            </View>
          )}

          {/* Thông tin cơ bản (Demo hiển thị thêm thông tin người dùng) */}
          <View className="mt-6 px-4">
            <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
              Thông tin cơ bản
            </Text>
            <View className="bg-[#f4f5f7] rounded-[24px] p-5 border border-gray-100">
              <View className="flex-row items-start pb-4 border-b border-gray-200">
                <Text className="text-gray-500 w-24 text-sm font-medium">
                  Điện thoại
                </Text>
                <Text className="text-gray-900 font-medium text-[15px] flex-1">
                  {displayPhone}
                </Text>
              </View>
              <View className="flex-row items-start py-4 border-b border-gray-200">
                <Text className="text-gray-500 w-24 text-sm font-medium">
                  Giới tính
                </Text>
                <Text className="text-gray-900 font-medium text-[15px] flex-1">
                  {displayGender}
                </Text>
              </View>
              <View className="flex-row items-start py-4 border-b border-gray-200">
                <Text className="text-gray-500 w-24 text-sm font-medium">
                  Ngày sinh
                </Text>
                <Text className="text-gray-900 font-medium text-[15px] flex-1">
                  {displayDob}
                </Text>
              </View>
              <View className="flex-row items-start pt-4">
                <Text className="text-gray-500 w-24 text-sm font-medium">
                  Email
                </Text>
                <Text className="text-gray-900 font-medium text-[15px] flex-1">
                  {displayEmail}
                </Text>
              </View>
            </View>
          </View>

          {currentStatus === "YOU_SENT_REQUEST" && (
            <View className="mt-4 px-4 items-center">
              <View className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 w-full items-center mb-4">
                <Text className="text-gray-700 font-bold text-lg">
                  Đã gửi lời mời
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Chờ người này xác nhận
                </Text>
              </View>
              <TouchableOpacity
                className="w-full bg-red-100 py-3.5 rounded-xl"
                onPress={handleRevokeRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <Text className="text-center font-bold text-red-600">
                    Thu hồi lời mời
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentStatus === "THEY_SENT_REQUEST" && (
            <View className="mt-4 px-4">
              <View className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 w-full items-center mb-4">
                <Text className="text-blue-800 font-bold text-lg">
                  Lời mời kết bạn
                </Text>
                <Text className="text-blue-600 text-sm mt-1">
                  {fullName} muốn kết bạn với bạn
                </Text>
              </View>
              <View className="flex-row space-x-3 w-full">
                <TouchableOpacity
                  className="flex-1 bg-black rounded-full py-4 items-center justify-center"
                  onPress={handleAcceptRequest}
                  disabled={loading}
                >
                  <Text className="text-white font-bold">Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-full py-4 items-center justify-center"
                  onPress={handleDeclineRequest}
                  disabled={loading}
                >
                  <Text className="text-gray-800 font-bold">Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentStatus === "NOT_FRIEND" && (
            <>
              {/* 3. Khung nhập lời nhắn kết bạn */}
              <View className="mb-6">
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                  Lời nhắn kết bạn
                </Text>
                <View className="bg-[#f4f5f7] rounded-3xl p-4 border border-gray-100">
                  <TextInput
                    className="text-base text-gray-800 leading-6"
                    multiline={true}
                    numberOfLines={4}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Nhập lời nhắn của bạn..."
                    placeholderTextColor="#9ca3af"
                    style={{ minHeight: 100, textAlignVertical: "top" }}
                    maxLength={150}
                  />
                  {/* Bộ đếm ký tự */}
                  <Text className="text-right text-xs text-gray-400 mt-2">
                    {message.length}/150
                  </Text>
                </View>
              </View>

              {/* 4. Các nút hành động nằm dưới đáy */}
              <View className="mt-auto flex-row items-center space-x-3 pt-6">
                <TouchableOpacity
                  className="flex-1 bg-[#f4f5f7] py-4 rounded-full items-center justify-center"
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-900 text-base font-bold">Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-black py-4 rounded-full items-center justify-center shadow-sm"
                  onPress={handleSendRequest}
                  disabled={loading || !message.trim()}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white text-base font-bold">
                      Gửi lời mời
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
