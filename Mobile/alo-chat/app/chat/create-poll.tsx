import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XMarkIcon, PlusIcon, CalendarIcon } from "react-native-heroicons/outline";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { pollService } from "../../services/pollService";

export default function CreatePollScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [hideVoters, setHideVoters] = useState(false);
  const [pinToTop, setPinToTop] = useState(false);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert("Lỗi", "Bình chọn phải có ít nhất 2 lựa chọn.");
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date: Date) => {
    if (date.getTime() <= new Date().getTime()) {
      Alert.alert("Lỗi", "Thời gian kết thúc phải ở tương lai.");
      hideDatePicker();
      return;
    }
    setExpiresAt(date);
    hideDatePicker();
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập chủ đề bình chọn.");
      return;
    }

    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập ít nhất 2 lựa chọn hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        conversationId: conversationId as string,
        question: question.trim(),
        options: validOptions.map(opt => opt.trim()),
        settings: {
          allowMultipleAnswers,
          allowAddOptions,
          hideResultsUntilVoted: false,
          hideVoters,
          pinToTop,
        },
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      };

      const result = await pollService.createPoll(data);
      if (result) {
        Alert.alert("Thành công", "Đã tạo bình chọn.", [
          { text: "OK", onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
        ]);
      } else {
         Alert.alert("Lỗi", "Không thể tạo bình chọn. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi cục bộ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: "white", paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <XMarkIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "600", color: "#111827" }}>Tạo bình chọn</Text>
        <TouchableOpacity onPress={handleCreate} disabled={isSubmitting} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isSubmitting ? "#93c5fd" : "#3b82f6", borderRadius: 16 }}>
          <Text style={{ color: "white", fontWeight: "600" }}>Tạo</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          
          {/* Question Input */}
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Chủ đề bình chọn</Text>
            <TextInput
              style={{ fontSize: 16, color: "#111827", minHeight: 40, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 }}
              placeholder="Đặt câu hỏi bình chọn..."
              placeholderTextColor="#9ca3af"
              value={question}
              onChangeText={setQuestion}
              multiline
            />
          </View>

          {/* Options */}
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>Các phương án</Text>
            
            {options.map((opt, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12 }}>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: "#111827", paddingVertical: 10 }}
                    placeholder={`Phương án ${index + 1}`}
                    placeholderTextColor="#9ca3af"
                    value={opt}
                    onChangeText={(text) => handleUpdateOption(index, text)}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity onPress={() => handleRemoveOption(index)} style={{ padding: 4 }}>
                      <XMarkIcon size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={handleAddOption} style={{ flexDirection: "row", alignItems: "center", marginTop: 4, paddingVertical: 8 }}>
              <PlusIcon size={20} color="#3b82f6" />
              <Text style={{ color: "#3b82f6", fontWeight: "500", marginLeft: 8 }}>Thêm phương án</Text>
            </TouchableOpacity>
          </View>

          {/* Expiry Date */}
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
             <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Thời hạn kết thúc (Tuỳ chọn)</Text>
             <TouchableOpacity onPress={showDatePicker} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
               <CalendarIcon size={20} color="#6b7280" />
               <Text style={{ flex: 1, marginLeft: 8, color: expiresAt ? "#111827" : "#9ca3af" }}>
                 {expiresAt ? expiresAt.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa thiết lập"}
               </Text>
               {expiresAt && (
                 <TouchableOpacity onPress={() => setExpiresAt(null)} style={{ padding: 4 }}>
                    <XMarkIcon size={16} color="#ef4444" />
                 </TouchableOpacity>
               )}
             </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            onConfirm={handleConfirmDate}
            onCancel={hideDatePicker}
            locale="vi-VN"
            confirmTextIOS="Chọn"
            cancelTextIOS="Hủy"
            minimumDate={new Date()}
          />

          {/* Settings */}
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>Cài đặt</Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <Text style={{ fontSize: 15, color: "#374151" }}>Chọn nhiều phương án</Text>
              <Switch value={allowMultipleAnswers} onValueChange={setAllowMultipleAnswers} trackColor={{ false: "#d1d5db", true: "#bfdbfe" }} thumbColor={allowMultipleAnswers ? "#3b82f6" : "#f3f4f6"} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <Text style={{ fontSize: 15, color: "#374151" }}>Hỗ trợ thêm phương án</Text>
              <Switch value={allowAddOptions} onValueChange={setAllowAddOptions} trackColor={{ false: "#d1d5db", true: "#bfdbfe" }} thumbColor={allowAddOptions ? "#3b82f6" : "#f3f4f6"} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <Text style={{ fontSize: 15, color: "#374151" }}>Bình chọn ẩn danh</Text>
              <Switch value={hideVoters} onValueChange={setHideVoters} trackColor={{ false: "#d1d5db", true: "#bfdbfe" }} thumbColor={hideVoters ? "#3b82f6" : "#f3f4f6"} />
            </View>

            {/* <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 15, color: "#374151" }}>Ghim lên đầu đoạn chat</Text>
              <Switch value={pinToTop} onValueChange={setPinToTop} trackColor={{ false: "#d1d5db", true: "#bfdbfe" }} thumbColor={pinToTop ? "#3b82f6" : "#f3f4f6"} />
            </View> */}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
