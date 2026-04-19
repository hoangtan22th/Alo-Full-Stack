import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../../contexts/SocketContext";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  ArrowLeftIcon,
  XMarkIcon,
  ChevronLeftIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { messageService, MessageDTO } from "../../services/messageService";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = width / 3;

// Hàm hỗ trợ định dạng ngày tháng an toàn, tránh lỗi crash nếu dữ liệu không hợp lệ
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "Không rõ ngày";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Ngày không lệ";
    return d.toLocaleDateString("vi-VN");
  } catch (e) {
    return "Lỗi ngày";
  }
};

export default function MediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, tab } = useLocalSearchParams();
  const initialTab = tab === "file" ? "file" : "media";

  const [activeTab, setActiveTab] = useState<"media" | "file">(initialTab);
  const [mediaList, setMediaList] = useState<MessageDTO[]>([]);
  const [fileList, setFileList] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const { messages } = await messageService.getMessageHistory(
        id as string,
        200,
        0,
        "image",
      );
      const sortedRes = [...messages].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      );
      setMediaList(sortedRes);
    } catch (error) {
      console.error("Lỗi lấy media:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const { messages } = await messageService.getMessageHistory(
        id as string,
        100,
        0,
        "file",
      );
      const sortedRes = [...messages].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      );
      setFileList(sortedRes);
    } catch (error) {
      console.error("Lỗi lấy files:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMedia();
      fetchFiles();
    }
  }, [id]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !id) return;

    const handleMessageReceived = (data: any) => {
      const newMsg = data.message ? data.message : data;
      if (newMsg.conversationId === id && !newMsg.isRevoked) {
        if (newMsg.type === "image") {
          setMediaList((prev) => {
            if (prev.find((m) => m._id === newMsg._id)) return prev;
            const updated = [newMsg, ...prev];
            return updated
              .sort((a, b) =>
                (b.createdAt || "").localeCompare(a.createdAt || ""),
              )
              .slice(0, 200);
          });
        } else if (newMsg.type === "file") {
          setFileList((prev) => {
            if (prev.find((f) => f._id === newMsg._id)) return prev;
            const updated = [newMsg, ...prev];
            return updated
              .sort((a, b) =>
                (b.createdAt || "").localeCompare(a.createdAt || ""),
              )
              .slice(0, 100);
          });
        }
      }
    };

    socket.on("message-received", handleMessageReceived);
    return () => {
      socket.off("message-received", handleMessageReceived);
    };
  }, [socket, id]);

  const renderMediaItem = ({
    item,
    index,
  }: {
    item: MessageDTO;
    index: number;
  }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH, padding: 1 }}
      onPress={() => setViewerIndex(index)}
    >
      <Image
        source={{ uri: item.content }}
        className="w-full h-full bg-gray-200"
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-2">
          Kho lưu trữ
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab("media")}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === "media" ? "border-blue-500" : "border-transparent"
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "media" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            Ảnh & Video
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("file")}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === "file" ? "border-blue-500" : "border-transparent"
          }`}
        >
          <Text
            className={`font-medium ${
              activeTab === "file" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            File
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3b82f6" />
        </View>
      ) : activeTab === "media" ? (
        <FlatList
          key="media-list"
          data={mediaList}
          keyExtractor={(item) => item._id}
          renderItem={renderMediaItem}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text className="text-gray-400">Không có ảnh hoặc video nào</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="file-list"
          data={fileList}
          keyExtractor={(item, index) =>
            item._id || `file-${index}-${item.createdAt || Math.random()}`
          }
          renderItem={({ item }) => {
            const fileName = item.metadata?.fileName || "Không tên";
            const fileType =
              item.metadata?.fileType?.split("/")[1]?.toUpperCase() || "FILE";
            const fileSize = item.metadata?.fileSize
              ? (item.metadata.fileSize / (1024 * 1024)).toFixed(1) + " MB"
              : "0 MB";
            const createdDate = formatDate(item.createdAt);

            return (
              <View className="flex-row items-center px-5 py-4 border-b border-gray-50">
                <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-[10px] font-bold text-gray-500 uppercase">
                    {fileType}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-medium text-gray-800"
                    numberOfLines={1}
                  >
                    {fileName}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5">
                    {fileSize} • {createdDate}
                  </Text>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text className="text-gray-400">Không có file nào</Text>
            </View>
          }
        />
      )}

      {/* Basic Image Viewer Modal */}
      <Modal
        visible={viewerIndex !== null}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black justify-center items-center">
          <TouchableOpacity
            className="absolute top-10 right-5 z-50 p-3"
            onPress={() => setViewerIndex(null)}
          >
            <XMarkIcon size={30} color="white" />
          </TouchableOpacity>
          {viewerIndex !== null && (
            <Image
              source={{ uri: mediaList[viewerIndex].content }}
              className="w-full h-full"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
