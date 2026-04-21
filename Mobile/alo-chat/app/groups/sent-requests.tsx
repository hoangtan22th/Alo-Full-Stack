import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  ArrowLeftIcon,
  ClockIcon,
  XCircleIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { groupService } from "../../services/groupService";

export default function SentJoinRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSentRequests = async () => {
    try {
      setIsLoading(true);
      const res = await groupService.getMySentJoinRequests();
      // res usually contains { data: [...] }
      const data = res?.data?.data ? res.data.data : res?.data ? res.data : res;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu đã gửi:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSentRequests();
  };

  const handleCancelRequest = async (groupId: string, groupName: string) => {
    Alert.alert(
      "Hủy yêu cầu tham gia",
      `Bạn có chắc chắn muốn hủy yêu cầu tham gia nhóm "${groupName}"?`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy yêu cầu",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.cancelJoinRequest(groupId);
              fetchSentRequests();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể hủy yêu cầu tham gia.");
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-2 text-gray-900">Yêu cầu đã gửi</Text>
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
          {requests.length === 0 ? (
            <View className="items-center justify-center py-20 px-10">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <ClockIcon size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-center">Bạn không có yêu cầu tự do tham gia nhóm nào đang chờ duyệt.</Text>
            </View>
          ) : (
            <View className="py-2">
              {requests.map((item) => (
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
                    <View className="flex-row items-center">
                      <ClockIcon size={14} color="#f59e0b" />
                      <Text className="text-xs text-amber-600 ml-1 font-medium">Chờ duyệt</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCancelRequest(item._id, item.name)}
                    className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-full"
                  >
                    <XCircleIcon size={16} color="#6b7280" />
                    <Text className="text-gray-500 text-[13px] ml-1 font-medium">Hủy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
