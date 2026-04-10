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
  XCircleIcon,
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
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [phoneSearchResult, setPhoneSearchResult] = useState<any>(null);

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

      const parsedFriends: any[] = [];

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

        parsedFriends.push({
          id: friend.id,
          userId: friendId,
          name: finalName,
          status: friend.greetingMessage || "Offline",
          avatar: avatar,
          initials: getInitials(finalName),
          isOnline: false,
        });
      });

      setAllFriends(parsedFriends);
      updateSections(parsedFriends);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateSections = (list: any[]) => {
    const groups: Record<string, any[]> = {};
    list.forEach((contact) => {
      const letter = getFirstLetter(contact.name);
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(contact);
    });

    const sortedKeys = Object.keys(groups).sort();
    const sections = sortedKeys.map((key) => ({
      title: key,
      data: groups[key].sort((a, b) => a.name.localeCompare(b.name)),
    }));

    setContactSections(sections);
    setAlphabet(sortedKeys);
  };

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setIsSearchingPhone(false);
      setPhoneSearchResult(null);
      updateSections(allFriends);
      return;
    }

    const isPhone = /^[\d\s]+$/.test(text);

    if (!isPhone) {
      // Tìm theo tên local
      setIsSearchingPhone(false);
      setPhoneSearchResult(null);
      const lowerText = text.toLowerCase();
      const filtered = allFriends.filter((f) =>
        f.name.toLowerCase().includes(lowerText),
      );
      updateSections(filtered);
    } else {
      // Đang tìm theo sđt
      setIsSearchingPhone(true);
      const cleanPhone = text.replace(/\s+/g, "");

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await contactService.searchUserByPhone(cleanPhone);
          if (res) {
            const isFriendLocal = allFriends.find(
              (f) => f.userId === res.userId,
            );
            const mappedUser = {
              ...res,
              isFriendLocal: !!isFriendLocal,
            };
            setPhoneSearchResult(mappedUser);
          } else {
            setPhoneSearchResult(null);
          }
        } catch (e) {
          console.error(e);
          setPhoneSearchResult(null);
        }
      }, 500);
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
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <XCircleIcon size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
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
        ) : isSearchingPhone ? (
          <View className="flex-1 pt-4">
            {phoneSearchResult ? (
              <TouchableOpacity
                className="flex-row items-center px-5 py-3"
                onPress={() => {
                  if (phoneSearchResult.isFriendLocal) {
                    router.push({
                      pathname: "/chat/[id]",
                      params: {
                        id: phoneSearchResult.userId,
                        name: phoneSearchResult.fullName,
                        avatar: phoneSearchResult.avatarUrl || "",
                      },
                    });
                  } else {
                    router.push({
                      pathname: "/contacts/send-request",
                      params: {
                        userId: phoneSearchResult.userId,
                        fullName: phoneSearchResult.fullName,
                        phone: phoneSearchResult.phone || "Số điện thoại bị ẩn",
                        avatarUrl: phoneSearchResult.avatarUrl,
                        relationStatus: "NOT_FRIEND",
                        requestId: "",
                      },
                    });
                  }
                }}
              >
                {phoneSearchResult.avatarUrl ? (
                  <Image
                    source={{ uri: phoneSearchResult.avatarUrl }}
                    className="w-[52px] h-[52px] rounded-full"
                  />
                ) : (
                  <View className="w-[52px] h-[52px] rounded-full bg-[#111827] items-center justify-center">
                    <Text className="text-white font-bold text-lg tracking-widest">
                      {getInitials(phoneSearchResult.fullName)}
                    </Text>
                  </View>
                )}

                <View className="ml-4 flex-1 justify-center">
                  <Text className="text-base font-bold text-gray-900 mb-0.5">
                    {phoneSearchResult.fullName}
                  </Text>
                  <Text className="text-[13px] text-gray-500" numberOfLines={1}>
                    {phoneSearchResult.isFriendLocal
                      ? "Đã kết bạn"
                      : "Chưa kết bạn"}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View className="items-center mt-10">
                <Text className="text-gray-500">
                  Đang tìm kiếm / Không tìm thấy số điện thoại
                </Text>
              </View>
            )}
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
          pathname: "/chat/[id]",
          params: {
            id: contact.userId,
            name: contact.name,
            avatar: contact.avatar || "",
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
