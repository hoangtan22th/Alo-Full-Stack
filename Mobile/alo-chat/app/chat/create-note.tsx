import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XMarkIcon, LinkIcon, TrashIcon } from "react-native-heroicons/outline";
import { noteService } from "../../services/noteService";

export default function CreateNoteScreen() {
  const { id, noteId, initialContent, initialLinks } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isEditing = !!noteId;

  const [content, setContent] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentLink, setCurrentLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      if (initialContent) setContent(initialContent as string);
      if (initialLinks) {
        try {
          setLinks(JSON.parse(initialLinks as string));
        } catch (e) {
          console.error("Lỗi parse initialLinks:", e);
        }
      }
    }
  }, [isEditing, initialContent, initialLinks]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung ghi chú.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (isEditing) {
        res = await noteService.updateNote(
          noteId as string,
          content.trim(),
          links,
        );
      } else {
        res = await noteService.createNote(
          id as string,
          content.trim(),
          links,
        );
      }

      if (res) {
        Alert.alert(
          "Thành công",
          isEditing ? "Ghi chú đã được cập nhật." : "Ghi chú đã được tạo.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Lỗi", "Không thể lưu ghi chú. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi handleSave note:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu ghi chú.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLink = () => {
    if (!currentLink.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập link.");
      return;
    }
    setLinks([...links, currentLink.trim()]);
    setCurrentLink("");
    setIsModalVisible(false);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
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
          {isEditing ? "Chỉnh sửa ghi chú" : "Tạo ghi chú"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className={`px-5 py-2 rounded-full ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
        >
          <Text className="text-white font-bold">Lưu</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-5">
          <TextInput
            className="text-[16px] text-gray-800 min-h-[200px]"
            placeholder="Nhập nội dung ghi chú..."
            multiline
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
            autoFocus={!isEditing}
          />

          {/* Links List */}
          {links.length > 0 && (
            <View className="mt-5">
              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Links đã gắn
              </Text>
              {links.map((link, index) => (
                <View
                  key={index}
                  className="flex-row items-center bg-gray-50 px-4 py-3 rounded-xl mb-2"
                >
                  <LinkIcon size={18} color="#6b7280" />
                  <Text
                    className="flex-1 ml-3 text-blue-500 text-[14px]"
                    numberOfLines={1}
                  >
                    {link}
                  </Text>
                  <TouchableOpacity onPress={() => removeLink(index)}>
                    <TrashIcon size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer actions */}
        <View className="p-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            className="flex-row items-center bg-gray-100 px-5 py-4 rounded-2xl"
          >
            <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-4">
              <LinkIcon size={22} color="#3b82f6" />
            </View>
            <Text className="text-[15px] font-bold text-gray-700">Gắn link</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Link Input Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="bg-white rounded-[24px] p-6 shadow-xl">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Gắn link liên kết
            </Text>
            <Text className="text-[13px] text-gray-500 mb-4">
              Nhập địa chỉ URL của link bạn muốn gắn vào ghi chú.
            </Text>

            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-6 border border-gray-200"
              placeholder="https://example.com"
              value={currentLink}
              onChangeText={setCurrentLink}
              autoCapitalize="none"
              keyboardType="url"
              autoFocus
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                onPress={() => setIsModalVisible(false)}
              >
                <Text className="text-gray-600 font-bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-500 py-3.5 rounded-xl items-center"
                onPress={handleAddLink}
              >
                <Text className="text-white font-bold">Đồng ý</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

