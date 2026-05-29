import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeftIcon,
  PlusIcon,
  CalendarDaysIcon,
  BellIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
} from "react-native-heroicons/outline";
import { groupService } from "../../services/groupService";
import { reminderService, ReminderDTO } from "../../services/reminderService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";

const REPEAT_LABELS: Record<string, string> = {
  NONE: "Không lặp lại",
  DAILY: "Hằng ngày",
  WEEKLY: "Hằng tuần",
  MONTHLY: "Hằng tháng",
  YEARLY: "Hằng năm",
  MANY_DAYS_WEEKLY: "Nhiều ngày trong tuần",
};

export default function RemindersManagementScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [reminders, setReminders] = useState<ReminderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [groupRes, remindersData] = await Promise.all([
        groupService.getGroupById(id as string),
        reminderService.getRemindersByConversation(id as string),
      ]);

      setReminders(remindersData);

      // Check permission to create reminder
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      const member = groupData?.members?.find(
        (m: any) => m.userId === currentUserId,
      );
      const managerStatus =
        member?.role === "LEADER" || member?.role === "DEPUTY";
      setIsManager(managerStatus);
      const createReminderSetting =
        groupData?.permissions?.createReminders || "EVERYONE";
      setCanCreate(managerStatus || createReminderSetting === "EVERYONE");
    } catch (error) {
      console.error("Lỗi fetch reminders list:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id]),
  );

  useEffect(() => {
    if (!socket || !id) return;

    const handleGroupUpdated = (data: any) => {
      const updatedId = data._id || data.id || data.conversationId;
      if (String(updatedId) === String(id)) {
        fetchData(true);
      }
    };

    const handleReminderCreated = (newReminder: ReminderDTO) => {
      if (newReminder.conversationId === id) {
        setReminders((prev) => [newReminder, ...prev].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
      }
    };

    const handleReminderDeleted = (data: { reminderId: string }) => {
      setReminders((prev) => prev.filter((r) => r._id !== data.reminderId));
    };

    const handleReminderUpdated = (updatedReminder: ReminderDTO) => {
      if (updatedReminder.conversationId === id) {
        setReminders((prev) =>
          prev.map((r) => (r._id === updatedReminder._id ? updatedReminder : r))
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        );
      }
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("REMINDER_CREATED", handleReminderCreated);
    socket.on("REMINDER_DELETED", handleReminderDeleted);
    socket.on("REMINDER_UPDATED", handleReminderUpdated);

    return () => {
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("REMINDER_CREATED", handleReminderCreated);
      socket.off("REMINDER_DELETED", handleReminderDeleted);
      socket.off("REMINDER_UPDATED", handleReminderUpdated);
    };
  }, [socket, id]);

  const handleDeleteReminder = (reminderId: string) => {
    Alert.alert("Xóa nhắc hẹn", "Bạn có chắc chắn muốn xóa nhắc hẹn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const success = await reminderService.deleteReminder(reminderId);
          if (success) {
            setReminders((prev) => prev.filter((r) => r._id !== reminderId));
            Alert.alert("Thành công", "Nhắc hẹn đã được xóa.");
          } else {
            Alert.alert("Lỗi", "Không thể xóa nhắc hẹn.");
          }
        },
      },
    ]);
  };

  const renderReminderItem = ({ item }: { item: ReminderDTO }) => {
    const isCreator = item.creatorId === currentUserId;
    const canDelete = isCreator || isManager;
    const reminderDate = new Date(item.time);
    const timeStr = reminderDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = reminderDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return (
      <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
              <BellIcon size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-gray-900" numberOfLines={1}>
                {item.title}
              </Text>
              <View className="flex-row items-center mt-1">
                <ClockIcon size={14} color="#6b7280" />
                <Text className="text-[13px] text-gray-500 ml-1">
                  {timeStr} • {dateStr}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center">
            {isCreator && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/chat/create-reminder",
                    params: {
                      id,
                      reminderId: item._id,
                      initialTitle: item.title,
                      initialTime: item.time,
                      initialRepeat: item.repeat,
                      initialRepeatDays: JSON.stringify(item.repeatDays || []),
                      initialRemindFor: item.remindFor,
                    },
                  })
                }
                className="p-1 mr-2"
              >
                <PencilIcon size={18} color="#3b82f6" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={() => handleDeleteReminder(item._id)} className="p-1">
                <TrashIcon size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="flex-row items-center pt-3 border-t border-gray-50">
          <ArrowPathIcon size={14} color="#3b82f6" />
          <Text className="text-[12px] font-bold text-blue-500 ml-1.5 uppercase tracking-tighter">
            {REPEAT_LABELS[item.repeat] || item.repeat}
          </Text>
          <View className="ml-auto bg-gray-100 px-2.5 py-1 rounded-full">
            <Text className="text-[11px] font-bold text-gray-600">
              {item.remindFor === "GROUP" ? "Cả nhóm" : "Chỉ tôi"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
        <Text className="text-lg font-bold text-gray-900">Nhắc hẹn</Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item._id}
          renderItem={renderReminderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <CalendarDaysIcon size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-[15px]">Chưa có nhắc hẹn nào</Text>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      {canCreate && (
        <TouchableOpacity
          style={{ bottom: insets.bottom + 20 }}
          className="absolute right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40"
          onPress={() => router.push({ pathname: "/chat/create-reminder", params: { id } })}
        >
          <PlusIcon size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

