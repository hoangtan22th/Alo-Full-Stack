import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  InformationCircleIcon,
  PhoneIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";

interface ChatHeaderProps {
  id: string | string[];
  name: string;
  avatar: string;
  membersCount: string;
  isGroupChat: boolean;
  isOnline: boolean;
  userStatus: any;
  onBack: () => void;
  onInfo: () => void;
  onHeaderClick?: () => void;
  onSearchToggle?: () => void;
}

export const ChatHeader = ({
  id,
  name,
  avatar,
  membersCount,
  isGroupChat,
  isOnline,
  userStatus,
  onBack,
  onInfo,
  onHeaderClick,
  onSearchToggle,
}: ChatHeaderProps) => {
  const getOfflineText = (lastActive?: number) => {
    if (!lastActive) return "Chưa truy cập";
    const diff = Math.floor((Date.now() - lastActive) / 60000);
    if (diff < 1) return "Vừa mới truy cập";
    if (diff < 60) return `Hoạt động ${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
      <View className="flex-row items-center flex-1">
        <TouchableOpacity onPress={onBack} className="pr-4 py-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center flex-1"
          activeOpacity={0.7}
          onPress={onHeaderClick || onInfo}
        >
          <View className="relative">
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                className="w-11 h-11 rounded-full"
              />
            ) : (
              <View className="w-11 h-11 rounded-full bg-gray-900 items-center justify-center">
                <Text className="text-white font-bold text-lg">
                  {(name || "G").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {!isGroupChat && isOnline && (
              <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </View>

          <View className="ml-3 flex-1 pr-2">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {name || `Nhóm ${id}`}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {isGroupChat
                ? `${membersCount} thành viên`
                : isOnline
                  ? "Đang hoạt động"
                  : getOfflineText(userStatus?.last_active)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center gap-4">
        <TouchableOpacity>
          <PhoneIcon size={22} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity>
          <VideoCameraIcon size={22} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSearchToggle}>
          <MagnifyingGlassIcon size={22} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onInfo}>
          <InformationCircleIcon size={22} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
