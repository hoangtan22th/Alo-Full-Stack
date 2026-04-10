import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  StarIcon,
  UserIcon,
  UserPlusIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { contactService } from "../../../services/contactService";

import api from "../../../services/api";

// Helper lấy chữ cái đầu của tên (ví dụ: "Nguyễn Văn A" -> "A")
function getFirstLetter(name: string) {
  if (!name) return "#";
  const words = name.trim().split(" ");
  const lastName = words[words.length - 1]; // Lấy tên cuối
  const char = lastName.charAt(0).toUpperCase();
  // Loại bỏ dấu tiếng Việt (nếu cần xử lý phức tạp có thể dùng regex bẻ dấu)
  const normalized = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /[A-Z]/.test(normalized) ? normalized : "#";
}

// Helper lấy 2 chữ cái đầu cho avatar trống (ví dụ: "Nguyễn Văn A" -> "NA")
function getInitials(name: string) {
  if (!name) return "?";
  const words = name.trim().split(" ");
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

interface ContactSection {
  title: string;
  data: any[];
}

import { useAuth } from "../../../contexts/AuthContext";

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [contactSections, setContactSections] = useState<ContactSection[]>([]);
  const [alphabet, setAlphabet] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, []),
  );

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const myId = user?.id || user?._id;

      const [friends, pendingRequests] = await Promise.all([
        contactService.getFriendsList(),
        contactService.getPendingRequests(),
      ]);

      setPendingCount(pendingRequests?.length || 0);

      // Nhóm theo chữ cái đầu
      const groups: Record<string, any[]> = {};
      friends.forEach((friend) => {
        const isMeRequester = friend.requesterId === myId;

        const friendId = isMeRequester
          ? friend.recipientId
          : friend.requesterId;
        const name = isMeRequester
          ? friend.recipientName
          : friend.requesterName;
        const avatar = isMeRequester
          ? friend.recipientAvatar
          : friend.requesterAvatar;

        const finalName = name || "Unknown";

        const letter = getFirstLetter(finalName);

        if (!groups[letter]) {
          groups[letter] = [];
        }

        groups[letter].push({
          id: friend.id,
          userId: friendId, // ID chính xác của người bạn
          name: finalName,
          status: friend.greetingMessage || "Offline", // Tạm dùng greeting message
          avatar: avatar,
          initials: getInitials(finalName),
          isOnline: false, // Dữ liệu thật sẽ cần socket/status API
        });
      });

      // Sắp xếp các nhóm theo bảng chữ cái
      const sortedKeys = Object.keys(groups).sort();
      const sections = sortedKeys.map((key) => ({
        title: key,
        data: groups[key].sort((a, b) => a.name.localeCompare(b.name)),
      }));

      setContactSections(sections);
      setAlphabet(sortedKeys);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      {/* 1. Header */}
      <View className="flex-row items-center px-5 py-3 bg-white">
        <TouchableOpacity>
          <Bars3Icon size={28} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 ml-4">Danh bạ</Text>
      </View>

      {/* 2. Thanh tìm kiếm */}
      <View className="px-5 mt-2">
        <View className="flex-row items-center bg-[#f9fafb] rounded-2xl px-4 py-3">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm liên hệ..."
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-3 text-base text-gray-800"
          />
        </View>
      </View>

      {/* 3. Các nút hành động (Thêm bạn, Lời mời...) */}
      <View className="flex-row justify-between px-6 py-8 border-b border-gray-50">
        <ActionItem
          icon={<UserPlusIcon size={24} color="#374151" />}
          label="Thêm bạn mới"
          onPress={() => router.push("/contacts/add-friend")}
        />
        <ActionItem
          icon={<UserIcon size={24} color="#374151" />}
          label={"Lời mời kết\\nbạn"}
          onPress={() => router.push("/contacts/received-requests")}
          badgeCount={pendingCount}
        />
        <ActionItem
          icon={<PaperAirplaneIcon size={24} color="#374151" />}
          label={"Lời mời đã\\ngửi"}
          onPress={() => router.push("/contacts/sent-requests")}
        />
        <ActionItem
          icon={<StarIcon size={24} color="#374151" />}
          label="Yêu thích"
        />
      </View>

      {/* 4. Danh sách Liên hệ & Thanh Alphabet */}
      <View className="flex-1 relative">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#000" />
            <Text className="mt-2 text-gray-500">Đang tải danh bạ...</Text>
          </View>
        ) : contactSections.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg">Chưa có bạn bè nào</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120 }} // Đệm dưới đáy tránh TabBar
          >
            {contactSections.map((section) => (
              <View key={section.title} className="mb-2">
                {/* Tiêu đề Chữ cái */}
                <Text className="text-xs font-bold text-gray-400 px-5 py-3">
                  {section.title}
                </Text>

                {/* Danh sách người trong chữ cái đó */}
                {section.data.map((contact) => (
                  <ContactItem key={contact.id} contact={contact} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Thanh Alphabet cố định bên phải */}
        <View className="absolute right-2 top-1/4 items-center justify-center">
          {alphabet.map((letter, index) => (
            <TouchableOpacity key={index} className="py-0.5 px-2">
              <Text className={`text-[10px] font-bold text-gray-400`}>
                {letter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// --- Các Component Phụ ---

// Component Nút hành động tròn
function ActionItem({
  icon,
  label,
  onPress,
  badgeCount,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  badgeCount?: number;
}) {
  return (
    <TouchableOpacity className="items-center w-20" onPress={onPress}>
      <View className="relative">
        <View className="w-[52px] h-[52px] bg-[#f9fafb] rounded-full items-center justify-center mb-2">
          {icon}
        </View>
        {badgeCount !== undefined && badgeCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-[20px] items-center justify-center px-1 border-[1.5px] border-white">
            <Text className="text-white text-[10px] font-bold">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-center text-gray-600 font-medium leading-4">
        {label.replace("\\n", "\n")}
      </Text>
    </TouchableOpacity>
  );
}

// Component Từng người liên hệ
function ContactItem({ contact }: { contact: any }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3"
      onPress={() => {
        router.push({
          pathname: "/contacts/send-request",
          params: {
            userId: contact.userId,
            fullName: contact.name,
            phone: "Số điện thoại bị ẩn", // Theo đề bài, thông tin chưa có hoặc muốn lấy full API thì có thể fetch tiếp ở màn kia
            avatarUrl: contact.avatar,
            relationStatus: "ACCEPTED",
            requestId: contact.id,
          },
        });
      }}
    >
      {/* Avatar */}
      {contact.avatar ? (
        <Image
          source={{ uri: contact.avatar }}
          className="w-[52px] h-[52px] rounded-full"
        />
      ) : (
        <View className="w-[52px] h-[52px] rounded-full bg-[#111827] items-center justify-center">
          <Text className="text-white font-bold text-lg tracking-widest">
            {contact.initials}
          </Text>
        </View>
      )}

      {/* Thông tin */}
      <View className="ml-4 flex-1 justify-center">
        <Text className="text-base font-bold text-gray-900 mb-0.5">
          {contact.name}
        </Text>
        <View className="flex-row items-center">
          {/* Dấu chấm xanh nếu đang online */}
          {contact.isOnline && (
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
          )}
          <Text className="text-[13px] text-gray-500" numberOfLines={1}>
            {contact.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
