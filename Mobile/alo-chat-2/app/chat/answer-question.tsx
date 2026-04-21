import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { groupService } from "../../services/groupService";

export default function AnswerQuestionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { id, question, name, avatar } = params;

  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll to bottom when keyboard opens
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      hideSubscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập câu trả lời của bạn.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await groupService.requestJoinGroup(
        id as string,
        answer.trim(),
      );
      const resData = res?.data || res;

      Alert.alert(
        "Đã gửi yêu cầu",
        "Yêu cầu tham gia của bạn đã được gửi. Vui lòng chờ quản trị viên phê duyệt.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error || "Không thể gửi yêu cầu tham gia.";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      className="flex-1 bg-white"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
              <ArrowLeftIcon size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-[17px] font-bold text-gray-900 ml-2">
              Tham gia nhóm
            </Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: 32,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Group Info Preview */}
            <View className="items-center mb-8">
              {avatar ? (
                <Image
                  source={{ uri: avatar as string }}
                  className="w-20 h-20 rounded-[30px]"
                />
              ) : (
                <View className="w-20 h-20 rounded-[30px] bg-blue-500 items-center justify-center">
                  <Text className="text-white text-2xl font-bold">
                    {((name as string) || "G").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
                {name}
              </Text>
            </View>

            {/* Question Section */}
            <View className="bg-gray-50 rounded-3xl p-6 border border-gray-200">
              <Text className="text-[14px] font-bold text-blue-600 uppercase tracking-wider mb-3">
                Câu hỏi từ quản trị viên:
              </Text>
              <Text className="text-[16px] text-gray-800 leading-6 font-medium">
                {question || "Vui lòng cho biết lý do bạn muốn tham gia nhóm?"}
              </Text>
            </View>

            {/* Answer Input */}
            <View className="mt-8 mb-8">
              <Text className="text-[15px] font-bold text-gray-700 mb-3 ml-1">
                Câu trả lời của bạn
              </Text>
              <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-500">
                <TextInput
                  placeholder="Nhập câu trả lời tại đây..."
                  className="text-[16px] text-gray-900"
                  multiline
                  numberOfLines={4}
                  value={answer}
                  onChangeText={setAnswer}
                  style={{ minHeight: 120, textAlignVertical: "top" }}
                />
              </View>
            </View>

            <View className="flex-1" />
          </ScrollView>

          {/* Submit Button - Sticky above keyboard */}
          <View
            className="px-6 py-4 border-t border-gray-50 bg-white"
            style={{
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom + 20),
            }}
          >
            <TouchableOpacity
              className={`h-14 rounded-2xl items-center justify-center shadow-lg ${
                isSubmitting ? "bg-gray-400" : "bg-[#111111]"
              }`}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Gửi yêu cầu tham gia
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
