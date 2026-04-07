import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReceivedRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Lời mời kết bạn</Text>
      </View>

      <ScrollView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center pt-20">
          <Text className="text-gray-500 text-base">Chưa có lời mời nào</Text>
        </View>
      </ScrollView>
    </View>
  );
}
