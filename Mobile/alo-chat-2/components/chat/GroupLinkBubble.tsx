import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { groupService } from "../../services/groupService";
import { MessageDTO } from "../../services/messageService";

interface GroupInfo {
  name: string;
  groupAvatar?: string;
  notFound?: boolean;
}

interface GroupLinkBubbleProps {
  msg: MessageDTO;
  linkGroupId: string;
}

export const GroupLinkBubble = ({ msg, linkGroupId }: GroupLinkBubbleProps) => {
  const router = useRouter();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchGroup = async () => {
      try {
        const info = await groupService.getGroupInfoForLink(linkGroupId);
        if (isMounted) {
          if (info) {
            setGroupInfo({
              name: info.name,
              groupAvatar: info.groupAvatar || info.avatar,
            });
          } else {
            setGroupInfo({ name: "Không tìm thấy", notFound: true });
          }
        }
      } catch (error) {
        if (isMounted) {
          setGroupInfo({ name: "Không tìm thấy", notFound: true });
        }
      }
    };
    fetchGroup();
    return () => {
      isMounted = false;
    };
  }, [linkGroupId]);

  const handlePress = () => {
    if (groupInfo?.notFound) return;
    router.push({
      pathname: "/chat/group-link-preview" as any,
      params: { linkGroupId },
    });
  };

  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className="mt-2 mb-1">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 border-b-[3px] border-b-gray-200"
        style={{ width: 280 }}
      >
        {/* Header Link */}
        <View className="px-3 py-1.5 border-b border-gray-50 flex-row items-center overflow-hidden">
          <View className="w-1 h-1 rounded-full bg-gray-300 mr-1.5" />
          <Text className="text-[10px] text-gray-400 font-medium opacity-80" numberOfLines={1}>
            alo.chat/g/{linkGroupId}
          </Text>
        </View>

        {/* Banner Section */}
        <LinearGradient
          colors={["#111827", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="relative h-32 p-4 justify-end overflow-hidden"
        >
          {/* Abstract background patterns */}
          <View className="absolute inset-0 opacity-10 pointer-events-none" style={{ overflow: "hidden" }}>
            <View className="absolute -right-4 -top-4 w-24 h-24 rounded-full border-[10px] border-white" />
            <View className="absolute left-1/4 top-1/2 w-32 h-32 rounded-full border-[1px] border-white" />
          </View>

          <View className="flex-row items-center relative z-10">
            <View className="relative mr-3 shadow-lg">
              <Image
                source={
                  groupInfo?.groupAvatar
                    ? { uri: groupInfo.groupAvatar }
                    : require("../../assets/images/avt-mac-dinh.jpg")
                }
                className="w-14 h-14 rounded-2xl border-2 border-white/20"
                style={{ backgroundColor: "#374151" }}
              />
              {groupInfo?.notFound && (
                <View className="absolute inset-0 bg-black/60 rounded-2xl items-center justify-center">
                  <Text className="text-[8px] text-white font-black">404</Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-white/60 font-black uppercase tracking-[2px] mb-0.5">Nhóm</Text>
              <Text className="text-base font-black text-white leading-tight" numberOfLines={1}>
                {groupInfo?.notFound ? "Liên kết không tồn tại" : (groupInfo?.name || "Đang tải...")}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Footer Info */}
        <View className="p-3 bg-white">
          <Text className="text-[13px] font-black text-gray-900 mb-1" numberOfLines={1}>
            {groupInfo?.notFound ? "Liên kết đã hết hạn" : (groupInfo?.name || "Đang tải nhóm...")}
          </Text>
          <Text className="text-[11px] text-gray-500 font-medium mb-2" numberOfLines={2}>
            {groupInfo?.notFound
              ? "Không tìm thấy thông tin nhóm này"
              : "Bấm vào đây để xem thông tin và tham gia nhóm"}
          </Text>
          <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
            <Text className="text-[10px] font-black text-gray-300 tracking-widest">ALO.ME</Text>
            <Text className="text-[10px] text-gray-400 font-bold">{timeString}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};
