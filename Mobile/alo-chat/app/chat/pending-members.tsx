import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";

export default function PendingMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Lấy thông tin group
      const groupRes = await groupService.getGroupById(id as string);
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      if (groupData) {
        setIsApprovalRequired(groupData.isApprovalRequired || false);
      }

      // 2. Lấy danh sách join requests
      const requestsRes = await groupService.getJoinRequests(id as string);
      let requests = requestsRes;
      if (requestsRes?.data?.data) requests = requestsRes.data.data;
      else if (requestsRes?.data) requests = requestsRes.data;

      if (Array.isArray(requests)) {
        // 3. Gắn thông tin user
        const usersWithDetails = await Promise.all(
          requests.map(async (req: any) => {
            const userRes = await userService.getUserById(req.userId);
            const userData =
              userRes && (userRes as any).data
                ? (userRes as any).data
                : userRes;
            return {
              id: req.userId, // dùng chung id hoặc userId
              name: userData?.fullName || "Người dùng",
              avatar: userData?.avatar || "",
              requestedAt: req.requestedAt,
            };
          }),
        );
        setPendingUsers(usersWithDetails);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin duyệt thành viên:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const toggleApproval = async (newValue: boolean) => {
    if (!id) return;
    try {
      setIsApprovalRequired(newValue);
      await groupService.updateApprovalSetting(id as string, newValue);
    } catch (error) {
      console.error("Lỗi cập nhật cài đặt duyệt:", error);
      Alert.alert("Lỗi", "Cập nhật thất bại. Vui lòng thử lại.");
      setIsApprovalRequired(!newValue); // rollback state
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await groupService.approveJoinRequest(id as string, userId);
      fetchData();
    } catch (error) {
      console.error("Lỗi phê duyệt:", error);
      Alert.alert("Lỗi", "Phê duyệt thất bại.");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await groupService.rejectJoinRequest(id as string, userId);
      fetchData();
    } catch (error) {
      console.error("Lỗi từ chối:", error);
      Alert.alert("Lỗi", "Từ chối thất bại.");
    }
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Duyệt thành viên
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[16px] font-medium text-gray-900 mb-1">
              Cần phê duyệt
            </Text>
            <Text className="text-[13px] text-gray-500">
              Mọi người cần được trưởng nhóm hoặc phó nhóm phê duyệt để tham gia
              nhóm.
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
            thumbColor={"#ffffff"}
            onValueChange={toggleApproval}
            value={isApprovalRequired}
          />
        </View>

        {isApprovalRequired && (
          <View className="px-5 py-4">
            <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Đang chờ duyệt ({pendingUsers.length})
            </Text>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#3b82f6"
                className="mt-8"
              />
            ) : pendingUsers.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-500 text-[14px]">
                  Chưa có yêu cầu nào.
                </Text>
              </View>
            ) : (
              pendingUsers.map((user) => (
                <View
                  key={user.id}
                  className="flex-row items-center justify-between py-3 border-b border-gray-50"
                >
                  <View className="flex-row items-center flex-1">
                    {user.avatar ? (
                      <Image
                        source={{ uri: user.avatar }}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                        <Text className="text-gray-500 font-bold text-lg">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1 pr-2">
                      <Text
                        className="text-[15px] font-bold text-gray-900"
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      <Text className="text-[13px] text-gray-500 mt-0.5">
                        Muốn tham gia nhóm
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-full bg-red-100 mr-2"
                      onPress={() => handleReject(user.id)}
                    >
                      <Text className="text-[13px] font-bold text-red-600">
                        Từ chối
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-full bg-blue-500"
                      onPress={() => handleApprove(user.id)}
                    >
                      <Text className="text-[13px] font-bold text-white">
                        Thêm
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
