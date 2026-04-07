import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Dữ liệu Giả lập (Mock Data) ---
const NEW_REQUESTS = [
  {
    id: "1",
    name: "Minh Anh Cao",
    source: "Từ số điện thoại",
    time: "2 giờ trước",
    message:
      "Chào anh, em thấy số của anh trong nhóm thiết kế UI/UX, em muốn làm quen để trao đổi thêm ạ.",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=MinhAnh&backgroundColor=f3f4f6",
  },
  {
    id: "2",
    name: "Lê Hoàng Nam",
    source: "3 bạn chung",
    time: "8 giờ trước",
    message:
      "Mình là đồng nghiệp cũ của anh Tuấn, rất vui được kết nối với bạn.",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Nam&backgroundColor=e5e7eb",
  },
  {
    id: "3",
    name: "Thanh Vân",
    source: "Từ tìm kiếm",
    time: "1 ngày trước",
    message:
      "Chào bạn, mình thấy profile của bạn rất ấn tượng nên muốn add để học hỏi.",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Van&backgroundColor=fecaca",
  },
];

const OLDER_REQUESTS = [
  {
    id: "4",
    name: "Quốc Bảo",
    source: "12 bạn chung",
    time: "1 tuần trước",
    message: "Xin chào, kết bạn nhé!",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Bao&backgroundColor=bfdbfe",
  },
  {
    id: "5",
    name: "Hoàng Yến",
    source: "Gợi ý kết bạn",
    time: "2 tuần trước",
    message: "", // Trường hợp không có tin nhắn đính kèm
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Yen&backgroundColor=bbf7d0",
  },
];

export default function ReceivedRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State để quản lý việc đóng/mở section "Cũ hơn"
  const [isOlderExpanded, setIsOlderExpanded] = useState(false);

  return (
    <View className="flex-1 bg-[#fafafa]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-[#fafafa]">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Lời mời kết bạn</Text>
        <TouchableOpacity>
          <EllipsisHorizontalIcon size={28} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Đệm đáy
      >
        {/* Mục YÊU CẦU MỚI */}
        <View className="mt-4 mb-2">
          <Text className="text-[11px] font-bold text-gray-500 tracking-wider mb-4 px-1">
            YÊU CẦU MỚI ({NEW_REQUESTS.length})
          </Text>

          {NEW_REQUESTS.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </View>

        {/* Mục CŨ HƠN (Có thể thu gọn) */}
        <View className="mt-6">
          <TouchableOpacity
            className="flex-row justify-between items-center mb-4 px-1"
            onPress={() => setIsOlderExpanded(!isOlderExpanded)}
            activeOpacity={0.7}
          >
            <Text className="text-[11px] font-bold text-gray-500 tracking-wider">
              CŨ HƠN ({OLDER_REQUESTS.length})
            </Text>
            {isOlderExpanded ? (
              <ChevronUpIcon size={18} color="#6b7280" />
            ) : (
              <ChevronDownIcon size={18} color="#6b7280" />
            )}
          </TouchableOpacity>

          {/* Render danh sách cũ nếu isOlderExpanded = true */}
          {isOlderExpanded && (
            <View>
              {OLDER_REQUESTS.map((req) => (
                <RequestCard key={req.id} request={req} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// --- Component Card hiển thị 1 Lời mời ---
function RequestCard({ request }: { request: any }) {
  return (
    <View className="bg-white p-5 rounded-[28px] mb-4 border border-gray-100 shadow-sm">
      {/* Info Row: Avatar, Name, Source, Time */}
      <View className="flex-row items-start mb-3">
        <Image
          source={{ uri: request.avatar }}
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        <View className="flex-1 ml-3 justify-center pt-0.5">
          <Text className="text-base font-bold text-gray-900 leading-tight">
            {request.name}
          </Text>
          <Text className="text-[13px] text-gray-500 mt-0.5">
            {request.source}
          </Text>
        </View>
        <Text className="text-xs text-gray-400 mt-1">{request.time}</Text>
      </View>

      {/* Message Bubble (Chỉ hiển thị nếu có lời nhắn) */}
      {request.message ? (
        <View className="bg-[#f4f5f7] p-4 rounded-2xl mb-4">
          <Text className="text-[14.5px] text-gray-700 leading-relaxed">
            {request.message}
          </Text>
        </View>
      ) : (
        <View className="h-2" /> // Khoảng trống nhỏ nếu không có tin nhắn
      )}

      {/* Action Buttons */}
      <View className="flex-row items-center space-x-3">
        {/* Nút Đồng ý */}
        <TouchableOpacity className="flex-1 bg-black py-3.5 rounded-full items-center justify-center shadow-sm">
          <Text className="text-white text-[15px] font-bold">Đồng ý</Text>
        </TouchableOpacity>

        {/* Nút Từ chối */}
        <TouchableOpacity className="flex-1 bg-[#f4f5f7] py-3.5 rounded-full items-center justify-center">
          <Text className="text-gray-900 text-[15px] font-bold">Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
