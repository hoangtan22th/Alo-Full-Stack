import { useRouter } from "expo-router";
import React from "react";
import {
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

// --- Dữ liệu Giả lập (Mock Data) ---
const SENT_REQUESTS = [
  {
    id: "1",
    name: "Minh Anh",
    subtitle: "Bạn cùng nhóm • 31/03",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=MinhAnh&backgroundColor=f3f4f6",
  },
  {
    id: "2",
    name: "Hoàng Nam",
    subtitle: "Từ số điện thoại • 30/03",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Nam&backgroundColor=e5e7eb",
  },
  {
    id: "3",
    name: "Linh Chi",
    subtitle: "Gợi ý kết bạn • 28/03",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Chi&backgroundColor=fecaca",
  },
  {
    id: "4",
    name: "Quốc Bảo",
    subtitle: "Bạn của bạn • 25/03",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Bao&backgroundColor=bfdbfe",
  },
  {
    id: "5",
    name: "Thanh Trúc",
    subtitle: "Từ số điện thoại • 24/03",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Truc&backgroundColor=bbf7d0",
  },
];

export default function SentRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Sent Requests</Text>
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
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Đệm đáy để không bị lẹm TabBar
      >
        {SENT_REQUESTS.map((request) => (
          <RequestItem key={request.id} request={request} />
        ))}
      </ScrollView>
    </View>
  );
}

// --- Component phụ cho từng dòng Lời mời ---
function RequestItem({ request }: { request: any }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-4">
      {/* Cụm Avatar và Info */}
      <View className="flex-row items-center flex-1 pr-4">
        <Image
          source={{ uri: request.avatar }}
          className="w-14 h-14 rounded-full bg-gray-200"
        />
        <View className="ml-4 flex-1 justify-center">
          <Text className="text-[17px] font-semibold text-gray-900 mb-0.5">
            {request.name}
          </Text>
          <Text className="text-[13px] text-gray-500" numberOfLines={1}>
            {request.subtitle}
          </Text>
        </View>
      </View>

      {/* Nút Thu hồi */}
      <TouchableOpacity
        className="bg-[#f4f5f7] px-5 py-2.5 rounded-full items-center justify-center"
        activeOpacity={0.7}
      >
        <Text className="text-gray-800 font-medium text-[14.5px]">Thu hồi</Text>
      </TouchableOpacity>
    </View>
  );
}
