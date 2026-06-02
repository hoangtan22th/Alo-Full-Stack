import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "react-native-css-interop";
import { postService } from "../../services/postService";
import { contactService } from "../../services/contactService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";

cssInterop(LinearGradient, {
  className: "style",
});


interface PickedFile {
  uri: string;
  type: string;
  fileName: string;
}

const MOOD_TEMPLATES = [
  { id: "sunset", name: "Sunset Glow", colors: ["#fb923c", "#f43f5e"] as const },
  { id: "midnight", name: "Midnight Neon", colors: ["#3b82f6", "#8b5cf6"] as const },
  { id: "cosmic", name: "Cosmic Purple", colors: ["#a855f7", "#4f46e5"] as const },
  { id: "emerald", name: "Emerald Forest", colors: ["#34d399", "#0d9488"] as const },
  { id: "rose", name: "Rose Petal", colors: ["#f472b6", "#e11d48"] as const },
  { id: "sky", name: "Blue Sky", colors: ["#22d3ee", "#2563eb"] as const },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const { emitNewPost } = useSocket();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<"FRIENDS_ONLY" | "PRIVATE">("FRIENDS_ONLY");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  // States cho Mood background
  const [selectedBg, setSelectedBg] = useState<string | null>(null);

  // States cho Tag bạn bè
  const [friends, setFriends] = useState<any[]>([]);
  const [taggedFriendIds, setTaggedFriendIds] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Load danh sách bạn bè
  useEffect(() => {
    contactService.getFriendsList()
      .then((list) => {
        const accepted = list.filter((f) => f.status === "ACCEPTED");
        setFriends(accepted);
      })
      .catch(console.error);
  }, []);

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

        // Hình nền tâm trạng không được đi kèm với ảnh
        setSelectedBg(null);

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

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Chọn hình nền tâm trạng
  const handleSelectBg = (bgId: string | null) => {
    setSelectedBg(bgId);
    if (bgId) {
      // Khi chọn hình nền thì xóa hết ảnh/video đính kèm
      setFiles([]);
      if (content.length > 150) {
        setContent(content.substring(0, 150));
      }
    }
  };

  // Thực hiện đăng bài viết
  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      Alert.alert("Nội dung trống", "Vui lòng nhập nội dung bài viết hoặc chọn ảnh/video.");
      return;
    }

    setLoading(true);
    try {
      const response = await postService.createPost(
        content,
        files,
        privacy,
        taggedFriendIds,
        selectedBg || undefined
      );

      if (response) {
        // Emit real-time event to friends
        try {
          const friendsList = await contactService.getFriendsList();
          const accepted = friendsList.filter((f: any) => f.status === "ACCEPTED");
          const friendIds = accepted.map((f: any) => 
            f.requesterId === currentUserId ? f.recipientId : f.requesterId
          );
          if (friendIds.length > 0) {
            emitNewPost(friendIds, response);
          }
        } catch (e) {
          console.warn("Lỗi emit real-time new post:", e);
        }

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
      case "FRIENDS_ONLY":
        return { text: "Bạn bè", icon: "people" as const };
      case "PRIVATE":
        return { text: "Chỉ mình tôi", icon: "lock-closed" as const };
      default:
        return { text: "Bạn bè", icon: "people" as const };
    }
  };

  const toggleFriendTag = (friendId: string) => {
    if (taggedFriendIds.includes(friendId)) {
      setTaggedFriendIds((prev) => prev.filter((id) => id !== friendId));
    } else {
      setTaggedFriendIds((prev) => [...prev, friendId]);
    }
  };

  const getFriendName = (friend: any) => {
    const isReq = friend.requesterId === currentUserId;
    return isReq ? friend.recipientName : friend.requesterName;
  };

  const getFriendAvatar = (friend: any) => {
    const isReq = friend.requesterId === currentUserId;
    const url = isReq ? friend.recipientAvatar : friend.requesterAvatar;
    if (url) {
      if (url.startsWith("http") || url.startsWith("data:")) return url;
      return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getFriendName(friend) || "U")}&background=E5E7EB&color=374151&rounded=true`;
  };

  const getFriendId = (friend: any) => {
    const isReq = friend.requesterId === currentUserId;
    return isReq ? friend.recipientId : friend.requesterId;
  };

  const currentTemplate = MOOD_TEMPLATES.find((t) => t.id === selectedBg);

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
<<<<<<< HEAD
=======
                  setPrivacy("PUBLIC");
                  setShowPrivacyMenu(false);
                }}
              >
                <Ionicons name="earth" size={18} color="#4b5563" />
                <Text className="text-sm font-medium text-gray-800">Công khai</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 gap-2.5 border-t border-gray-100"
                onPress={() => {
>>>>>>> 9d7fce55f1844981b284f708ccf11d308a3f18d2
                  setPrivacy("FRIENDS_ONLY");
                  setShowPrivacyMenu(false);
                }}
              >
                <Ionicons name="people" size={18} color="#4b5563" />
                <Text className="text-sm font-medium text-gray-800">Bạn bè</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 gap-2.5 border-t border-gray-100"
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
        {selectedBg && currentTemplate ? (
          <LinearGradient
            colors={currentTemplate.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: "100%",
              height: 320,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              position: "relative",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <TextInput
              placeholder="Nhập tâm trạng của bạn..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              className="w-full text-center text-white text-2xl font-bold leading-9 max-h-56"
              multiline
              maxLength={150}
              style={{ minHeight: 180, textAlignVertical: "center" }}
              value={content}
              onChangeText={setContent}
            />
            <Text className="absolute bottom-4 right-5 text-[10px] text-white/80 bg-black/30 px-2.5 py-0.5 rounded-full font-bold">
              {content.length}/150
            </Text>
          </LinearGradient>
        ) : (
          <View className="bg-gray-50/50 border border-gray-100 rounded-3xl p-4 min-h-[260px] shadow-sm">
            <TextInput
              placeholder="Hôm nay bạn thế nào?"
              placeholderTextColor="#9ca3af"
              className="text-base text-gray-800 text-start py-1"
              multiline
              style={{ minHeight: 220, textAlignVertical: "top" }}
              value={content}
              onChangeText={setContent}
            />
          </View>
        )}

        {/* Tagged friends list preview */}
        {taggedFriendIds.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 items-center bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 mt-4">
            <Text className="text-[11px] text-gray-400 font-semibold mr-1">Cùng với:</Text>
            {taggedFriendIds.map((id) => {
              const friend = friends.find((f) => getFriendId(f) === id);
              if (!friend) return null;
              const name = getFriendName(friend);
              return (
                <View key={id} className="flex-row items-center bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 gap-1">
                  <Text className="text-blue-600 text-[10px] font-bold">{name}</Text>
                  <TouchableOpacity onPress={() => toggleFriendTag(id)}>
                    <Ionicons name="close-circle" size={14} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

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

        {/* Chọn hình nền tâm trạng Zalo */}
        {files.length === 0 && (
          <View className="mt-6 mb-4 px-1">
            <Text className="text-xs font-semibold text-gray-500 mb-3">Chọn hình nền tâm trạng:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              <TouchableOpacity
                onPress={() => handleSelectBg(null)}
                style={{
                  width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "white",
                  borderWidth: selectedBg === null ? 2 : 1,
                  borderColor: selectedBg === null ? "#3b82f6" : "#e5e7eb",
                  transform: selectedBg === null ? [{ scale: 1.1 }] : [],
                }}
              >
                <Ionicons name="ban" size={18} color="#9ca3af" />
              </TouchableOpacity>
              {MOOD_TEMPLATES.map((template) => {
                const isSelected = selectedBg === template.id;
                return (
                  <TouchableOpacity
                    key={template.id}
                    onPress={() => handleSelectBg(template.id)}
                    activeOpacity={0.8}
                    style={{
                      width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? "#3b82f6" : "transparent",
                      backgroundColor: isSelected ? "rgba(59, 130, 246, 0.2)" : "transparent",
                      transform: isSelected ? [{ scale: 1.1 }] : [],
                    }}
                  >
                    <LinearGradient
                      colors={template.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Thanh công cụ dưới đáy (Chọn Media / Gắn thẻ bạn bè) */}
      <View className="border-t border-gray-100 p-4 bg-white flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {/* Nút đính kèm Media */}
          <TouchableOpacity
            onPress={handlePickMedia}
            className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="images" size={20} color="#2563eb" />
          </TouchableOpacity>

          {/* Nút Gắn thẻ bạn bè */}
          <TouchableOpacity
            onPress={() => setShowTagModal(true)}
            className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="person-add" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 font-medium">
          {files.length > 0 ? `Đã chọn: ${files.length}/10` : "Nhật ký Zalo"}
        </Text>
      </View>

      {/* Modal Tag bạn bè */}
      <Modal visible={showTagModal} animationType="slide" transparent={false}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowTagModal(false)} className="p-1">
              <Ionicons name="close" size={26} color="#4b5563" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Gắn thẻ bạn bè</Text>
            <TouchableOpacity
              onPress={() => setShowTagModal(false)}
              className="bg-blue-600 px-4 py-1.5 rounded-full"
            >
              <Text className="text-white font-semibold text-sm">Xong</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View className="px-4 py-2 border-b border-gray-50 flex-row items-center gap-2">
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              placeholder="Tìm kiếm bạn bè..."
              placeholderTextColor="#9ca3af"
              value={tagSearchQuery}
              onChangeText={setTagSearchQuery}
              className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2"
            />
          </View>

          {/* Friends List */}
          <FlatList
            data={friends.filter((f) => getFriendName(f).toLowerCase().includes(tagSearchQuery.toLowerCase()))}
            keyExtractor={(item) => getFriendId(item)}
            renderItem={({ item }) => {
              const fid = getFriendId(item);
              const name = getFriendName(item);
              const avatar = getFriendAvatar(item);
              const isChecked = taggedFriendIds.includes(fid);

              return (
                <TouchableOpacity
                  onPress={() => toggleFriendTag(fid)}
                  className="flex-row items-center justify-between px-5 py-3.5 border-b border-gray-50"
                >
                  <View className="flex-row items-center gap-3">
                    <Image source={{ uri: avatar }} className="w-10 h-10 rounded-full bg-gray-100" />
                    <Text className="text-sm font-semibold text-gray-800">{name}</Text>
                  </View>
                  <Ionicons
                    name={isChecked ? "checkbox" : "square-outline"}
                    size={22}
                    color={isChecked ? "#2563eb" : "#9ca3af"}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-20 px-8">
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-400 text-sm mt-3 text-center">Không tìm thấy bạn bè nào.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
