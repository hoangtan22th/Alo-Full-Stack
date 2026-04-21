import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  ArrowPathIcon,
  UsersIcon,
  UserIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { reminderService } from "../../services/reminderService";

const DAYS_OF_WEEK = [
  { label: "CN", value: 0 },
  { label: "T2", value: 1 },
  { label: "T3", value: 2 },
  { label: "T4", value: 3 },
  { label: "T5", value: 4 },
  { label: "T6", value: 5 },
  { label: "T7", value: 6 },
];

const REPEAT_OPTIONS = [
  { label: "Không lặp lại", value: "NONE" },
  { label: "Hằng ngày", value: "DAILY" },
  { label: "Hằng tuần", value: "WEEKLY" },
  { label: "Nhiều ngày trong tuần", value: "MANY_DAYS_WEEKLY" },
  { label: "Hằng tháng", value: "MONTHLY" },
  { label: "Hằng năm", value: "YEARLY" },
];

export default function CreateReminderScreen() {
  const {
    id,
    reminderId,
    initialTitle,
    initialTime,
    initialRepeat,
    initialRepeatDays,
    initialRemindFor,
  } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isEditing = !!reminderId;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [repeat, setRepeat] = useState("NONE");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [remindFor, setRemindFor] = useState("GROUP");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      if (initialTitle) setTitle(initialTitle as string);
      if (initialTime) setDate(new Date(initialTime as string));
      if (initialRepeat) setRepeat(initialRepeat as string);
      if (initialRepeatDays) {
        try {
          setRepeatDays(JSON.parse(initialRepeatDays as string));
        } catch (e) {
          console.error("Lỗi parse repeatDays:", e);
        }
      }
      if (initialRemindFor) setRemindFor(initialRemindFor as string);
    }
  }, [isEditing]);

  const handleConfirmDate = (selectedDate: Date) => {
    const newDate = new Date(date);
    newDate.setFullYear(selectedDate.getFullYear());
    newDate.setMonth(selectedDate.getMonth());
    newDate.setDate(selectedDate.getDate());
    setDate(newDate);
    setDatePickerVisibility(false);
  };

  const handleConfirmTime = (selectedTime: Date) => {
    const newDate = new Date(date);
    newDate.setHours(selectedTime.getHours());
    newDate.setMinutes(selectedTime.getMinutes());
    setDate(newDate);
    setTimePickerVisibility(false);
  };

  const toggleDay = (dayValue: number) => {
    if (repeatDays.includes(dayValue)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayValue));
    } else {
      setRepeatDays([...repeatDays, dayValue]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập tên nhắc hẹn.");
      return;
    }

    if (repeat === "MANY_DAYS_WEEKLY" && repeatDays.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một ngày trong tuần.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      const payload = {
        title: title.trim(),
        time: date.toISOString(),
        repeat,
        repeatDays: repeat === "MANY_DAYS_WEEKLY" ? repeatDays : [],
        remindFor,
      };

      if (isEditing) {
        res = await reminderService.updateReminder(reminderId as string, payload);
      } else {
        res = await reminderService.createReminder(id as string, payload);
      }

      if (res) {
        Alert.alert(
          "Thành công",
          isEditing ? "Nhắc hẹn đã được cập nhật." : "Nhắc hẹn đã được tạo.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Lỗi", "Không thể lưu nhắc hẹn. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi lưu nhắc hẹn:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu nhắc hẹn.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-white border-b border-gray-100 flex-row items-center justify-between px-4 pb-3"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <XMarkIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          {isEditing ? "Chỉnh sửa nhắc hẹn" : "Tạo nhắc hẹn mới"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className={`px-5 py-2 rounded-full ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
        >
          <Text className="text-white font-bold">
            {isEditing ? "Lưu" : "Tạo"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 py-6">
            {/* Title Input */}
            <View className="mb-8">
              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Nội dung nhắc hẹn
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-6 text-[18px] text-gray-900 font-medium"
                placeholder="Ví dụ: Họp nhóm cuối tuần..."
                value={title}
                onChangeText={setTitle}
                autoFocus={!isEditing}
              />
            </View>

            {/* Time Picker */}
            <View className="mb-8">
              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Thời gian
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setDatePickerVisibility(true)}
                  className="flex-1 flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4"
                >
                  <CalendarIcon size={20} color="#3b82f6" />
                  <Text className="ml-3 text-gray-700 font-bold">
                    {date.toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTimePickerVisibility(true)}
                  className="flex-1 flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4"
                >
                  <ClockIcon size={20} color="#3b82f6" />
                  <Text className="ml-3 text-gray-700 font-bold">
                    {date.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Repeat Selection */}
            <View className="mb-8">
              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Lặp lại
              </Text>
              <View className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                {REPEAT_OPTIONS.map((opt, idx) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setRepeat(opt.value)}
                    className={`flex-row items-center justify-between px-5 py-4 ${
                      idx !== REPEAT_OPTIONS.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center">
                      <ArrowPathIcon
                        size={18}
                        color={repeat === opt.value ? "#3b82f6" : "#9ca3af"}
                      />
                      <Text
                        className={`ml-3 text-[15px] ${
                          repeat === opt.value
                            ? "text-blue-500 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                    {repeat === opt.value && (
                      <CheckIcon size={20} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day Selection (Many Days Weekly) */}
              {repeat === "MANY_DAYS_WEEKLY" && (
                <View className="flex-row justify-between mt-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      onPress={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        repeatDays.includes(day.value)
                          ? "bg-blue-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          repeatDays.includes(day.value)
                            ? "text-white"
                            : "text-gray-500"
                        }`}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Target Audience */}
            <View className="mb-10">
              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Nhắc cho ai?
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setRemindFor("CREATOR")}
                  className={`flex-1 flex-row items-center px-4 py-4 rounded-2xl border ${
                    remindFor === "CREATOR"
                      ? "bg-blue-50 border-blue-500"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <UserIcon
                    size={20}
                    color={remindFor === "CREATOR" ? "#3b82f6" : "#9ca3af"}
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      remindFor === "CREATOR" ? "text-blue-500" : "text-gray-700"
                    }`}
                  >
                    Chỉ mình tôi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRemindFor("GROUP")}
                  className={`flex-1 flex-row items-center px-4 py-4 rounded-2xl border ${
                    remindFor === "GROUP"
                      ? "bg-blue-50 border-blue-500"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <UsersIcon
                    size={20}
                    color={remindFor === "GROUP" ? "#3b82f6" : "#9ca3af"}
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      remindFor === "GROUP" ? "text-blue-500" : "text-gray-700"
                    }`}
                  >
                    Cả nhóm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        date={date}
        confirmTextIOS="Chọn"
        cancelTextIOS="Hủy"
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisibility(false)}
        date={date}
        confirmTextIOS="Chọn"
        cancelTextIOS="Hủy"
      />
    </View>
  );
}

