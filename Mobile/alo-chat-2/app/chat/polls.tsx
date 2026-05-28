import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeftIcon,
  PlusIcon,
  ChartBarIcon,
} from "react-native-heroicons/outline";
import { pollService, PollDTO } from "../../services/pollService";
import { groupService } from "../../services/groupService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";

export default function PollsManagementScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [polls, setPolls] = useState<PollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [pollsData, groupRes] = await Promise.all([
        pollService.getPollsByConversation(id as string),
        groupService.getGroupById(id as string),
      ]);

      setPolls(pollsData);

      // Check permission to create poll
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      const member = groupData?.members?.find((m: any) => m.userId === currentUserId);
      const isManager = member?.role === "LEADER" || member?.role === "DEPUTY";
      const createPollSetting = groupData?.permissions?.createPolls || "EVERYONE";
      setCanCreate(isManager || createPollSetting === "EVERYONE");
    } catch (error) {
      console.error("Lỗi fetch polls list:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  useEffect(() => {
    if (!socket || !id) return;

    const handleGroupUpdated = (data: any) => {
      const updatedId = data._id || data.id || data.conversationId;
      if (String(updatedId) === String(id)) {
        fetchData(true);
      }
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    return () => {
      socket.off("GROUP_UPDATED", handleGroupUpdated);
    };
  }, [socket, id]);

  const renderItem = ({ item }: { item: PollDTO }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      onPress={() => router.push(`/chat/poll-details?pollId=${item._id}`)}
    >
      <View className="flex-row items-center mb-2">
        <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
          <ChartBarIcon size={20} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-gray-900" numberOfLines={2}>
            {item.question}
          </Text>
          <Text className="text-[12px] text-gray-500 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString("vi-VN")} • {item.status === "OPEN" ? "Đang diễn ra" : "Đã khóa"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-white border-b border-gray-100 flex-row items-center justify-between px-4 pb-3"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Bình chọn</Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <ChartBarIcon size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-[15px]">Chưa có bình chọn nào</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
          }
        />
      )}

      {/* Floating Create Button */}
      {canCreate && (
        <TouchableOpacity
          style={{ bottom: insets.bottom + 20 }}
          className="absolute right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40"
          onPress={() => router.push(`/chat/create-poll?conversationId=${id}`)}
        >
          <PlusIcon size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

