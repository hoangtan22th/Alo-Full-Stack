import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ArrowLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  VideoCameraIcon,
  UserPlusIcon,
  XMarkIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userService, UserProfileDTO } from "../../../services/userService";
import { contactService } from "../../../services/contactService";

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    userId,
    fullName,
    phone,
    avatarUrl,
    relationStatus,
    requestId,
    greetingMessage,
  } = useLocalSearchParams();

  const [userData, setUserData] = useState<UserProfileDTO | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(
    (relationStatus as string) || "NOT_FRIEND",
  );
  const [message, setMessage] = useState(
    "Xin chào, mình muốn kết bạn với bạn!",
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (userId) fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      const res = await userService.getUserById(userId as string);
      if (res) setUserData(res);
    } catch (error) {
      console.log("Tìm không thấy user");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const res = await contactService.sendFriendRequest(
        userId as string,
        message,
      );
      if (res) {
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
        setCurrentStatus("I_SENT_REQUEST");
      } else {
        Alert.alert("Lỗi", "Gửi lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!requestId) return;
    setActionLoading(true);
    try {
      const res = await contactService.declineRequest(requestId as string);
      if (res) {
        Alert.alert("Thành công", "Đã từ chối lời mời");
        setCurrentStatus("NOT_FRIEND");
      } else {
        Alert.alert("Lỗi", "Từ chối thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Cõ lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const res = await contactService.revokeRequest(userId as string);
      if (res) {
        Alert.alert("Thành công", "Đã thu hồi lời mời");
        setCurrentStatus("NOT_FRIEND");
      } else {
        Alert.alert("Lỗi", "Thu hồi thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!userId) return;
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bạn?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await contactService.removeFriend(userId as string);
            if (res) {
              Alert.alert("Thành công", "Đã xóa bạn");
              setCurrentStatus("NOT_FRIEND");
            } else {
              Alert.alert("Lỗi", "Xóa bạn thất bại");
            }
          } catch (error) {
            Alert.alert("Lỗi", "Có lỗi xảy ra");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Tính toán hiển thị an toàn
  const displayFullName =
    userData?.fullName || (fullName as string) || "Người dùng ẩn danh";
  const displayEmail = userData?.email || "Chưa cập nhật";
  const displayPhone =
    userData?.phoneNumber || (phone as string) || "Chưa cập nhật";
  const displayGender =
    userData?.gender === 1
      ? "Nam"
      : userData?.gender === 2
        ? "Nữ"
        : "Chưa cập nhật";
  const displayDob = userData?.dateOfBirth
    ? new Date(userData.dateOfBirth).toLocaleDateString("vi-VN")
    : "Chưa cập nhật";

  const displayAvatar = userData?.avatar
    ? { uri: userData.avatar }
    : (avatarUrl as string)
      ? { uri: avatarUrl as string }
      : {
          uri: `https://api.dicebear.com/7.x/initials/svg?seed=${displayFullName}`,
        };

  const displayCover = userData?.coverImage
    ? { uri: userData.coverImage }
    : {
        uri: "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=600",
      };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Nút Back - Được đặt position absolute để nổi đè lên trên ảnh bìa */}
      <TouchableOpacity
        className="absolute z-10 w-10 h-10 rounded-full bg-black/20 items-center justify-center left-4"
        style={{ top: insets.top + 10 }}
        onPress={() => router.back()}
      >
        <ArrowLeftIcon size={22} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          bounces={false}
        >
          {/* --- Phần 1: Bìa & Avatar --- */}
          {/* Căn chỉnh lại khoảng trống padding-top bằng 0, height tổng để tràn */}
          <View className="items-center bg-[#fff]">
            {/* Ảnh bìa - cho cao thêm chút xíu để bù tai thỏ */}
            <View
              className="w-full relative"
              style={{ height: 180 + (insets.top > 0 ? insets.top : 0) }}
            >
              <Image
                source={displayCover}
                className="w-full h-full bg-[#e5e7eb]"
                resizeMode="cover"
              />
            </View>

            {/* Avatar (Kéo đè lên ảnh bìa) */}
            <View className="-mt-[50px] relative z-20">
              <View className="w-[105px] h-[105px] rounded-full border-[4px] border-[#fafafa] bg-white overflow-hidden shadow-sm">
                <Image source={displayAvatar} className="w-full h-full" />
              </View>
              {/* Chấm trạng thái Online */}
              {userData?.isOnline && (
                <View className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-[#22c55e] border-[3px] border-white" />
              )}
            </View>
          </View>

          {/* --- Phần 2: Tên & Tiểu sử --- */}
          <View className="items-center mt-3 mb-6 bg-[#fff] pb-4">
            <Text className="text-[22px] font-bold text-gray-900 mb-1">
              {displayFullName}
            </Text>
            <Text className="text-[14px] text-gray-500">
              {displayEmail !== "Chưa cập nhật"
                ? displayEmail
                : "Giới thiệu bản thân..."}
            </Text>
          </View>

          {/* --- Phần 3: Chức năng dựa theo Status --- */}
          <View className="px-5 mb-8">
            {currentStatus === "ACCEPTED" && (
              <View
                className="flex-row justify-center mt-2"
                style={{ gap: 24 }}
              >
                <ActionButton
                  icon={
                    <ChatBubbleBottomCenterTextIcon size={22} color="#1f2937" />
                  }
                  label="NHẮN TIN"
                />
                <ActionButton
                  icon={<PhoneIcon size={22} color="#1f2937" />}
                  label="GỌI ĐIỆN"
                />
                <ActionButton
                  icon={<VideoCameraIcon size={24} color="#1f2937" />}
                  label="VIDEO"
                />
              </View>
            )}

            {currentStatus === "NOT_FRIEND" && (
              <View className="items-center w-full">
                <View className="w-full mb-4">
                  <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Lời nhắn kết bạn
                  </Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Nhập lời nhắn..."
                    className="w-full bg-[#f4f5f7] px-4 py-3.5 rounded-2xl text-[15px] text-gray-800"
                    maxLength={150}
                  />
                </View>
                <TouchableOpacity
                  className="w-full bg-blue-500 rounded-full py-4 items-center justify-center flex-row space-x-2"
                  onPress={handleSendRequest}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <UserPlusIcon size={20} color="#fff" />
                      <Text className="text-white font-bold text-[15px]">
                        Kết bạn
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {currentStatus === "I_SENT_REQUEST" && (
              <View className="items-center w-full">
                <View className="bg-gray-100 rounded-full py-3 w-full mb-3 items-center">
                  <Text className="text-gray-600 font-medium">
                    Đã gửi lời mời kết bạn
                  </Text>
                </View>
                {greetingMessage ? (
                  <View className="bg-[#f4f5f7] px-4 py-4 rounded-xl mb-3 w-full items-center">
                    <Text className="text-gray-700 text-[14px] italic text-center">
                      "{greetingMessage}"
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  className="w-full bg-gray-200 rounded-full py-4 items-center justify-center"
                  onPress={handleRevokeRequest}
                  disabled={actionLoading}
                >
                  <Text className="text-gray-800 font-bold text-[15px]">
                    Thu hồi lời mời
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStatus === "THEY_SENT_REQUEST" && (
              <View className="items-center w-full">
                <Text className="text-gray-800 text-[15px] mb-3 text-center px-4">
                  <Text className="font-semibold">{displayFullName}</Text> muốn
                  kết bạn với bạn
                </Text>
                {greetingMessage ? (
                  <View className="bg-[#f4f5f7] px-4 py-4 rounded-xl mb-4 w-full items-center">
                    <Text className="text-gray-700 text-[14px] italic text-center">
                      "{greetingMessage}"
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row w-full justify-between gap-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-blue-500 rounded-full py-4 items-center justify-center flex-row space-x-2"
                    onPress={handleAcceptRequest}
                    disabled={actionLoading}
                  >
                    <CheckIcon size={20} color="#fff" />
                    <Text className="text-white font-bold text-[15px] ml-1">
                      Chấp nhận
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 rounded-full py-4 items-center justify-center flex-row space-x-2"
                    onPress={handleDeclineRequest}
                    disabled={actionLoading}
                  >
                    <XMarkIcon size={20} color="#1f2937" />
                    <Text className="text-gray-800 font-bold text-[15px] ml-1">
                      Từ chối
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* --- Phần 4: Khối Thông tin Cá nhân --- */}
          <View className="px-5">
            <View className="bg-[#f9fafb] p-6 rounded-3xl border border-gray-100">
              <Text className="text-[12px] font-bold text-gray-500 tracking-widest mb-6">
                THÔNG TIN CÁ NHÂN
              </Text>

              <InfoRow label="SỐ ĐIỆN THOẠI" value={displayPhone} />
              <InfoRow label="GIỚI TÍNH" value={displayGender} />
              <InfoRow label="NGÀY SINH" value={displayDob} />
              <InfoRow label="EMAIL" value={displayEmail} isLast />
            </View>
          </View>

          {/* --- Phần 5: Cụm Nút Xóa/Chặn (Chỉ hiển thị khi là bạn bè) --- */}
          {currentStatus === "ACCEPTED" && (
            <View className="px-5 mt-10 space-y-3 pb-8">
              <TouchableOpacity className="w-full py-4 rounded-full border border-red-200 bg-white items-center justify-center mb-3">
                <Text className="text-[13px] font-bold text-red-600 uppercase tracking-wide">
                  Chặn người dùng
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full py-4 rounded-full border border-red-200 bg-white items-center justify-center"
                onPress={handleUnfriend}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#dc2626" size="small" />
                ) : (
                  <Text className="text-[13px] font-bold text-red-600 uppercase tracking-wide">
                    Xoá bạn
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// --- Component Phụ: Nút Chức Năng Tròn ---
function ActionButton({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity
      className="items-center"
      style={{ width: 64 }}
      activeOpacity={0.7}
    >
      <View className="w-14 h-14 bg-white rounded-full items-center justify-center mb-2 border border-gray-100 shadow-sm">
        {icon}
      </View>
      <Text className="text-[10px] text-gray-600 text-center font-bold tracking-wide uppercase leading-tight">
        {label.replace("\\n", "\n")}
      </Text>
    </TouchableOpacity>
  );
}

// --- Component Phụ: Dòng hiển thị thông tin ---
function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={isLast ? "" : "mb-5"}>
      <Text className="text-[11px] text-gray-500 font-medium mb-1 uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-base text-gray-900 font-medium">{value}</Text>
    </View>
  );
}
