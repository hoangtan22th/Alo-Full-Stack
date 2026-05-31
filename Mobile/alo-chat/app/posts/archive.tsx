import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { postService, IStory } from "../../services/postService";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = width / 3 - 10;

export default function StoryArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [archivedStories, setArchivedStories] = useState<IStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchArchivedStories = async () => {
    try {
      const data = await postService.getArchivedStories();
      setArchivedStories(data);
    } catch (error) {
      console.error("Lỗi khi tải Story lưu trữ:", error);
      Alert.alert("Lỗi", "Không thể tải kho lưu trữ story.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedStories();
  }, []);

  const handleRepost = (storyId: string) => {
    Alert.alert("Đăng lại Story", "Bạn có muốn đăng lại story này lên nhật ký hiện tại không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng lại",
        onPress: async () => {
          setRepostingId(storyId);
          try {
            const success = await postService.repostStory(storyId);
            if (success) {
              Alert.alert("Thành công", "Story đã được đăng lại thành công!", [
                {
                  text: "OK",
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } else {
              Alert.alert("Thất bại", "Không thể đăng lại story.");
            }
          } catch (err) {
            console.error(err);
            Alert.alert("Lỗi", "Có lỗi xảy ra trong quá trình đăng lại.");
          } finally {
            setRepostingId(null);
          }
        },
      },
    ]);
  };

  const handleDeleteStory = (storyId: string) => {
    Alert.alert(
      "Xóa vĩnh viễn Story",
      "Story này sẽ bị xóa hoàn toàn khỏi kho lưu trữ và không thể khôi phục. Bạn có chắc chắn muốn xóa?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa vĩnh viễn",
          style: "destructive",
          onPress: async () => {
            setDeletingId(storyId);
            try {
              const success = await postService.deleteStoryPermanently(storyId);
              if (success) {
                setArchivedStories((prev) => prev.filter((s) => s._id !== storyId));
                Alert.alert("Thành công", "Story đã được xóa vĩnh viễn.");
              } else {
                Alert.alert("Thất bại", "Không thể xóa story.");
              }
            } catch (err) {
              console.error(err);
              Alert.alert("Lỗi", "Có lỗi xảy ra trong quá trình xóa.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-400 text-sm">Đang tải kho lưu trữ...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Kho lưu trữ Story</Text>
        <View className="w-8" />
      </View>

      <FlatList
        data={archivedStories}
        keyExtractor={(item) => item._id}
        numColumns={3}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingTop: 16,
          paddingBottom: 50,
        }}
        renderItem={({ item }) => (
          <View
            style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5 }}
            className="m-1 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 relative group"
          >
            <Image source={{ uri: item.mediaUrl }} className="w-full h-full object-cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              className="absolute inset-0 justify-end p-2.5"
            >
              <Text className="text-[10px] text-white font-bold">{formatDate(item.createdAt)}</Text>
              {item.caption ? (
                <Text className="text-[9px] text-white/80 truncate mt-0.5">{item.caption}</Text>
              ) : null}
            </LinearGradient>

            {/* Nút đăng lại & Xóa vĩnh viễn */}
            {deletingId === item._id || repostingId === item._id ? (
              <View className="absolute top-2 right-2 bg-black/60 w-7 h-7 rounded-full items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleDeleteStory(item._id)}
                  className="absolute top-2 right-11 bg-red-600/90 w-7 h-7 rounded-full items-center justify-center shadow"
                >
                  <Ionicons name="trash-outline" size={14} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRepost(item._id)}
                  className="absolute top-2 right-2 bg-blue-600/90 w-7 h-7 rounded-full items-center justify-center shadow"
                >
                  <Ionicons name="repeat" size={14} color="white" />
                </TouchableOpacity>
              </>
            )}

            {/* Icon Video */}
            {item.mediaType === "VIDEO" && (
              <View className="absolute top-2 left-2 bg-black/50 px-1.5 py-0.5 rounded flex-row items-center gap-0.5">
                <Ionicons name="videocam" size={10} color="white" />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-32 px-10">
            <Ionicons name="archive-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3 text-center">Kho lưu trữ trống.</Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">Các story của bạn sẽ được lưu trữ tự động sau 24h.</Text>
          </View>
        }
      />
    </View>
  );
}
