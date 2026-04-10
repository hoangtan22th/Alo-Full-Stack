import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ClockIcon,
  EyeSlashIcon,
  TrashIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name, avatar, membersCount } = useLocalSearchParams();

  // Dummy images based on the design
  const images = [
    "https://images.unsplash.com/photo-1541698444083-023c97d3f4b6?q=80&w=400",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=400",
  ];

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Thông tin</Text>
        <TouchableOpacity className="p-2 -mr-2">
          <EllipsisVerticalIcon size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Info */}
        <View className="items-center mt-6">
          <View className="relative">
            {avatar ? (
              <Image
                source={{ uri: avatar as string }}
                className="w-[100px] h-[100px] rounded-full bg-gray-200"
              />
            ) : (
              <View className="w-[100px] h-[100px] rounded-full bg-gray-800 items-center justify-center">
                <Text className="text-white font-bold text-3xl">
                  {((name as string) || "G").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Online Indicator */}
            {!membersCount && (
              <View className="absolute bottom-1 right-2 w-[18px] h-[18px] bg-green-500 border-[3px] border-white rounded-full" />
            )}
          </View>

          <Text className="text-[22px] font-extrabold text-gray-900 mt-4 mb-1">
            {name || `Nhóm ${id}`}
          </Text>
          <Text className="text-[13px] text-gray-500 font-medium">
            {membersCount ? `${membersCount} thành viên` : "Đang hoạt động"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-center mt-7 gap-5 px-5">
          <ActionButton
            icon={<BellSlashIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Tắt báo"
          />
          <ActionButton
            icon={<MapPinIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Ghim"
          />
          <ActionButton
            icon={
              <MagnifyingGlassIcon
                size={24}
                color="#374151"
                strokeWidth={1.5}
              />
            }
            label="Tìm kiếm"
          />
          {membersCount ? (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Thành viên"
            />
          ) : (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Nhóm chung"
            />
          )}
        </View>

        {/* SECTION: ẢNH / VIDEO */}
        <View className="mt-10 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              Ảnh / Video
            </Text>
            <TouchableOpacity>
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {images.slice(0, 5).map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                className="w-[31.5%] aspect-square rounded-2xl mb-3 bg-gray-200"
              />
            ))}
            {/* The "+12" overlay for the last image */}
            <TouchableOpacity
              className="w-[31.5%] aspect-square rounded-2xl mb-3 bg-gray-300 items-center justify-center overflow-hidden"
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: images[5] }}
                className="w-full h-full absolute opacity-40"
              />
              <Text className="text-white font-bold text-[22px] z-10 shadow-sm">
                +12
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: FILE */}
        <View className="mt-8 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              File
            </Text>
            <TouchableOpacity>
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wrapper for cards */}
          <View className="bg-[#f5f6f8] rounded-[24px]">
            <FileItem
              icon={<DocumentTextIcon size={24} color="#10b981" />}
              title="Bao_cao_du_an_Q4.pdf"
              info="12.5 MB • 22/10/2023"
            />
            {/* Divider */}
            <View className="h-[1px] bg-white w-[90%] self-end" />
            <FileItem
              icon={<TableCellsIcon size={24} color="#3b82f6" />}
              title="Danh_sach_nhan_su.xlsx"
              info="2.1 MB • 15/10/2023"
            />
          </View>
        </View>

        {/* SECTION: THIẾT LẬP BẢO MẬT */}
        <View className="mt-10 px-5 pb-12">
          <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
            Thiết lập bảo mật
          </Text>

          <View className="bg-[#f5f6f8] rounded-[24px]">
            <SettingItem
              icon={<ClockIcon size={24} color="#4b5563" />}
              title="Tin nhắn tự xóa"
              value="Tắt"
            />
            <View className="h-[1px] bg-white w-[90%] self-end" />
            <SettingItem
              icon={<EyeSlashIcon size={24} color="#4b5563" />}
              title="Ẩn trò chuyện"
            />
            <View className="h-[1px] bg-white w-full" />
            <SettingItem
              icon={<TrashIcon size={24} color="#ef4444" />}
              title="Xóa lịch sử trò chuyện"
              isDestructive
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Các Component Phụ ---

function ActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TouchableOpacity className="items-center w-[72px]" activeOpacity={0.7}>
      <View className="w-14 h-14 bg-[#f5f6f8] rounded-full items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-[11px] text-gray-600 font-medium text-center leading-tight">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FileItem({
  icon,
  title,
  info,
}: {
  icon: React.ReactNode;
  title: string;
  info: string;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
        {icon}
      </View>
      <View className="ml-4 flex-1">
        <Text
          className="text-[14px] font-bold text-gray-900 mb-0.5"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-[12px] text-gray-500 font-medium">{info}</Text>
      </View>
      <ChevronRightIcon size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function SettingItem({
  icon,
  title,
  value,
  isDestructive,
}: {
  icon: React.ReactNode;
  title: string;
  value?: string;
  isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
    >
      <View
        className={`w-11 h-11 rounded-full items-center justify-center bg-white shadow-sm border border-gray-50`}
      >
        {icon}
      </View>
      <Text
        className={`ml-4 flex-1 text-[15px] font-medium ${
          isDestructive ? "text-red-600" : "text-gray-800"
        }`}
      >
        {title}
      </Text>
      {value && (
        <Text className="text-[13px] font-medium text-gray-500 mr-2">
          {value}
        </Text>
      )}
      {!isDestructive && <ChevronRightIcon size={18} color="#9ca3af" />}
    </TouchableOpacity>
  );
}
