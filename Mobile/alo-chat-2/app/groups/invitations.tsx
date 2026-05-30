import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { groupService } from "../../services/groupService";

export default function GroupInvitationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const res = await groupService.getMyInvitations();
      // res usually contains { data: [...] }
      const data = res?.data?.data ? res.data.data : res?.data ? res.data : res;
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách lời mời:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvitations();

    const listener = DeviceEventEmitter.addListener("refresh_invitations", () => {
      console.log("🔄 GroupInvitationsScreen: Refreshing invitations due to real-time event");
      fetchInvitations();
    });

    return () => {
      listener.remove();
    };
  }, []);

  const handleAction = async (groupId: string, action: "accept" | "decline") => {
    try {
      if (action === "accept") {
        await groupService.acceptInvitation(groupId);
        Alert.alert("Thành công", "Bạn đã tham gia nhóm.");
      } else {
        await groupService.declineInvitation(groupId);
        Alert.alert("Thông báo", "Đã từ chối lời mời.");
      }
      fetchInvitations();
    } catch (error) {
      Alert.alert("Lỗi", "Thao tác thất bại");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-2 text-gray-900">Lời mời vào nhóm</Text>
      </View>

      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {invitations.length === 0 ? (
            <View className="items-center justify-center py-20 px-10">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <UserGroupIcon size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-center">Bạn không có lời mời vào nhóm nào.</Text>
            </View>
          ) : (
            <View className="py-2">
              {invitations.map((item) => (
                <View key={item._id} className="flex-row items-center p-4 border-b border-gray-50">
                  {item.groupAvatar ? (
                    <Image source={{ uri: item.groupAvatar }} className="w-14 h-14 rounded-full bg-gray-200" />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-gray-800 items-center justify-center">
                      <Text className="text-white font-bold text-lg">
                        {(item.name || "G").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="ml-4 flex-1">
                    <Text className="text-base font-bold text-gray-900 mb-1">{item.name}</Text>
                    <Text className="text-xs text-gray-500">Mời bởi: {item.invitedBy?.fullName || "Thành viên"}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAction(item._id, "decline")}
                      className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                    >
                      <XMarkIcon size={20} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAction(item._id, "accept")}
                      className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center"
                    >
                      <CheckIcon size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
