import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  contactService,
  FriendshipResponseDTO,
} from "../../../services/contactService";

export default function SentRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<FriendshipResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await contactService.getSentRequests();
      setRequests(data || []);
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải danh sách lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (recipientId: string) => {
    try {
      // Dùng hàm revoke request trong contactService
      const success = await contactService.revokeRequest(recipientId);
      if (success) {
        Alert.alert("Thành công", "Đã thu hồi lời mời kết bạn");
        setRequests((prev) =>
          prev.filter((req) => req.recipientId !== recipientId),
        );
      } else {
        Alert.alert("Lỗi", "Thu hồi thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi");
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Lời mời đã gửi</Text>
      </View>

      {/* 2. Thanh tìm kiếm */}
      <View className="px-4 mt-2 mb-2">
        <View className="flex-row items-center bg-[#f4f5f7] rounded-2xl px-4 py-3.5">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm lời mời..."
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-3 text-base text-gray-800"
          />
        </View>
      </View>

      {/* 3. Danh sách lời mời đã gửi */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-2 text-gray-500">Đang tải lời mời...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-lg">Chưa gửi lời mời nào</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} // Đệm đáy để không bị lẹm TabBar
        >
          {requests.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              onRevoke={() => handleRevoke(request.recipientId)}
              onPress={() => {
                const displayName =
                  request.recipientName ||
                  request.requesterName ||
                  "Người dùng ẩn danh";
                const displayAvatar =
                  request.recipientAvatar || request.requesterAvatar || "";
                router.push({
                  pathname: "/(tabs)/contacts/send-request",
                  params: {
                    userId: request.recipientId,
                    fullName: displayName,
                    phone: "Ẩn",
                    avatarUrl: displayAvatar,
                    relationStatus: "I_SENT_REQUEST",
                    requestId: request.id,
                    greetingMessage: request.greetingMessage || "",
                  },
                });
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// --- Component phụ cho từng dòng Lời mời ---
function RequestItem({
  request,
  onRevoke,
  onPress,
}: {
  request: FriendshipResponseDTO;
  onRevoke: () => void;
  onPress: () => void;
}) {
  const displayAvatar =
    request.recipientAvatar || request.requesterAvatar || "";
  const displayName =
    request.recipientName || request.requesterName || "Người dùng ẩn danh";

  return (
    <View className="flex-row items-center justify-between px-4 py-4">
      {/* Cụm Avatar và Info */}
      <TouchableOpacity
        className="flex-row items-center flex-1 pr-4"
        activeOpacity={0.7}
        onPress={onPress}
      >
        <Image
          source={
            displayAvatar
              ? { uri: displayAvatar }
              : {
                  uri: `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`,
                }
          }
          className="w-14 h-14 rounded-full bg-gray-200"
        />
        <View className="ml-4 flex-1 justify-center">
          <Text className="text-[17px] font-semibold text-gray-900 mb-0.5">
            {displayName}
          </Text>
          <Text className="text-[13px] text-gray-500" numberOfLines={1}>
            {request.greetingMessage || "Từ số điện thoại"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Nút Thu hồi */}
      <TouchableOpacity
        className="bg-[#f4f5f7] px-5 py-2.5 rounded-full items-center justify-center"
        activeOpacity={0.7}
        onPress={onRevoke}
      >
        <Text className="text-gray-800 font-medium text-[14.5px]">Thu hồi</Text>
      </TouchableOpacity>
    </View>
  );
}
