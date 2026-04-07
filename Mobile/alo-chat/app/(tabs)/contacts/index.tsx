import { useRouter } from "expo-router";
import React from "react";
import {
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

// --- Dữ liệu Giả lập (Mock Data) ---
const CONTACT_SECTIONS = [
  {
    title: "A",
    data: [
      {
        id: "1",
        name: "An Nguyễn",
        status: "Đang bận • 2 giờ trước",
        avatar:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200",
        isOnline: false,
      },
      {
        id: "2",
        name: "Anh Tuấn",
        status: "Học, học nữa, học mãi",
        avatar: null,
        initials: "AT",
        isOnline: false,
      },
    ],
  },
  {
    title: "B",
    data: [
      {
        id: "3",
        name: "Bảo Anh",
        status: "Đang hoạt động",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
        isOnline: true,
      },
      {
        id: "4",
        name: "Bình Minh",
        status: "Cuộc sống là những chuyến đi",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200",
        isOnline: false,
      },
    ],
  },
];

// Bảng chữ cái cho thanh cuộn bên phải
const ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
];

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          label="Lời mời kết\nbạn"
          onPress={() => router.push("/contacts/received-requests")}
        />
        <ActionItem
          icon={<PaperAirplaneIcon size={24} color="#374151" />}
          label="Lời mời đã\ngửi"
          onPress={() => router.push("/contacts/sent-requests")}
        />
        <ActionItem
          icon={<StarIcon size={24} color="#374151" />}
          label="Yêu thích"
        />
      </View>

      {/* 4. Danh sách Liên hệ & Thanh Alphabet */}
      <View className="flex-1 relative">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }} // Đệm dưới đáy tránh TabBar
        >
          {CONTACT_SECTIONS.map((section) => (
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

        {/* Thanh Alphabet cố định bên phải */}
        <View className="absolute right-2 top-1/4 items-center justify-center">
          {ALPHABET.map((letter, index) => (
            <TouchableOpacity key={index} className="py-0.5 px-2">
              <Text
                className={`text-[10px] font-bold ${
                  letter === "A" || letter === "B"
                    ? "text-black"
                    : "text-gray-300"
                }`}
              >
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
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity className="items-center w-20" onPress={onPress}>
      <View className="w-[52px] h-[52px] bg-[#f9fafb] rounded-full items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-xs text-center text-gray-600 font-medium leading-4">
        {label.replace("\\n", "\n")}
      </Text>
    </TouchableOpacity>
  );
}

// Component Từng người liên hệ
function ContactItem({ contact }: { contact: any }) {
  return (
    <TouchableOpacity className="flex-row items-center px-5 py-3">
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
