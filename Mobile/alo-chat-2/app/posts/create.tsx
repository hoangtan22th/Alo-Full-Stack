import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { postService } from "../../services/postService";

interface PickedFile {
  uri: string;
  type: string;
  fileName: string;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS_ONLY" | "PRIVATE">("PUBLIC");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  // Chọn ảnh/video từ thư viện
  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập", "Ứng dụng cần quyền truy cập thư viện ảnh để đăng tải phương tiện.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const selected: PickedFile[] = result.assets.map((asset) => {
          const uri = asset.uri;
          const fileName = asset.fileName || uri.split("/").pop() || "media.jpg";
          const type = asset.type === "video" ? "video/mp4" : "image/jpeg";
          return { uri, type, fileName };
        });

        // Giới hạn tối đa 10 file
        if (files.length + selected.length > 10) {
          Alert.alert("Giới hạn", "Bạn chỉ được đăng tối đa 10 ảnh/video.");
          const sliced = selected.slice(0, 10 - files.length);
          setFiles((prev) => [...prev, ...sliced]);
        } else {
          setFiles((prev) => [...prev, ...selected]);
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh/video:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
    }
  };

  // Xóa ảnh/video đã chọn khỏi danh sách tạm
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Thực hiện đăng bài viết
  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      Alert.alert("Nội dung trống", "Vui lòng nhập nội dung bài viết hoặc chọn ảnh/video.");
      return;
    }

    setLoading(true);
    try {
      const response = await postService.createPost(content, files, privacy);
      if (response) {
        Alert.alert("Thành công", "Bài đăng đã được tải lên nhật ký.", [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert("Thất bại", "Đăng bài không thành công. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi đăng bài viết:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra trong quá trình đăng bài.");
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyLabel = (val: string) => {
    switch (val) {
      case "PUBLIC":
        return { text: "Công khai", icon: "earth" as const };
      case "FRIENDS_ONLY":
        return { text: "Bạn bè", icon: "people" as const };
      case "PRIVATE":
        return { text: "Chỉ mình tôi", icon: "lock-closed" as const };
      default:
        return { text: "Công khai", icon: "earth" as const };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      {/* Header bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={26} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Tạo bài viết</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" className="px-2" />
        ) : (
          <TouchableOpacity onPress={handlePost} className="bg-blue-600 px-4 py-1.5 rounded-full">
            <Text className="text-white font-semibold text-sm">Đăng</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Quyền riêng tư Selector */}
        <View className="relative z-50 mb-4">
          <TouchableOpacity
            className="flex-row items-center self-start bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 gap-1.5"
            onPress={() => setShowPrivacyMenu(!showPrivacyMenu)}
          >
            <Ionicons name={getPrivacyLabel(privacy).icon} size={15} color="#4b5563" />
            <Text className="text-xs font-semibold text-gray-700">{getPrivacyLabel(privacy).text}</Text>
            <Ionicons name="chevron-down" size={12} color="#4b5563" />
          </TouchableOpacity>

          {showPrivacyMenu && (
            <View className="absolute top-10 left-0 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 w-44 z-50">
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 gap-2.5"
                onPress={() => {
                  setPrivacy("PUBLIC");
                  setShowPrivacyMenu(false);
                }}
              >
                <Ionicons name="earth" size={18} color="#4b5563" />
                <Text className="text-sm font-medium text-gray-800">Công khai</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 gap-2.5 border-t border-gray-50"
                onPress={() => {
                  setPrivacy("FRIENDS_ONLY");
                  setShowPrivacyMenu(false);
                }}
              >
                <Ionicons name="people" size={18} color="#4b5563" />
                <Text className="text-sm font-medium text-gray-800">Bạn bè</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 gap-2.5 border-t border-gray-50"
                onPress={() => {
                  setPrivacy("PRIVATE");
                  setShowPrivacyMenu(false);
                }}
              >
                <Ionicons name="lock-closed" size={18} color="#4b5563" />
                <Text className="text-sm font-medium text-gray-800">Chỉ mình tôi</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Khung soạn thảo */}
        <TextInput
          placeholder="Hôm nay bạn thế nào?"
          placeholderTextColor="#9ca3af"
          className="text-base text-gray-800 min-h-[120px] text-start"
          multiline
          style={{ textAlignVertical: "top" }}
          value={content}
          onChangeText={setContent}
        />

        {/* Lưới hình ảnh đã chọn */}
        {files.length > 0 && (
          <View className="flex-row flex-wrap gap-2.5 mt-5 pb-5">
            {files.map((file, index) => (
              <View key={index} className="w-[30%] h-24 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 relative">
                <Image source={{ uri: file.uri }} className="w-full h-full object-cover" />
                {file.type.startsWith("video/") && (
                  <View className="absolute inset-0 bg-black/20 justify-center items-center">
                    <Ionicons name="play-circle" size={24} color="white" />
                  </View>
                )}
                <TouchableOpacity
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full justify-center items-center"
                  onPress={() => handleRemoveFile(index)}
                >
                  <Ionicons name="close" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Thanh công cụ dưới đáy (Chọn Media) */}
      <View className="border-t border-gray-100 p-4 bg-white flex-row items-center gap-6">
        <TouchableOpacity onPress={handlePickMedia} className="flex-row items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-full">
          <Ionicons name="images" size={20} color="#2563eb" />
          <Text className="text-sm text-gray-700 font-semibold">Thêm ảnh/video</Text>
        </TouchableOpacity>
        <Text className="text-xs text-gray-400 font-medium">Đã chọn: {files.length}/10</Text>
      </View>
    </View>
  );
}
