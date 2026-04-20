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
  DocumentTextIcon,
} from "react-native-heroicons/outline";
import { groupService } from "../../services/groupService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";

export default function NotesManagementScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const groupRes = await groupService.getGroupById(id as string);

      // Check permission to create note
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      const member = groupData?.members?.find((m: any) => m.userId === currentUserId);
      const isManager = member?.role === "LEADER" || member?.role === "DEPUTY";
      const createNoteSetting = groupData?.permissions?.createNotes || "EVERYONE";
      setCanCreate(isManager || createNoteSetting === "EVERYONE");
    } catch (error) {
      console.error("Lỗi fetch notes list:", error);
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

    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup._id === id) {
        fetchData(true);
      }
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    return () => {
      socket.off("GROUP_UPDATED", handleGroupUpdated);
    };
  }, [socket, id]);

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
        <Text className="text-lg font-bold text-gray-900">Ghi chú</Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center -mt-20">
          <DocumentTextIcon size={64} color="#d1d5db" />
          <Text className="text-gray-400 mt-4 text-[15px]">Chưa có ghi chú nào</Text>
        </View>
      )}

      {/* Floating Create Button */}
      {canCreate && (
        <TouchableOpacity
          style={{ bottom: insets.bottom + 20 }}
          className="absolute right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40"
          onPress={() => router.push(`/chat/create-note?id=${id}`)}
        >
          <PlusIcon size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

