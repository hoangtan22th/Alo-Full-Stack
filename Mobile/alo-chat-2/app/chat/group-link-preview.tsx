import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { groupService } from "../../services/groupService";
import { useAuth } from "../../contexts/AuthContext";

export default function GroupLinkPreviewModal() {
  const router = useRouter();
  const { linkGroupId } = useLocalSearchParams<{ linkGroupId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await groupService.getGroupInfoForLink(linkGroupId);
        setGroupInfo(info);
      } catch (error) {
        Alert.alert("Lỗi", "Không thể lấy thông tin nhóm", [
          { text: "Đóng", onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    if (linkGroupId) fetchInfo();
  }, [linkGroupId]);

  const handleJoin = async () => {
    if (!groupInfo) return;

    // Nếu user đã là thành viên (có thể check thêm nếu API trả về trạng thái)
    if (groupInfo.members?.some((m: any) => m.userId === currentUserId)) {
      router.replace({
        pathname: `/chat/${linkGroupId}` as any,
        params: {
          name: groupInfo.name || "Nhóm",
          avatar: groupInfo.groupAvatar || "",
          membersCount: String(groupInfo.members?.length || 1),
          isGroup: "true",
        },
      });
      return;
    }

    setJoining(true);
    try {
      // Logic gọi requestJoinGroup tương tự như bên scan-qr
      const res = await groupService.requestJoinGroup(linkGroupId);
      const resData = res?.data || res;

      if (resData?.joined) {
        // Đã tham gia thành công (nhóm không cần duyệt)
        router.replace({
          pathname: `/chat/${linkGroupId}` as any,
          params: {
            name: groupInfo.name || "Nhóm",
            avatar: groupInfo.groupAvatar || "",
            membersCount: String(groupInfo.members?.length || 1),
            isGroup: "true",
          },
        });
      } else {
        // Nhóm cần duyệt
        Alert.alert(
          "Yêu cầu đã gửi",
          "Nhóm yêu cầu phê duyệt để tham gia. Vui lòng chờ Quản trị viên duyệt nhóm.",
          [{ text: "Đóng", onPress: () => router.back() }],
        );
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Không thể tham gia nhóm.";
      Alert.alert("Thông báo", errorMsg);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!groupInfo) return null;

  const memberCount = groupInfo.members?.length || 0;
  const creator = groupInfo.creator || groupInfo.managerId;
  const leaderMember = groupInfo.members?.find(
    (m: any) =>
      m.role === "GROUP_LEADER" || m.userId === creator || m._id === creator,
  );
  const creatorName =
    groupInfo.creatorName ||
    leaderMember?.name ||
    leaderMember?.fullName ||
    (creator === currentUserId ? "Bạn" : "Quản trị viên");

  return (
    <View className="flex-1 bg-white">
      {/* Header Modal */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Thông tin nhóm</Text>
        <TouchableOpacity className="p-1">
          <Ionicons name="ellipsis-horizontal" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Avatar & Basic Info */}
        <View className="items-center mt-6 mb-8 px-4">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4 overflow-hidden border border-gray-200">
            {groupInfo.groupAvatar ? (
              <Image
                source={{ uri: groupInfo.groupAvatar }}
                className="w-full h-full"
              />
            ) : (
              <Ionicons name="people" size={48} color="#9ca3af" />
            )}
          </View>
          <Text className="text-xl font-bold text-center mb-1">
            {groupInfo.name}
          </Text>
          <Text className="text-[14px] text-gray-500 mb-1">
            {memberCount} thành viên
          </Text>
          <Text className="text-[14px] text-gray-500">
            Nhóm của{" "}
            <Text className="text-black font-medium">{creatorName}</Text>
          </Text>
        </View>

        <View className="h-[1px] bg-gray-100 mx-4 mb-4" />

        {/* Detailed Info Rows */}
        <View className="px-4 gap-4">
          <View className="flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={22}
              color="black"
              className="mr-3"
            />
            <Text className="text-[15px] flex-1 text-gray-800 ml-3">
              Tạo ngày{" "}
              {new Date(groupInfo.createdAt || Date.now()).toLocaleDateString(
                "vi-VN",
              )}
            </Text>
          </View>
          <View className="h-[1px] bg-gray-100 ml-10" />

          <View className="flex-row items-center">
            <Ionicons
              name="people-outline"
              size={22}
              color="black"
              className="mr-3"
            />
            <View className="flex-1 ml-3">
              <Text className="text-[15px] text-gray-800">
                {memberCount} bạn trong nhóm
              </Text>
              <Text
                className="text-[13px] text-gray-500 mt-0.5"
                numberOfLines={1}
              >
                {groupInfo.members
                  ?.slice(0, 5)
                  .map((m: any) => m.name || m.fullName || "User")
                  .join(", ") || "Các thành viên"}
              </Text>
            </View>
            <View className="flex-row">
              {/* Mini Avatars */}
              {groupInfo.members?.slice(0, 3).map((m: any, i: number) => (
                <View
                  key={i}
                  className={`w-7 h-7 rounded-full border border-white bg-gray-200 items-center justify-center ${i > 0 ? "-ml-2" : ""}`}
                >
                  {m.avatar || m.avatarUrl ? (
                    <Image
                      source={{ uri: m.avatar || m.avatarUrl }}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <Ionicons name="person" size={14} color="#9ca3af" />
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 mb-5 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleJoin}
          disabled={joining}
          className="bg-black rounded-full py-3.5 items-center justify-center flex-row shadow-sm"
        >
          {joining ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-[16px]">Tham gia</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
