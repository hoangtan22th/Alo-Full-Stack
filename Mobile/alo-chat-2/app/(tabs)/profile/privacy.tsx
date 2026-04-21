import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b-[1px] border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Quyền riêng tư</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 bg-[#fafafa]"
      >
        {/* Section 1: CÁ NHÂN */}
        <View className="mt-6 mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 px-1">
            CÁ NHÂN
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden border-[1px] border-gray-200">
            <PrivacyMenuItem title="Sinh nhật" showBorder />
            <PrivacyMenuItem
              title="Hiện trạng thái truy cập"
              value="Đang tắt"
            />
          </View>
        </View>

        {/* Section 2: TIN NHẮN VÀ CUỘC GỌI */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 px-1">
            TIN NHẮN VÀ CUỘC GỌI
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden border-[1px] border-gray-200">
            <PrivacyMenuItem
              title="Hiện trạng thái 'Đã xem'"
              value="Đang tắt"
              showBorder
            />
            <PrivacyMenuItem
              title="Cho phép nhắn tin"
              value="Mọi người"
              showBorder
            />
            <PrivacyMenuItem title="Cho phép gọi điện" value="Bạn bè" />
          </View>
        </View>

        {/* Section 3: NHẬT KÝ */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 px-1">
            NHẬT KÝ
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden border-[1px] border-gray-200">
            <PrivacyMenuItem title="Cho phép xem và bình luận" showBorder />
            <PrivacyMenuItem title="Chặn và ẩn" />
          </View>
        </View>

        {/* Section 4: NGUỒN TÌM KIẾM VÀ KẾT BẠN */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 px-1">
            NGUỒN TÌM KIẾM VÀ KẾT BẠN
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden border-[1px] border-gray-200">
            <PrivacyMenuItem title="Quản lý nguồn tìm kiếm và kết bạn" />
          </View>
        </View>

        {/* Section 5: QUYỀN CỦA TIỆN ÍCH */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 px-1">
            QUYỀN CỦA TIỆN ÍCH
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden border-[1px] border-gray-200">
            <PrivacyMenuItem title="Tiện ích" />
          </View>
        </View>

        {/* Khoảng đệm để không bị che bởi Tab Bar */}
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}

// Component Menu Item tùy chỉnh cho trang Quyền riêng tư
function PrivacyMenuItem({
  title,
  value,
  showBorder = false,
}: {
  title: string;
  value?: string; // value là không bắt buộc (optional)
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-4 bg-white ${
        showBorder ? "border-b border-gray-100" : ""
      }`}
    >
      <Text className="text-base font-medium text-gray-900">{title}</Text>

      <View className="flex-row items-center">
        {/* Nếu truyền vào value thì mới hiển thị đoạn text màu xám */}
        {value && <Text className="text-sm text-gray-400 mr-2">{value}</Text>}
        <ChevronRightIcon size={16} color="#d1d5db" />
      </View>
    </TouchableOpacity>
  );
}
