import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MapPinIcon, XMarkIcon } from "react-native-heroicons/outline";
import { MessageDTO } from "../../services/messageService";

interface PinnedMessageBarProps {
  pinnedMessages: MessageDTO[];
}

export const PinnedMessageBar = ({ pinnedMessages }: PinnedMessageBarProps) => {
  const [showAllPinned, setShowAllPinned] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <>
      <View className="absolute top-2 left-4 right-4 z-20 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <View className="flex-row items-center px-4 py-3 bg-yellow-50">
          <MapPinIcon size={20} color="#eab308" />
          <View className="flex-1 ml-3 mr-2">
            <Text
              className="text-[13px] font-bold text-yellow-800"
              numberOfLines={1}
            >
              {latestPinned.type === "text"
                ? latestPinned.content
                : latestPinned.type === "image"
                  ? "[Ảnh]"
                  : latestPinned.type === "file"
                    ? latestPinned.metadata?.fileName || "[Tệp đính kèm]"
                    : "[Tin nhắn]"}
            </Text>
            <Text className="text-[11px] text-yellow-700 mt-0.5 font-medium">
              Tin nhắn đã ghim
            </Text>
          </View>
          {pinnedMessages.length > 1 && (
            <TouchableOpacity
              onPress={() => setShowAllPinned(true)}
              className="bg-yellow-200 px-2 py-1 rounded"
            >
              <Text className="text-[11px] font-bold text-yellow-800 tracking-tight">
                +{pinnedMessages.length - 1}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showAllPinned}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllPinned(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-2xl overflow-hidden max-h-[70%]">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <MapPinIcon size={20} color="#eab308" />
                <Text className="ml-2 text-base font-bold text-gray-900">
                  Danh sách đã ghim
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAllPinned(false)}>
                <XMarkIcon size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              className="p-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {pinnedMessages.map((msg) => (
                <View
                  key={msg._id}
                  className="bg-yellow-50 rounded-xl p-3 mb-3 border border-yellow-200"
                >
                  <Text className="text-[14px] font-medium text-yellow-900 mb-1">
                    {msg.type === "text"
                      ? msg.content
                      : msg.type === "image"
                        ? "[Ảnh]"
                        : msg.metadata?.fileName || "[Tệp đính kèm]"}
                  </Text>
                  <Text className="text-[11px] text-yellow-700">
                    Ghim lúc {new Date(msg.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};
