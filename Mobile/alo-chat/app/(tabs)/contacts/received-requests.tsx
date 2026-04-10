import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  contactService,
  FriendshipResponseDTO,
} from "../../../services/contactService";

export default function ReceivedRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<FriendshipResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // State để quản lý việc đóng/mở section "Cũ hơn" - có thể dùng nếu có chia thời gian, tạm thời gộp chung
  const [isOlderExpanded, setIsOlderExpanded] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await contactService.getPendingRequests();
      setRequests(data || []);
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải danh sách lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      const res = await contactService.acceptRequest(id);
      if (res) {
        Alert.alert("Thành công", "Đã chấp nhận lời mời kết bạn");
        setRequests((prev) => prev.filter((req) => req.id !== id));
      } else {
        Alert.alert("Lỗi", "Chấp nhận lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const success = await contactService.declineRequest(id);
      if (success) {
        Alert.alert("Thành công", "Đã từ chối lời mời kết bạn");
        setRequests((prev) => prev.filter((req) => req.id !== id));
      } else {
        Alert.alert("Lỗi", "Từ chối lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi");
    }
  };

  return (
    <View className="flex-1 bg-[#fafafa]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-[#fafafa] border-b-[1px] border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Lời mời kết bạn</Text>
        <TouchableOpacity>
          <EllipsisHorizontalIcon size={28} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-2 text-gray-500">Đang tải lời mời...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-lg">Không có lời mời nào</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} // Đệm đáy
        >
          {/* Mục YÊU CẦU MỚI */}
          <View className="mt-4 mb-2">
            <Text className="text-[11px] font-bold text-gray-500 tracking-wider mb-4 px-1">
              YÊU CẦU MỚI ({requests.length})
            </Text>

            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onAccept={() => handleAccept(req.id)}
                onDecline={() => handleDecline(req.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// --- Component Card hiển thị 1 Lời mời ---
function RequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendshipResponseDTO;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="bg-white p-5 rounded-[28px] mb-4 border-[1px] border-gray-200"
      onPress={() =>
        router.push({
          pathname: "/contacts/send-request",
          params: {
            userId: request.requesterId,
            fullName: request.requesterName,
            phone: "Ẩn", // Hoặc request.requesterPhone nếu có
            avatarUrl: request.requesterAvatar,
            relationStatus: "THEY_SENT_REQUEST",
            requestId: request.id,
            greetingMessage: request.greetingMessage || "",
          },
        })
      }
    >
      {/* Info Row: Avatar, Name, Source, Time */}
      <View className="flex-row items-start mb-3">
        <Image
          source={
            request.requesterAvatar
              ? { uri: request.requesterAvatar }
              : {
                  uri: `https://api.dicebear.com/7.x/initials/svg?seed=${request.requesterName}`,
                }
          }
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        <View className="flex-1 ml-3 justify-center pt-0.5">
          <Text className="text-base font-bold text-gray-900 leading-tight">
            {request.requesterName}
          </Text>
          <Text className="text-[13px] text-gray-500 mt-0.5">
            Từ số điện thoại
          </Text>
        </View>
      </View>

      {/* Message Bubble (Chỉ hiển thị nếu có lời nhắn) */}
      {request.greetingMessage ? (
        <View className="bg-[#f4f5f7] p-4 rounded-2xl mb-4">
          <Text className="text-[14.5px] text-gray-700 leading-relaxed">
            {request.greetingMessage}
          </Text>
        </View>
      ) : (
        <View className="h-2" /> // Khoảng trống nhỏ nếu không có tin nhắn
      )}

      {/* Action Buttons */}
      <View className="flex-row items-center space-x-3 gap-x-3">
        {/* Nút Đồng ý */}
        <TouchableOpacity
          className="flex-1 bg-black py-3.5 rounded-full items-center justify-center shadow-sm"
          onPress={onAccept}
        >
          <Text className="text-white text-[15px] font-bold">Đồng ý</Text>
        </TouchableOpacity>

        {/* Nút Từ chối */}
        <TouchableOpacity
          className="flex-1 bg-[#f4f5f7] py-3.5 rounded-full items-center justify-center"
          onPress={onDecline}
        >
          <Text className="text-gray-900 text-[15px] font-bold">Từ chối</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
