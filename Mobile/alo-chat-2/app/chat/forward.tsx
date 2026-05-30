import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../contexts/AuthContext";

export default function ForwardScreen() {
  const { content, type, metadata, messages } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  const fetchConversations = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const response = await groupService.getMyGroups("all");
      let groups = response;
      if (response?.data?.data) {
        groups = response.data.data;
      } else if (response?.data) {
        groups = response.data;
      }

      if (Array.isArray(groups)) {
        const formattedGroups = await Promise.all(
          groups.map(async (g: any) => {
            let chatName = g.name;
            let chatAvatar = g.groupAvatar;

            if (!g.isGroup && currentUserId && g.members) {
              const otherMember = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (otherMember) {
                try {
                  const userRes = await userService.getUserById(
                    otherMember.userId,
                  );
                  const otherUser =
                    userRes && (userRes as any).data
                      ? (userRes as any).data
                      : userRes;
                  if (otherUser) {
                    chatName =
                      otherUser.fullName ||
                      otherUser.username ||
                      otherUser.name ||
                      "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch (err) {
                  // Ignore
                }
              }
            }

            return {
              id: g._id,
              name: chatName || "Cuộc trò chuyện",
              avatar: chatAvatar,
              isGroup: g.isGroup,
            };
          }),
        );
        setConversations(formattedGroups);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cuộc hội thoại:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setIsSending(true);

    try {
      const currentUserName =
        user?.fullName || user?.displayName || "Người dùng";
      let msgsToForward: any[] = [];

      if (messages) {
        try {
          msgsToForward = JSON.parse(messages as string);
        } catch (e) {
          console.error("Lỗi parse list messages:", e);
        }
      } else {
        const parsedMetadata = metadata ? JSON.parse(metadata as string) : {};
        msgsToForward = [
          {
            type: type || "text",
            content: content,
            metadata: parsedMetadata,
          },
        ];
      }

      const forwardPromises = Array.from(selectedIds).flatMap((convoId) =>
        msgsToForward.map((msg) =>
          messageService.sendMessage({
            conversationId: convoId,
            type: msg.type || "text",
            content: msg.content,
            senderName: currentUserName,
            metadata: msg.metadata || {},
          }),
        ),
      );

      await Promise.all(forwardPromises);

      Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn thành công.", [
        {
          text: "OK",
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]);
    } catch (err) {
      console.error("Lỗi chuyển tiếp tin nhắn:", err);
      Alert.alert("Thất bại", "Đã xảy ra lỗi khi chuyển tiếp tin nhắn.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderMessagePreview = () => {
    let previewText = "";
    if (messages) {
      try {
        const msgs = JSON.parse(messages as string);
        previewText = `[${msgs.length} tin nhắn]`;
      } catch (e) {
        previewText = "[Nhiều tin nhắn]";
      }
    } else {
      if (type === "text") previewText = content as string;
      else if (type === "image") previewText = "[Hình ảnh]";
      else if (type === "file") {
        try {
          const meta = metadata ? JSON.parse(metadata as string) : null;
          previewText = `[Tệp tin] ${meta?.fileName || ""}`;
        } catch (e) {
          previewText = "[Tệp tin]";
        }
      } else previewText = "[Tin nhắn]";
    }

    return (
      <View className="mx-4 my-3 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r-lg">
        <Text className="text-xs text-gray-400 font-medium mb-1">
          Tin nhắn chuyển tiếp
        </Text>
        <Text className="text-sm text-gray-600 font-semibold" numberOfLines={1}>
          {previewText}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          backgroundColor: "white",
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <XMarkIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "700",
            color: "#111827",
          }}
        >
          Chuyển tiếp đến...
        </Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={selectedIds.size === 0 || isSending}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor:
              selectedIds.size === 0 || isSending ? "#93c5fd" : "#3b82f6",
            borderRadius: 20,
          }}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "700" }}>
              Gửi {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Message Preview */}
      {renderMessagePreview()}

      {/* Search Bar */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm..."
            className="flex-1 ml-2 text-gray-800 h-10"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="px-2"
            >
              <XMarkIcon size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversation List */}
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-gray-400">
              Đang tải cuộc trò chuyện...
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="px-4 pb-20">
              {filteredConversations.map((chat) => {
                const isSelected = selectedIds.has(chat.id);
                return (
                  <Pressable
                    key={chat.id}
                    onPress={() => toggleSelect(chat.id)}
                    className={`flex-row items-center justify-between p-3 rounded-2xl mb-2 ${
                      isSelected ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      {chat.avatar ? (
                        <Image
                          source={{ uri: chat.avatar }}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                          {chat.isGroup ? (
                            <UserGroupIcon size={22} color="#6b7280" />
                          ) : (
                            <Text className="text-gray-500 font-bold text-base">
                              {chat.name?.charAt(0)}
                            </Text>
                          )}
                        </View>
                      )}
                      <Text
                        className="text-base font-semibold text-gray-800 ml-3 flex-1"
                        numberOfLines={1}
                      >
                        {chat.name}
                      </Text>
                    </View>

                    {/* Checkbox */}
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <CheckIcon size={14} color="white" strokeWidth={3} />
                      )}
                    </View>
                  </Pressable>
                );
              })}

              {filteredConversations.length === 0 && (
                <View className="items-center py-20">
                  <Text className="text-gray-400">
                    Không tìm thấy cuộc trò chuyện nào
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
