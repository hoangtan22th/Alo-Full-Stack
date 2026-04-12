import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bars3Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  QrCodeIcon,
} from "react-native-heroicons/outline";
import { UserGroupIcon } from "react-native-heroicons/outline"; // Thêm biểu tượng cho nhóm
import { useRouter } from "expo-router";
import { groupService } from "../../services/groupService";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const [activeUsers, setActiveUsers] = useState(activeUsersData);
  const [conversations, setConversations] = useState<any[]>(conversationsData);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await groupService.getMyGroups("all");

        let groups = response;
        if (response?.data?.data) {
          groups = response.data.data;
        } else if (response?.data) {
          groups = response.data;
        }

        if (Array.isArray(groups)) {
          // Xử lý song song lấy thông tin người dùng cho chat 1-1
          const formattedGroups = await Promise.all(
            groups.map(async (g: any) => {
              const date = new Date(g.updatedAt);
              const timeString = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              let chatName = g.name;
              let chatAvatar = g.groupAvatar;

              // Nếu là chat 1-1, tìm user còn lại
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
                    console.log("Không lấy được info user", err);
                  }
                }
              }

              return {
                id: g._id,
                targetUserId:
                  !g.isGroup && currentUserId && g.members
                    ? g.members.find((m: any) => m.userId !== currentUserId)
                        ?.userId
                    : undefined,
                name: chatName,
                avatar: chatAvatar,
                isGroup: g.isGroup,
                membersCount: g.members?.length,
                message: "Chưa có tin nhắn",
                time: timeString,
                unread: false,
              };
            }),
          );

          // Gộp dữ liệu lấy được hoặc ghi đè, ghi đè toàn bộ groups lên thôi
          setConversations(formattedGroups);
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách nhóm:", error);
      }
    };

    fetchGroups();
  }, [currentUserId]);

  return (
    <View
      style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top + 10 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-6 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity>
            <Bars3Icon size={28} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold ml-4">Messages</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push("/scan-qr" as any)}>
            <QrCodeIcon size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPlusMenu(true)}>
            <PlusIcon size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Plus Menu Modal */}
      <Modal visible={showPlusMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPlusMenu(false)}>
          <View className="flex-1 bg-black/20" />
        </TouchableWithoutFeedback>
        <View className="absolute top-24 right-4 bg-white rounded-lg shadow-lg py-2 min-w-[220px] elevation-5">
          <TouchableOpacity
            className="px-4 py-3 border-b border-gray-100"
            onPress={() => {
              setShowPlusMenu(false);
              router.push("/(tabs)/contacts/add-friend" as any);
            }}
          >
            <Text className="text-base text-gray-800">Thêm bạn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-3 border-b border-gray-100"
            onPress={() => {
              setShowPlusMenu(false);
              router.push("/(tabs)/contacts" as any);
            }}
          >
            <Text className="text-base text-gray-800">Tạo đoạn chat mới</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-3 border-b border-gray-100"
            onPress={() => {
              setShowPlusMenu(false);
              router.push("/(tabs)/groups/create-group" as any);
            }}
          >
            <Text className="text-base text-gray-800">Tạo nhóm chat mới</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-4 py-3"
            onPress={() => {
              setShowPlusMenu(false);
              router.push("/(tabs)/profile/account-security" as any);
            }}
          >
            <Text className="text-base text-gray-800">
              Quản lý thiết bị đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search Bar */}
      <View className="px-4 mb-6">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search conversations"
            className="flex-1 ml-2 text-base text-gray-800"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Active Now Section */}
        {/* <View className="px-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">
              Đang hoạt động
            </Text>
            <TouchableOpacity>
              <Text className="text-sm text-gray-500">See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeUsers.map((user) => (
              <View key={user.id} className="items-center mr-6">
                <View className="relative">
                  <Image
                    source={{ uri: user.avatar }}
                    className="w-16 h-16 rounded-full"
                  />
                  <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </View>
                <Text className="text-sm text-gray-800 font-medium mt-1">
                  {user.name}
                </Text>
              </View>
            ))}
            
            <View className="items-center">
              <TouchableOpacity className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center">
                <EllipsisHorizontalIcon size={24} color="#9ca3af" />
              </TouchableOpacity>
              <Text className="text-sm text-gray-500 mt-1">More</Text>
            </View>
          </ScrollView>
        </View> */}

        {/* Conversations List */}
        <View className="px-4 pb-32">
          {conversations.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              className="flex-row items-center mb-6"
              onPress={() =>
                router.push({
                  pathname: `/chat/${chat.id}` as any,
                  params: {
                    name: chat.name,
                    avatar: chat.avatar,
                    membersCount: chat.membersCount,
                    isGroup: chat.isGroup ? "true" : "false",
                    targetUserId: chat.targetUserId,
                  },
                })
              }
            >
              <View className="relative">
                {chat.avatar ? (
                  <Image
                    source={{ uri: chat.avatar }}
                    className="w-14 h-14 rounded-full"
                  />
                ) : chat.isGroup ? (
                  // Avatar icon nhóm dành riêng cho Group
                  <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center">
                    <UserGroupIcon size={24} color="#6b7280" />
                  </View>
                ) : (
                  <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center">
                    <Text className="text-gray-500 font-bold text-lg">
                      {chat.name.charAt(0)}
                    </Text>
                  </View>
                )}
                {chat.unread && (
                  <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black border-2 border-white rounded-full" />
                )}
              </View>

              <View className="flex-1 ml-4 justify-center">
                <View className="flex-row justify-between items-center mb-1">
                  <Text
                    className={`text-base text-gray-900 ${chat.unread ? "font-bold" : "font-semibold"}`}
                  >
                    {chat.name}
                  </Text>
                  <Text
                    className={`text-xs ${chat.unread ? "text-black font-bold uppercase" : "text-gray-500 uppercase"}`}
                  >
                    {chat.time}
                  </Text>
                </View>
                <Text
                  className={`text-sm ${chat.unread ? "text-black" : "text-gray-500"}`}
                  numberOfLines={1}
                >
                  {chat.message}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Bổ sung Data mẫu
const activeUsersData = [
  { id: "1", name: "Alex", avatar: "https://i.pravatar.cc/150?img=11" },
  { id: "2", name: "Jordan", avatar: "https://i.pravatar.cc/150?img=47" },
  { id: "3", name: "Casey", avatar: "https://i.pravatar.cc/150?img=44" },
];

const conversationsData = [
  {
    id: "1",
    name: "Julian Pierce",
    avatar: "https://i.pravatar.cc/150?img=68",
    message: "The architectural proposal is ready for re...",
    time: "12:45 PM",
    unread: false,
  },
  {
    id: "2",
    name: "Marcus Chen",
    avatar: "https://i.pravatar.cc/150?img=61",
    message: "Can we reschedule the sync to 4 PM?",
    time: "JUST NOW",
    unread: true,
  },
  {
    id: "3",
    name: "Design System Core",
    isGroup: true,
    message: "Sarah updated the color tokens.",
    time: "YESTERDAY",
    unread: false,
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    avatar: "https://i.pravatar.cc/150?img=49",
    message: "I sent over the revised contracts this mo...",
    time: "WED",
    unread: false,
  },
  {
    id: "5",
    name: "Clara Oswald",
    avatar: "https://i.pravatar.cc/150?img=60",
    message: "Let's grab a coffee soon and catch up!",
    time: "MON",
    unread: false,
  },
];
